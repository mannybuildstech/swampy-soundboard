const { useEffect, useMemo, useRef, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState(null);
  const [activeOneShot, setActiveOneShot] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  const sceneAudioRef = useRef(null);

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

  const sceneColor = '#67a5a1';

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
    }, 500);

    window.setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 5000);
  };

  const changeEnvironment = (scene) => {
    vibrateTap();

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
    <main className="relative min-h-screen overflow-hidden bg-slate-900 p-3 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ backgroundColor: sceneColor, opacity: 0.92 }}
      />

      <div className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[2.5rem] border-8 border-neutral-900/90 bg-[#f2dfbc]/95 p-3 shadow-2xl sm:p-5 ${orientation === 'landscape' ? 'landscape-board' : ''}`}>
        {loadError && (
          <section className="rounded-2xl border-2 border-red-700/50 bg-red-100 p-3 text-sm font-bold text-red-800">
            {loadError}
          </section>
        )}

        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3 shadow-inner">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Actions</h2>
          <div className="grid grid-cols-5 gap-2">
            {sectionData.actions.map((action) => {
              const isActive = activeOneShot === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => triggerOneShot(action)}
                  className={`rounded-2xl border-2 border-amber-900/50 bg-cyan-700 p-2 text-white shadow-md transition ${isActive ? 'one-shot-active' : ''}`}
                >
                  <p className="text-xs font-bold capitalize sm:text-sm">{action.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Characters</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {sectionData.characters.map((character) => {
              const isActive = activeOneShot === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => triggerOneShot(character)}
                  className={`aspect-square rounded-full border-4 border-amber-900/70 bg-yellow-50 text-center shadow-md transition ${isActive ? 'one-shot-active' : ''}`}
                >
                  <p className="px-1 text-[11px] font-bold capitalize text-amber-900 sm:text-xs">{character.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Emotions Melodies</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {sectionData.emotionsMelodies.map((emotion) => {
              const isActive = activeOneShot === emotion.id;
              return (
                <button
                  key={emotion.id}
                  type="button"
                  onClick={() => triggerOneShot(emotion)}
                  className={`min-h-20 rounded-2xl border-4 border-amber-900/70 bg-orange-700 p-3 text-white shadow-md transition sm:min-h-24 ${isActive ? 'one-shot-active' : ''}`}
                >
                  <p className="text-sm font-black capitalize sm:text-base">{emotion.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Scenes</h2>
          <div className="grid grid-cols-5 gap-2">
            {sectionData.scenes.map((scene) => {
              const isSelected = activeScene === scene.id;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => changeEnvironment(scene)}
                  className={`rounded-2xl border-2 border-amber-900/60 p-2 text-white shadow-md transition ${isSelected ? 'scene-active' : ''}`}
                  style={{ backgroundColor: '#2563eb' }}
                >
                  <div className="mb-2 h-8 rounded-lg border border-white/40 sm:h-10" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <p className="text-xs font-black capitalize sm:text-sm">{scene.label}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes neonPulse {
          0% { box-shadow: 0 0 0 rgba(34, 211, 238, 0); }
          20% { box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.95), 0 0 20px rgba(16, 185, 129, 0.95); }
          100% { box-shadow: 0 0 0 rgba(34, 211, 238, 0); }
        }

        .one-shot-active {
          animation: neonPulse 0.5s ease forwards;
        }

        .scene-active {
          box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.95), 0 0 16px rgba(16, 185, 129, 1);
          border-color: rgba(34, 211, 238, 1) !important;
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
