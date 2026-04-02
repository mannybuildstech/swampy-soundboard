const { useEffect, useMemo, useRef, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState(null);
  const [activeEmotionMelody, setActiveEmotionMelody] = useState(null);
  const [activeOneShots, setActiveOneShots] = useState(() => new Set());
  const [manifest, setManifest] = useState(null);
  const [loadError, setLoadError] = useState('');
  const sceneAudioRef = useRef(null);
  const emotionAudioRef = useRef(null);
  const audioCacheRef = useRef(new Map());
  const activeOneShotInstancesRef = useRef(new Map());

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

  const stopAllAudio = () => {
    if (sceneAudioRef.current) {
      sceneAudioRef.current.pause();
      sceneAudioRef.current.currentTime = 0;
      sceneAudioRef.current = null;
    }

    if (emotionAudioRef.current) {
      emotionAudioRef.current.pause();
      emotionAudioRef.current.currentTime = 0;
      emotionAudioRef.current = null;
    }

    activeOneShotInstancesRef.current.forEach((instances) => {
      instances.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    });
    activeOneShotInstancesRef.current.clear();

    setActiveScene(null);
    setActiveEmotionMelody(null);
    setActiveOneShots(new Set());
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllAudio();
      }
    };

    const handlePageHide = () => {
      stopAllAudio();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
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
      boardBackground: '#3b82f6',
      swatch: 'linear-gradient(135deg, #60a5fa 0%, #0ea5e9 100%)',
    },
    lake: {
      boardBackground: '#3b82f6',
      swatch: 'linear-gradient(135deg, #3b82f6 0%, #fde047 100%)',
    },
    underwater: {
      boardBackground: '#1e3a8a',
      swatch: 'linear-gradient(135deg, #1e3a8a 0%, #f8fafc 100%)',
    },
    woods: {
      boardBackground: '#14532d',
      swatch: 'linear-gradient(135deg, #92400e 0%, #166534 100%)',
    },
    default: {
      boardBackground: '#f97316',
      swatch: 'linear-gradient(135deg, #f97316 0%, #facc15 100%)',
    },
  };

  const activeSceneLabel = sectionData.scenes.find((scene) => scene.id === activeScene)?.label;
  const currentSceneTheme = activeSceneLabel
    ? sceneThemeMap[normalizeLabel(activeSceneLabel)] || sceneThemeMap.default
    : null;

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
    const instances = activeOneShotInstancesRef.current.get(sound.id) || new Set();
    instances.add(audio);
    activeOneShotInstancesRef.current.set(sound.id, instances);

    setActiveOneShots((current) => new Set(current).add(sound.id));

    const clearActiveState = () => {
      const currentInstances = activeOneShotInstancesRef.current.get(sound.id);
      if (!currentInstances) {
        return;
      }

      currentInstances.delete(audio);
      if (!currentInstances.size) {
        activeOneShotInstancesRef.current.delete(sound.id);
        setActiveOneShots((current) => {
          const next = new Set(current);
          next.delete(sound.id);
          return next;
        });
      }
    };

    audio.addEventListener('ended', clearActiveState, { once: true });
    audio.addEventListener('pause', clearActiveState, { once: true });
    audio.play().catch(() => {
      clearActiveState();
    });
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
    <main className="relative h-full min-h-full w-full overflow-hidden bg-white p-0">
      <div
        className="relative flex h-full w-full flex-col gap-1 p-2 transition-colors duration-700 sm:gap-2 sm:p-3"
        style={{ backgroundColor: currentSceneTheme ? currentSceneTheme.boardBackground : '#ffffff' }}
      >
        <header className="rounded-2xl bg-white px-2 py-1 text-center shadow-sm sm:py-2">
          <h1 className="text-2xl font-black uppercase tracking-wide text-black sm:text-3xl lg:text-4xl">
            Swampy Story Maker
          </h1>
        </header>

        {loadError && (
          <section className="rounded-2xl border-2 border-red-700/50 bg-red-100 p-2 text-xs font-bold text-red-800 sm:text-sm">
            {loadError}
          </section>
        )}

        <section className="row-panel">
          <div className="row-scroller" style={{ gridTemplateColumns: `repeat(${Math.max(sectionData.actions.length, 1)}, minmax(0, 1fr))` }}>
            {sectionData.actions.map((action) => {
              const isActive = activeOneShots.has(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => triggerOneShot(action)}
                  className="pill-button text-white"
                >
                  <p className={`emoji-glyph font-bold ${isActive ? 'emoji-sound-active' : ''}`}>{getEmojiLabel('actions', action.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="row-panel row-panel-characters"
        >
          <div
            className="storybook-ground"
            style={{ gridTemplateColumns: `repeat(${Math.max(sectionData.characters.length, 1)}, minmax(0, 1fr))` }}
          >
            {sectionData.characters.map((character) => {
              const isActive = activeOneShots.has(character.id);
              return (
                <button
                  key={character.id}
                  aria-label={character.label}
                  onClick={() => triggerOneShot(character)}
                  className="character-emoji"
                >
                  <span className={`character-glyph ${isActive ? 'emoji-sound-active' : ''}`}>
                    {getEmojiLabel('characters', character.label)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="row-panel">
          <div className="row-scroller" style={{ gridTemplateColumns: `repeat(${Math.max(sectionData.emotionsMelodies.length, 1)}, minmax(0, 1fr))` }}>
            {sectionData.emotionsMelodies.map((emotion) => {
              const isActive = activeEmotionMelody === emotion.id;
              return (
                <button
                  key={emotion.id}
                  type="button"
                  onClick={() => toggleEmotionMelody(emotion)}
                  className="pill-button text-white"
                >
                  <p className={`emoji-glyph ${isActive ? 'emoji-sound-active' : ''}`}>{getEmojiLabel('emotionsMelodies', emotion.label)}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="row-panel">
          <div className="row-scroller" style={{ gridTemplateColumns: `repeat(${Math.max(sectionData.scenes.length, 1)}, minmax(0, 1fr))` }}>
            {sectionData.scenes.map((scene) => {
              const isSelected = activeScene === scene.id;
              const sceneLabel = normalizeLabel(scene.label);
              const sceneTheme = sceneThemeMap[sceneLabel] || sceneThemeMap.default;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => changeEnvironment(scene)}
                  className="pill-button text-white"
                  style={{ background: sceneTheme.swatch, opacity: 0.82 }}
                >
                  <p className={`emoji-glyph ${isSelected ? 'emoji-sound-active' : ''}`}>{getEmojiLabel('scenes', scene.label)}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes glowPulse {
          0% {
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.55)) drop-shadow(0 0 12px rgba(56, 189, 248, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 34px rgba(56, 189, 248, 1));
          }
          100% {
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.55)) drop-shadow(0 0 12px rgba(56, 189, 248, 0.5));
          }
        }

        @keyframes tiltFloat {
          0% {
            transform: translateY(0) rotate(-25deg);
          }
          50% {
            transform: translateY(-8px) rotate(25deg);
          }
          100% {
            transform: translateY(0) rotate(-25deg);
          }
        }

        .row-panel {
          flex: 1;
          min-height: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0.35rem 0.2rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .row-panel-characters {
          flex: 2.2;
          overflow-y: visible;
        }

        .row-scroller {
          flex: 1;
          min-height: 0;
          display: grid;
          align-items: stretch;
          gap: 0.45rem;
          overflow: hidden;
          padding: 0.1rem 0.25rem;
        }

        .pill-button {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          display: grid;
          place-items: center;
          text-align: center;
          border-radius: 0.95rem;
          border: 2px solid rgba(120, 53, 15, 0.3);
          padding: 0.2rem 0.6rem;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(1px);
        }

        .emoji-glyph {
          font-size: clamp(2rem, min(7vw, 7vh), 6rem);
          line-height: 1;
          display: inline-block;
          transform-origin: center center;
        }

        .storybook-ground {
          flex: 1;
          min-height: 0;
          display: grid;
          align-items: stretch;
          gap: 0.35rem;
          overflow-x: hidden;
          overflow-y: visible;
          padding: 0 0.4rem 0.1rem;
          border-radius: 1rem;
          background: transparent;
        }

        .character-emoji {
          --character-safe-bottom-padding: clamp(0.22rem, 0.9vh, 0.75rem);
          --character-glyph-bottom-bleed: 0;
          width: 100%;
          height: 100%;
          border: 0;
          border-radius: 0;
          background: transparent;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
          box-shadow: none;
          font-size: clamp(3.8rem, min(16vw, 24vh), 13rem);
          line-height: 1;
          cursor: pointer;
          user-select: none;
          display: grid;
          place-items: end center;
          padding: 0 0 var(--character-safe-bottom-padding);
          overflow: hidden;
          transform: translateY(0);
          transition: transform 180ms ease, filter 180ms ease;
          filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.35));
          transform-origin: center center;
        }

        .character-glyph {
          font-size: inherit;
          line-height: 1;
          display: inline-block;
          vertical-align: bottom;
          margin: 0;
          transform: translateY(0);
          transform-origin: center center;
        }

        .character-emoji:focus-visible,
        .character-emoji:hover {
          transform: translateY(0);
          filter: drop-shadow(0 6px 4px rgba(0, 0, 0, 0.45));
        }

        .emoji-sound-active {
          animation: tiltFloat 1.5s ease-in-out infinite, glowPulse 0.95s ease-in-out infinite;
          will-change: transform, filter;
        }
      `}</style>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SwampySoundboardPage />);
