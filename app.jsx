const { useEffect, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState('River');
  const [visibleScene, setVisibleScene] = useState('River');
  const [fadingScene, setFadingScene] = useState(null);
  const [activeOneShot, setActiveOneShot] = useState(null);
  const [orientation, setOrientation] = useState(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');

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

  const actions = [
    { name: 'Splashes!', emoji: '💦', color: 'bg-cyan-600' },
    { name: 'Run!', emoji: '👟', color: 'bg-orange-600' },
    { name: 'Climb!', emoji: '🪵', color: 'bg-amber-600' },
    { name: 'Rustle!', emoji: '🌿', color: 'bg-lime-700' },
    { name: 'Jump!', emoji: '⬆️', color: 'bg-green-700' },
  ];

  const characters = [
    { name: 'Crane', emoji: '🪶' },
    { name: 'Cardinal', emoji: '🐦' },
    { name: 'Laughing Gull', emoji: '🕊️' },
    { name: 'Coot', emoji: '🦆' },
    { name: 'Alligator', emoji: '🐊' },
    { name: 'Racoon', emoji: '🦝' },
  ];

  const emotions = [
    { name: 'Celebrate!', emoji: '🎉', tint: 'bg-cyan-700' },
    { name: 'Build Tension!', emoji: '😬', tint: 'bg-yellow-700' },
    { name: 'Problem!', emoji: '❗', tint: 'bg-orange-700' },
  ];

  const environments = [
    { name: 'Wind!', color: '#67c1d8' },
    { name: 'Rain!', color: '#4f7baf' },
    { name: 'Beach!', color: '#f0b35a' },
    { name: 'River', color: '#67a5a1' },
    { name: 'Night!', color: '#26314d' },
  ];

  const sceneColor = environments.find((scene) => scene.name === visibleScene)?.color ?? '#67a5a1';
  const fadingColor = fadingScene
    ? environments.find((scene) => scene.name === fadingScene)?.color ?? '#67a5a1'
    : null;

  const vibrateTap = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
    }
  };

  const triggerOneShot = (key) => {
    vibrateTap();
    setActiveOneShot(key);
    window.setTimeout(() => {
      setActiveOneShot((current) => (current === key ? null : current));
    }, 3000);
  };

  const changeEnvironment = (nextScene) => {
    vibrateTap();
    if (nextScene === activeScene) return;
    setFadingScene(visibleScene);
    setVisibleScene(nextScene);
    setActiveScene(nextScene);
    window.setTimeout(() => setFadingScene(null), 500);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-900 p-3 sm:p-6">
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ backgroundColor: sceneColor, opacity: 0.92 }}
      />
      {fadingColor && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: fadingColor, animation: 'sceneFadeOut 500ms ease forwards' }}
        />
      )}

      <div className={`relative mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[2.5rem] border-8 border-neutral-900/90 bg-[#f2dfbc]/95 p-3 shadow-2xl sm:p-5 ${orientation === 'landscape' ? 'landscape-board' : ''}`}>
        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3 shadow-inner">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Actions</h2>
          <div className="grid grid-cols-5 gap-2">
            {actions.map((action) => {
              const oneShotKey = `action-${action.name}`;
              const isActive = activeOneShot === oneShotKey;
              return (
                <button
                  key={action.name}
                  type="button"
                  onClick={() => triggerOneShot(oneShotKey)}
                  className={`rounded-2xl border-2 border-amber-900/50 p-2 text-white shadow-md transition ${action.color} ${isActive ? 'one-shot-active' : ''}`}
                >
                  <div className="text-2xl sm:text-3xl">{action.emoji}</div>
                  <p className="text-xs font-bold sm:text-lg">{action.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Characters</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {characters.map((character) => {
              const oneShotKey = `character-${character.name}`;
              const isActive = activeOneShot === oneShotKey;
              return (
                <button
                  key={character.name}
                  type="button"
                  onClick={() => triggerOneShot(oneShotKey)}
                  className={`aspect-square rounded-full border-4 border-amber-900/70 bg-yellow-50 text-center shadow-md transition ${isActive ? 'one-shot-active' : ''}`}
                >
                  <div className="text-3xl sm:text-4xl">{character.emoji}</div>
                  <p className="px-1 text-[10px] font-bold text-amber-900 sm:text-xs">{character.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-[#f8e9ca] p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Emotions</h2>
          <div className="grid grid-cols-3 gap-3">
            {emotions.map((emotion) => {
              const oneShotKey = `emotion-${emotion.name}`;
              const isActive = activeOneShot === oneShotKey;
              return (
                <button
                  key={emotion.name}
                  type="button"
                  onClick={() => triggerOneShot(oneShotKey)}
                  className={`min-h-20 rounded-full border-4 border-amber-900/70 p-3 text-white shadow-md transition sm:min-h-24 ${emotion.tint} ${isActive ? 'one-shot-active' : ''}`}
                >
                  <div className="text-3xl sm:text-4xl">{emotion.emoji}</div>
                  <p className="text-sm font-black sm:text-lg">{emotion.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border-4 border-amber-900/40 bg-sky-200/70 p-3">
          <h2 className="mb-3 text-center text-2xl font-black italic text-amber-900 sm:text-3xl">Environment</h2>
          <div className="grid grid-cols-5 gap-2">
            {environments.map((scene) => {
              const isSelected = activeScene === scene.name;
              return (
                <button
                  key={scene.name}
                  type="button"
                  onClick={() => changeEnvironment(scene.name)}
                  className={`rounded-2xl border-2 border-amber-900/60 p-2 text-white shadow-md transition ${isSelected ? 'scene-active' : ''}`}
                  style={{ backgroundColor: scene.color }}
                >
                  <div className="mb-2 h-8 rounded-lg border border-white/40 sm:h-10" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <p className="text-xs font-black sm:text-lg">{scene.name}</p>
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

        @keyframes sceneFadeOut {
          from { opacity: 0.92; }
          to { opacity: 0; }
        }

        .one-shot-active {
          animation: neonPulse 3s ease forwards;
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
