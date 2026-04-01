const { useEffect, useMemo, useRef, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState(null);
  const [activeEmotionMelody, setActiveEmotionMelody] = useState(null);
  const [activeOneShot, setActiveOneShot] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const sceneAudioRef = useRef(null);
  const emotionAudioRef = useRef(null);
  const audioCacheRef = useRef(new Map());

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

  useEffect(() => {
    const allSounds = [
      ...sectionData.actions,
      ...sectionData.characters,
      ...sectionData.emotionsMelodies,
      ...sectionData.scenes,
    ];

    allSounds.forEach((sound) => {
      if (!audioCacheRef.current.has(sound.id)) {
        const audio = new Audio(sound.src);
        audio.preload = 'auto';
        audio.load();
        audioCacheRef.current.set(sound.id, audio);
      }
    });
  }, [sectionData]);

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

  const buildPlaybackAudio = (sound, { loop = false } = {}) => {
    const cachedAudio = audioCacheRef.current.get(sound.id);
    const audio = cachedAudio ? cachedAudio.cloneNode() : new Audio(sound.src);
    audio.preload = 'auto';
    audio.loop = loop;
    audio.currentTime = 0;
    return audio;
  };

  const triggerOneShot = (sound) => {
    vibrateTap();

    const audio = buildPlaybackAudio(sound);
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

    const nextAudio = buildPlaybackAudio(melody, { loop: true });
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

    const nextAudio = buildPlaybackAudio(scene, { loop: true });
    nextAudio.play().catch(() => {});

    sceneAudioRef.current = nextAudio;
    setActiveScene(scene.id);
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-black p-2 sm:p-3">
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: currentSceneTheme.sceneColor, opacity: 0.42 }}
      />

      <div
        className="relative mx-auto flex h-full w-full max-w-5xl flex-col gap-1 border-4 border-neutral-900/90 p-1 shadow-2xl sm:gap-2"
        style={{ background: currentSceneTheme.boardBackground }}
      >
        <header className="px-2 py-1 text-center">
          <h1 className="text-xl font-black uppercase tracking-wide text-white drop-shadow sm:text-2xl">
            Swampy Story Maker
          </h1>
        </header>

        {loadError && (
          <section className="rounded-2xl border-2 border-red-700/50 bg-red-100 p-2 text-xs font-bold text-red-800 sm:text-sm">
            {loadError}
          </section>
        )}

        <section className="row-panel">
          <div className="row-scroller">
            {sectionData.actions.map((action) => {
              const isActive = activeOneShot === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => triggerOneShot(action)}
                  className={`pill-button bg-cyan-700 text-white ${isActive ? 'button-glow-active' : ''}`}
                >
                  <p className="text-2xl font-bold">{getEmojiLabel('actions', action.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="row-panel row-panel-characters" style={{ background: currentSceneTheme.sceneColor }}>
          <div className="storybook-ground">
            {sectionData.characters.map((character) => {
              const isActive = activeOneShot === character.id;
              return (
                <span
                  key={character.id}
                  role="button"
                  tabIndex={0}
                  aria-label={character.label}
                  onClick={() => triggerOneShot(character)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      triggerOneShot(character);
                    }
                  }}
                  className={`character-emoji ${isActive ? 'emoji-active' : ''}`}
                >
                  {getEmojiLabel('characters', character.label)}
                </span>
              );
            })}
          </div>
        </section>

        <section className="row-panel">
          <div className="row-scroller">
            {sectionData.emotionsMelodies.map((emotion) => {
              const isActive = activeEmotionMelody === emotion.id;
              return (
                <button
                  key={emotion.id}
                  type="button"
                  onClick={() => toggleEmotionMelody(emotion)}
                  className={`pill-button min-w-24 bg-orange-700 text-white ${isActive ? 'button-glow-active' : ''}`}
                >
                  <p className="text-2xl">{getEmojiLabel('emotionsMelodies', emotion.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="row-panel">
          <div className="row-scroller">
            {sectionData.scenes.map((scene) => {
              const isSelected = activeScene === scene.id;
              const sceneLabel = normalizeLabel(scene.label);
              const sceneTheme = sceneThemeMap[sceneLabel] || sceneThemeMap.default;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => changeEnvironment(scene)}
                  className={`pill-button text-white ${isSelected ? 'button-glow-active' : ''}`}
                  style={{ background: sceneTheme.swatch }}
                >
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

        .row-panel {
          flex: 0.8;
          min-height: 0;
          border: 0;
          border-radius: 0;
          background: #ffffff;
          padding: 0.35rem 0.2rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .row-panel-characters {
          flex: 1.8;
        }

        .row-scroller {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: thin;
          -webkit-overflow-scrolling: touch;
          padding: 0.1rem 0.25rem;
        }

        .pill-button {
          flex: 0 0 auto;
          min-height: 2.8rem;
          min-width: 4.2rem;
          border-radius: 0.95rem;
          border: 2px solid rgba(120, 53, 15, 0.6);
          padding: 0.2rem 0.6rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .storybook-ground {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-wrap: nowrap;
          align-items: flex-end;
          gap: 0.35rem;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          padding: 0 0.4rem 0.1rem;
          border-radius: 1rem;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.2) 0%, rgba(255, 255, 255, 0.07) 55%, rgba(255, 255, 255, 0) 100%);
        }

        .character-emoji {
          flex: 0 0 auto;
          font-size: clamp(3rem, 8vw, 4rem);
          line-height: 1;
          cursor: pointer;
          user-select: none;
          transform: translateY(8%);
          transition: transform 180ms ease, filter 180ms ease;
          filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.35));
        }

        .character-emoji:focus-visible,
        .character-emoji:hover {
          transform: translateY(0);
          filter: drop-shadow(0 6px 4px rgba(0, 0, 0, 0.45));
        }

        .emoji-active {
          filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.85));
        }
      `}</style>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SwampySoundboardPage />);
