const { useEffect, useMemo, useRef, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState(null);
  const [activeEmotionMelody, setActiveEmotionMelody] = useState(null);
  const [activeOneShot, setActiveOneShot] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const sceneAudioRef = useRef(null);
  const emotionAudioRef = useRef(null);

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const response = await fetch('./audio-assets/manifest.json', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load manifest (${response.status})`);
        }
        const data = await response.json();
        setManifest(data);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load audio assets.');
      }
    };

    loadManifest();
  }, []);

  useEffect(() => {
    return () => {
      if (sceneAudioRef.current) {
        sceneAudioRef.current.pause();
        sceneAudioRef.current = null;
      }

      if (emotionAudioRef.current) {
        emotionAudioRef.current.pause();
        emotionAudioRef.current = null;
      }
    };
  }, []);

  const sectionData = useMemo(() => {
    if (!manifest) {
      return {
        actions: [],
        characters: [],
        emotionsMelodies: [],
        scenes: [],
      };
    }

    const normalize = (folder, files = []) =>
      files.map((fileName) => ({
        id: `${folder}-${fileName}`,
        fileName,
        label: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
        src: `./audio-assets/${folder}/${fileName}`,
      }));

    return {
      actions: normalize('actions', manifest.actions),
      characters: normalize('characters', manifest.characters),
      emotionsMelodies: normalize('emotions-melodies', manifest['emotions-melodies']),
      scenes: normalize('scenes', manifest.scenes),
    };
  }, [manifest]);

  const normalizeLabel = (value) => value.toLowerCase();

  const sceneThemeMap = {
    beach: {
      boardBackground: 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)',
      sceneColor: 'linear-gradient(135deg, #1d4ed8 0%, #7dd3fc 100%)',
      swatch: 'linear-gradient(135deg, #60a5fa 0%, #0ea5e9 100%)',
    },
    lake: {
      boardBackground: 'linear-gradient(135deg, #60a5fa 0%, #fde047 100%)',
      sceneColor: 'linear-gradient(135deg, #2563eb 0%, #facc15 100%)',
      swatch: 'linear-gradient(135deg, #3b82f6 0%, #fde047 100%)',
    },
    underwater: {
      boardBackground: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 62%, #e2e8f0 100%)',
      sceneColor: 'linear-gradient(135deg, #020617 0%, #1e3a8a 60%, #f8fafc 100%)',
      swatch: 'linear-gradient(135deg, #1e3a8a 0%, #f8fafc 100%)',
    },
    woods: {
      boardBackground: 'linear-gradient(135deg, #7c2d12 0%, #14532d 100%)',
      sceneColor: 'linear-gradient(135deg, #3f1d0d 0%, #14532d 100%)',
      swatch: 'linear-gradient(135deg, #92400e 0%, #166534 100%)',
    },
    default: {
      boardBackground: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
      sceneColor: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
      swatch: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
    },
  };

  const activeSceneLabel = sectionData.scenes.find((scene) => scene.id === activeScene)?.label || 'default';
  const currentSceneTheme = sceneThemeMap[normalizeLabel(activeSceneLabel)] || sceneThemeMap.default;

  const emojiMap = {
    actions: {
      splash: '💦',
      running: '🏃',
      rustling: '🍃',
      magic: '✨🪄',
      walking: '🚶',
      default: '⚡',
    },
    characters: {
      cardinal: '🐦',
      crane: '🪿',
      panther: '🐆',
      alligator: '🐊',
      coot: '🦆',
      default: '🐾',
    },
    emotionsMelodies: {
      harmonica: '🎵🎷',
      bongo: '🥁🔥',
      piano: '🎹✨',
      mystery: '🎹🌙',
      upbeat: '🎶😄',
      default: '🎶',
    },
    scenes: {
      beach: '🏖️',
      lake: '🏞️',
      underwater: '🌊🐠',
      woods: '🌲🦌',
      swamp: '🐸🌿',
      rain: '🌧️',
      river: '🏞️💧',
      default: '🌍',
    },
  };

  const getEmojiLabel = (category, label) => {
    const normalized = normalizeLabel(label);
    const categoryMap = emojiMap[category] || {};

    const match = Object.entries(categoryMap).find(([key]) => key !== 'default' && normalized.includes(key));
    return match ? match[1] : categoryMap.default || '✨';
  };

  const vibrateTap = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
    }
  };

  const triggerOneShot = (sound) => {
    vibrateTap();

    const audio = new Audio(sound.src);
    audio.currentTime = 0;
    audio.play().catch(() => {});

    setActiveOneShot(sound.id);

    window.setTimeout(() => {
      setActiveOneShot((current) => (current === sound.id ? null : current));
    }, 600);

    window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 5000);
  };

  const toggleEmotionMelody = (melody) => {
    vibrateTap();

    if (activeEmotionMelody === melody.id) {
      if (emotionAudioRef.current) {
        emotionAudioRef.current.pause();
        emotionAudioRef.current = null;
      }
      setActiveEmotionMelody(null);
      return;
    }

    if (emotionAudioRef.current) {
      emotionAudioRef.current.pause();
      emotionAudioRef.current = null;
    }

    const nextAudio = new Audio(melody.src);
    nextAudio.loop = true;
    nextAudio.currentTime = 0;
    nextAudio.play().catch(() => {});

    emotionAudioRef.current = nextAudio;
    setActiveEmotionMelody(melody.id);
  };

  const changeEnvironment = (scene) => {
    vibrateTap();

    if (activeScene === scene.id) {
      if (sceneAudioRef.current) {
        sceneAudioRef.current.pause();
        sceneAudioRef.current = null;
      }
      setActiveScene(null);
      return;
    }

    if (sceneAudioRef.current) {
      sceneAudioRef.current.pause();
      sceneAudioRef.current = null;
    }

    const nextAudio = new Audio(scene.src);
    nextAudio.loop = true;
    nextAudio.currentTime = 0;
    nextAudio.play().catch(() => {});

    sceneAudioRef.current = nextAudio;
    setActiveScene(scene.id);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black p-3 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: currentSceneTheme.sceneColor, opacity: 0.42 }}
      />

      <div
        className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[2.5rem] border-8 border-neutral-900/90 p-3 shadow-2xl sm:p-5 ${orientation === 'landscape' ? 'landscape-board' : ''}`}
        style={{ background: currentSceneTheme.boardBackground }}
      >
        {loadError && (
          <section className="rounded-2xl border-2 border-red-700/50 bg-red-100 p-3 text-sm font-bold text-red-800">
            {loadError}
          </section>
        )}

        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3 shadow-inner">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">🏃💨✨</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {sectionData.actions.map((action) => {
              const isActive = activeOneShot === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => triggerOneShot(action)}
                  className={`min-h-14 min-w-20 rounded-2xl border-2 border-amber-900/50 bg-cyan-700 p-2 text-white shadow-md transition ${isActive ? 'button-glow-active' : ''}`}
                >
                  <p className="text-xl font-bold capitalize sm:text-2xl">{getEmojiLabel('actions', action.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">🐊🦆🐦</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {sectionData.characters.map((character) => {
              const isActive = activeOneShot === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => triggerOneShot(character)}
                  className={`grid h-20 w-20 place-items-center rounded-full border-4 border-amber-900/70 bg-yellow-50 text-center shadow-md transition sm:h-24 sm:w-24 ${isActive ? 'button-glow-active' : ''}`}
                >
                  <p className="text-2xl sm:text-3xl">{getEmojiLabel('characters', character.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">🎵🎶🎹</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {sectionData.emotionsMelodies.map((emotion) => {
              const isActive = activeEmotionMelody === emotion.id;
              return (
                <button
                  key={emotion.id}
                  type="button"
                  onClick={() => toggleEmotionMelody(emotion)}
                  className={`grid min-h-20 min-w-28 place-items-center rounded-2xl border-4 border-amber-900/70 bg-orange-700 p-3 text-white shadow-md transition sm:min-h-24 sm:min-w-32 ${isActive ? 'button-glow-active' : ''}`}
                >
                  <p className="text-2xl sm:text-3xl">{getEmojiLabel('emotionsMelodies', emotion.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">🌍🌈</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {sectionData.scenes.map((scene) => {
              const isSelected = activeScene === scene.id;
              const sceneLabel = normalizeLabel(scene.label);
              const sceneTheme = sceneThemeMap[sceneLabel] || sceneThemeMap.default;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => changeEnvironment(scene)}
                  className={`w-24 rounded-2xl border-2 border-amber-900/60 p-2 text-white shadow-md transition ${isSelected ? 'button-glow-active' : ''}`}
                  style={{ background: sceneTheme.swatch }}
                >
                  <div className="mb-2 h-8 rounded-lg border border-white/40 bg-white/20 sm:h-10" />
                  <p className="text-2xl">{getEmojiLabel('scenes', scene.label)}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes glowPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2), 0 0 0 rgba(56, 189, 248, 0.35);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 18px 4px rgba(255, 255, 255, 0.65), 0 0 30px rgba(56, 189, 248, 0.9);
            transform: scale(1.03);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.2), 0 0 0 rgba(56, 189, 248, 0.35);
            transform: scale(1);
          }
        }

        .button-glow-active {
          animation: glowPulse 1.2s ease-in-out infinite;
          filter: brightness(1.12) saturate(1.15);
        }

        @media (orientation: landscape) and (max-height: 700px) {
          .landscape-board {
            gap: 0.6rem;
            padding: 0.65rem;
          }

          .landscape-board h2 {
            margin-bottom: 0.45rem;
            font-size: 1.45rem;
          }
        }
      `}</style>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SwampySoundboardPage />);
