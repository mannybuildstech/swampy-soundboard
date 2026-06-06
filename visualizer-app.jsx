const { useEffect, useMemo, useRef, useState } = React;

const CATEGORY_ORDER = ['scenes', 'characters', 'emotions-melodies', 'actions'];
const CATEGORY_LABELS = {
  scenes: 'Scenes',
  characters: 'Characters',
  'emotions-melodies': 'Emotions-Melodies',
  actions: 'Actions',
};
const SCENE_COLORS = ['#144552', '#1d5f73', '#2f4f6f', '#0f766e', '#1f6f8b', '#3f4e4f'];

function fileToLabel(fileName) {
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
}

function randomWaveColor() {
  const colors = ['#22d3ee', '#a78bfa', '#f97316', '#facc15', '#34d399', '#fb7185', '#60a5fa'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function buildSections(manifest) {
  return CATEGORY_ORDER.reduce((acc, category) => {
    const folder = category;
    const files = manifest?.[category] || [];
    acc[category] = files.map((fileName) => ({
      id: `${category}-${fileName}`,
      category,
      fileName,
      label: fileToLabel(fileName),
      src: `./audio-assets/${folder}/${fileName}`,
    }));
    return acc;
  }, {});
}

function SwampyVisualizerLab() {
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState('');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [activeSceneId, setActiveSceneId] = useState(null);
  const [activeOneShotId, setActiveOneShotId] = useState(null);
  const [sceneFill, setSceneFill] = useState('#173e4c');

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const frameRef = useRef(0);
  const activeSceneSoundRef = useRef(null);
  const activeSoundNodesRef = useRef(new Map());
  const nextNodeIdRef = useRef(1);
  const pointerStartRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('./audio-assets/manifest.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Unable to load manifest (${response.status})`);
        }
        const data = await response.json();
        setManifest(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load audio assets');
      }
    };

    load();
  }, []);

  const sections = useMemo(() => buildSections(manifest), [manifest]);
  const activeCategory = CATEGORY_ORDER[activeCategoryIndex];
  const activeButtons = sections?.[activeCategory] || [];

  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const animate = () => {
      drawFrame();
      frameRef.current = window.requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopScene();
      activeSoundNodesRef.current.forEach((entry) => {
        entry.audio.pause();
        entry.audio.currentTime = 0;
      });
      activeSoundNodesRef.current.clear();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  function ensureAudioContext() {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }

  function allocateRow() {
    const canvas = canvasRef.current;
    if (!canvas) return 0;

    const rect = canvas.getBoundingClientRect();
    const rowHeight = 54;
    const maxRows = Math.max(1, Math.floor(rect.height / rowHeight));
    const used = new Set();
    activeSoundNodesRef.current.forEach((entry) => {
      if (typeof entry.rowIndex === 'number' && entry.rowIndex >= 0) {
        used.add(entry.rowIndex);
      }
    });

    for (let i = 0; i < maxRows; i += 1) {
      if (!used.has(i)) {
        return i;
      }
    }

    return maxRows - 1;
  }

  function stopScene() {
    const scene = activeSceneSoundRef.current;
    if (!scene) return;
    scene.audio.pause();
    scene.audio.currentTime = 0;
    if (scene.source) {
      scene.source.disconnect();
    }
    if (scene.analyser) {
      scene.analyser.disconnect();
    }
    activeSceneSoundRef.current = null;
  }

  function registerSoundNode(sound, options) {
    const audioCtx = ensureAudioContext();
    const audio = new Audio(sound.src);
    audio.loop = Boolean(options.loop);
    audio.currentTime = 0;

    const source = audioCtx.createMediaElementSource(audio);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const node = {
      id: sound.id,
      soundId: sound.id,
      instanceId: options.instanceId,
      category: sound.category,
      label: sound.label,
      audio,
      source,
      analyser,
      timeDataArray: new Uint8Array(analyser.fftSize),
      startedAt: performance.now(),
      waveColor: options.waveColor || randomWaveColor(),
      rowIndex: typeof options.rowIndex === 'number' ? options.rowIndex : 0,
      stopAt: options.stopAt || null,
    };

    return node;
  }

  function removeNode(id) {
    const node = activeSoundNodesRef.current.get(id);
    if (!node) return;
    node.audio.pause();
    node.audio.currentTime = 0;
    node.source.disconnect();
    node.analyser.disconnect();
    activeSoundNodesRef.current.delete(id);
    setActiveOneShotId((prev) => (prev === node.soundId ? null : prev));
  }

  function playScene(sound) {
    stopScene();

    const node = registerSoundNode(sound, { loop: true });
    node.audio.play().catch(() => {});

    activeSceneSoundRef.current = node;
    setActiveSceneId(sound.id);

    const nextColor = SCENE_COLORS[Math.floor(Math.random() * SCENE_COLORS.length)];
    setSceneFill(nextColor);
  }

  function playOneShot(sound) {
    const instanceId = `${sound.id}-${Date.now()}-${nextNodeIdRef.current}`;
    nextNodeIdRef.current += 1;

    const rowIndex = allocateRow();
    const node = registerSoundNode(sound, {
      instanceId,
      loop: false,
      rowIndex,
      stopAt: performance.now() + 5000,
    });

    activeSoundNodesRef.current.set(instanceId, node);
    node.audio.addEventListener('ended', () => {
      removeNode(instanceId);
    });

    node.audio.play().catch(() => {});
    setActiveOneShotId(sound.id);
    window.setTimeout(() => setActiveOneShotId((prev) => (prev === sound.id ? null : prev)), 500);

    window.setTimeout(() => {
      removeNode(instanceId);
    }, 5000);
  }

  function applyEmotionColorShift() {
    activeSoundNodesRef.current.forEach((node) => {
      node.waveColor = randomWaveColor();
    });
  }

  function handleSoundTap(sound) {
    if (sound.category === 'scenes') {
      playScene(sound);
      return;
    }

    if (sound.category === 'emotions-melodies') {
      applyEmotionColorShift();
      playOneShot(sound);
      return;
    }

    playOneShot(sound);
  }

  function nextCategory() {
    setActiveCategoryIndex((idx) => (idx + 1) % CATEGORY_ORDER.length);
  }

  function prevCategory() {
    setActiveCategoryIndex((idx) => (idx - 1 + CATEGORY_ORDER.length) % CATEGORY_ORDER.length);
  }

  function onTouchStart(e) {
    const touch = e.touches?.[0];
    if (!touch) return;
    pointerStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e) {
    const start = pointerStartRef.current;
    if (!start) return;
    const touch = e.changedTouches?.[0];
    pointerStartRef.current = null;
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);
    if (Math.abs(dx) > 40 && dy < 60) {
      if (dx < 0) nextCategory();
      else prevCategory();
    }
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = sceneFill;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const now = performance.now();
    const toRemove = [];
    const graphNodes = [];

    activeSoundNodesRef.current.forEach((node, key) => {
      if (node.stopAt && now >= node.stopAt) {
        toRemove.push(key);
        return;
      }

      if (
        node.category !== 'characters' &&
        node.category !== 'actions' &&
        node.category !== 'emotions-melodies'
      ) {
        return;
      }

      graphNodes.push(node);
    });

    graphNodes.sort((a, b) => a.rowIndex - b.rowIndex);

    const rowHeight = 54;
    const rowGap = 8;
    const leftPanel = 140;
    const graphStartX = leftPanel + 8;
    const graphWidth = Math.max(20, rect.width - graphStartX - 10);

    graphNodes.forEach((node) => {
      const rowTop = 10 + node.rowIndex * (rowHeight + rowGap);
      if (rowTop > rect.height - rowHeight) {
        return;
      }

      const rowCenterY = rowTop + rowHeight / 2;

      node.analyser.getByteTimeDomainData(node.timeDataArray);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(6, rowTop, rect.width - 12, rowHeight);

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(24, rowCenterY, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px ui-sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(shortLabel(node.label), 44, rowCenterY + 3);

      ctx.beginPath();
      ctx.strokeStyle = colorWithAlpha(node.waveColor, 0.24);
      ctx.lineWidth = 1;
      ctx.moveTo(graphStartX, rowCenterY);
      ctx.lineTo(graphStartX + graphWidth, rowCenterY);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = colorWithAlpha(node.waveColor, 0.95);

      const samples = node.timeDataArray;
      for (let i = 0; i < samples.length; i += 1) {
        const normalized = (samples[i] - 128) / 128;
        const x = graphStartX + (i / (samples.length - 1)) * graphWidth;
        const y = rowCenterY + normalized * (rowHeight * 0.36);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    toRemove.forEach((key) => removeNode(key));
  }

  function shortLabel(label) {
    const compact = label.trim();
    return compact.length > 12 ? `${compact.slice(0, 12)}.` : compact;
  }

  function colorWithAlpha(hex, alpha) {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative h-[75vh] w-full border-b border-white/20">
        <canvas ref={canvasRef} className="h-full w-full" />
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-bold">
          Scene: {activeSceneId ? fileToLabel(activeSceneId.replace('scenes-', '')) : 'none'}
        </div>
      </section>

      <section
        className="h-[25vh] w-full bg-slate-900 p-3"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <button type="button" onClick={prevCategory} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold">
            Prev
          </button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Swipe left/right</p>
            <h2 className="text-lg font-black">{CATEGORY_LABELS[activeCategory]}</h2>
          </div>
          <button type="button" onClick={nextCategory} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold">
            Next
          </button>
        </div>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {activeButtons.map((sound) => {
            const isSceneActive = sound.category === 'scenes' && activeSceneId === sound.id;
            const isOneShotActive = sound.category !== 'scenes' && activeOneShotId === sound.id;
            const activeClass = isSceneActive || isOneShotActive ? 'ring-2 ring-cyan-300' : '';

            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => handleSoundTap(sound)}
                className={`rounded-xl border border-white/20 bg-slate-800 px-2 py-2 text-xs font-bold capitalize text-left ${activeClass}`}
              >
                {sound.label}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SwampyVisualizerLab />);
