const { useEffect, useMemo, useRef, useState } = React;

function SwampySoundboardPage() {
  const [activeScene, setActiveScene] = useState('scenes-beach');
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
        // Pause all audio but preserve scene selection
        if (sceneAudioRef.current) {
          sceneAudioRef.current.pause();
        }
        if (emotionAudioRef.current) {
          emotionAudioRef.current.pause();
          emotionAudioRef.current = null;
        }
        activeOneShotInstancesRef.current.forEach((instances) => {
          instances.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
          });
        });
        activeOneShotInstancesRef.current.clear();
        setActiveEmotionMelody(null);
        setActiveOneShots(new Set());
      } else {
        // Resume scene audio when coming back
        if (sceneAudioRef.current) {
          sceneAudioRef.current.play().catch(() => {});
        }
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

    const normalize = (folder, items = []) =>
      items.map((item) => ({
        id: `${folder}-${item.id}`,
        label: item.label,
        emoji: item.emoji || '✨',
        image: item.image ? `./audio-assets/${folder}/${item.image}` : null,
        src: `./audio-assets/${folder}/${item.audio}`,
      }));

    const normalizeCharacters = (items = []) =>
      items.map((item) => ({
        id: `characters-${item.id}`,
        label: item.label,
        emoji: item.emoji || '✨',
        image: item.image ? `./animal-images/${item.image}` : null,
        src: `./audio-assets/characters/${item.audio}`,
      }));

    const normalizeScenes = (items = []) =>
      items.map((item) => ({
        id: `scenes-${item.id}`,
        label: item.label,
        emoji: item.emoji || '✨',
        image: item.image ? `./scenes/${item.image}` : null,
        src: `./audio-assets/scenes/${item.audio}`,
      }));

    return {
      actions: normalize('actions', manifest.actions),
      characters: normalizeCharacters(manifest.characters),
      emotionsMelodies: normalize('emotions-melodies', manifest['emotions-melodies']),
      scenes: normalizeScenes(manifest.scenes),
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

  const characterScaleMap = {
    'characters-alligator': 1.4,
    'characters-cardinal': 0.7,
    'characters-coyote': 1.1,
    'characters-crane': 1.2,
    'characters-panther': 1.15,
  };

  const sceneThemeMap = {
    beach: {
      borderColor: '#3b82f6',
    },
    'oak-forest': {
      borderColor: '#92400e',
    },
    'pine-forest': {
      borderColor: '#14532d',
    },
    reef: {
      borderColor: '#1e3a8a',
    },
    spring: {
      borderColor: '#0ea5e9',
    },
    default: {
      borderColor: '#f97316',
    },
  };

  const activeSceneItem = sectionData.scenes.find((scene) => scene.id === activeScene);
  const activeSceneLabel = activeSceneItem?.label;
  const activeSceneImage = activeSceneItem?.image;
  const currentSceneTheme = activeSceneLabel
    ? sceneThemeMap[activeSceneItem.id.replace('scenes-', '')] || sceneThemeMap.default
    : null;

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
    if (activeScene === scene.id) {
      return;
    }

    vibrateTap();

    if (sceneAudioRef.current) {
      sceneAudioRef.current.pause();
      sceneAudioRef.current = null;
    }

    const nextAudio = buildPlaybackAudio(scene, { loop: true });
    nextAudio.play().catch(() => {});

    sceneAudioRef.current = nextAudio;
    setActiveScene(scene.id);
  };

  const storyGroundRef = useRef(null);

  const scrollCharacters = (direction) => {
    if (storyGroundRef.current) {
      const scrollAmount = storyGroundRef.current.offsetWidth * 0.6;
      storyGroundRef.current.scrollBy({ left: direction === 'right' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <main
      className="relative h-full w-full overflow-hidden p-0"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: '#422A1B url(./back-panel.png) center center / cover no-repeat',
      }}
    >
      <div
        className="relative flex h-full w-full flex-col gap-1 p-2 sm:gap-2 sm:p-3"
        style={{ backgroundColor: 'transparent' }}
      >
        <header className="top-bar">
          <h1 className="top-bar-title" style={{ color: '#d4a054' }}>
            Junior Recording Station
          </h1>
          <button
            type="button"
            onClick={stopAllAudio}
            className="stop-button"
            aria-label="Stop all audio"
            style={{ borderColor: currentSceneTheme ? currentSceneTheme.borderColor : 'rgba(120, 53, 15, 0.4)', transition: 'border-color 400ms ease' }}
          />
        </header>

        {loadError && (
          <section className="rounded-2xl border-2 border-red-700/50 bg-red-100 p-2 text-xs font-bold text-red-800 sm:text-sm">
            {loadError}
          </section>
        )}

        <div className="flex flex-1 min-h-0 gap-1 sm:gap-2">
          {/* LEFT COLUMN - Actions */}
          <aside className="col-panel">
            <div className="col-scroller" style={{ gridTemplateRows: `repeat(${Math.max(sectionData.actions.length, 1)}, minmax(0, 1fr))` }}>
              {sectionData.actions.map((action) => {
                const isActive = activeOneShots.has(action.id);
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => triggerOneShot(action)}
                    className="pill-button text-white"
                  >
                    <p className={`emoji-glyph font-bold ${isActive ? 'emoji-sound-active' : ''}`}>{action.image ? <img src={action.image} alt={action.label} className="inline-block h-[1em] w-[1em] object-contain" /> : action.emoji}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CENTER - Characters + Scenes */}
          <div className="flex flex-1 min-h-0 min-w-0 flex-col gap-1 sm:gap-2">
            <section
              className="row-panel story-canvas"
              style={{
                backgroundColor: '#2d6a4f',
                backgroundImage: activeSceneImage ? `url(${activeSceneImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'bottom center',
                transition: 'background-image 400ms ease, border-color 400ms ease',
                borderColor: currentSceneTheme ? currentSceneTheme.borderColor : 'rgba(180, 120, 60, 0.5)',
                position: 'relative',
              }}
            >
              {/* Darkening overlay */}
              <div className="scene-darkener" />
              <div className="storybook-ground-wrapper" style={{ position: 'relative', zIndex: 1 }}>
                <button className="scroll-arrow scroll-arrow-left" aria-label="Scroll left" onClick={() => scrollCharacters('left')}>‹</button>
                <button className="scroll-arrow scroll-arrow-right" aria-label="Scroll right" onClick={() => scrollCharacters('right')}>›</button>
                <div
                  ref={storyGroundRef}
                  className="storybook-ground"
                  style={{ gridTemplateColumns: `repeat(${sectionData.characters.length}, 25%)` }}
                >
                  {sectionData.characters.map((character) => {
                    const isActive = activeOneShots.has(character.id);
                    const scale = characterScaleMap[character.id] || 1;
                    return (
                      <button
                        key={character.id}
                        aria-label={character.label}
                        onClick={() => triggerOneShot(character)}
                        className={`character-emoji ${isActive ? 'character-active' : ''}`}
                        style={{ fontSize: `calc(clamp(4rem, min(18vw, 22vh), 13rem) * ${scale})` }}
                      >
                        <span className={`character-glyph ${isActive ? 'character-glyph-active' : ''}`}>
                          {character.image ? <img src={character.image} alt={character.label} className="inline-block h-[1em] w-[1em] object-contain" /> : character.emoji}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="row-panel ambient-row">
              <div className="scene-row" style={{ gridTemplateColumns: `repeat(${Math.max(sectionData.scenes.length, 1)}, minmax(0, 1fr))` }}>
                {sectionData.scenes.map((scene) => {
                  const isSelected = activeScene === scene.id;
                  const isDimmed = activeScene && !isSelected;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => changeEnvironment(scene)}
                      className="scene-button"
                    >
                      <img
                        src={scene.image}
                        alt={scene.label}
                        className={`scene-img ${isSelected ? 'scene-img-active' : ''} ${isDimmed ? 'scene-img-dimmed' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN - Melodies (right thumb) */}
          <aside className="col-panel">
            <div className="col-scroller" style={{ gridTemplateRows: `repeat(${Math.max(sectionData.emotionsMelodies.length, 1)}, minmax(0, 1fr))` }}>
              {sectionData.emotionsMelodies.map((emotion) => {
                const isActive = activeEmotionMelody === emotion.id;
                return (
                  <button
                    key={emotion.id}
                    type="button"
                    onClick={() => toggleEmotionMelody(emotion)}
                    className="pill-button text-white"
                  >
                    <p className={`emoji-glyph ${isActive ? 'emoji-sound-active' : ''}`}>{emotion.image ? <img src={emotion.image} alt={emotion.label} className="inline-block h-[1em] w-[1em] object-contain" /> : emotion.emoji}</p>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
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

        @keyframes tiltFloatGentle {
          0% {
            transform: translateY(0) rotate(-6deg);
          }
          50% {
            transform: translateY(-2px) rotate(6deg);
          }
          100% {
            transform: translateY(0) rotate(-6deg);
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

        .story-canvas {
          flex: 1;
          overflow: clip;
          border: 3px solid rgba(180, 120, 60, 0.5);
          border-radius: 1.25rem;
          padding: 0.5rem;
        }

        .scene-darkener {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: rgba(0, 0, 0, 0.3);
          pointer-events: none;
          z-index: 0;
        }

        .row-panel.ambient-row {
          flex: 0 0 auto;
          height: calc(100% / 6);
        }

        .top-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          border-radius: 1rem;
          padding: 0.35rem 0.75rem;
          background: transparent;
          border: none;
        }

        .top-bar-title {
          font-size: clamp(1rem, 3.5vw, 1.75rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
          line-height: 1.1;
        }

        .stop-button {
          width: 2.25rem;
          height: 2.25rem;
          flex-shrink: 0;
          border-radius: 50%;
          background: #dc2626;
          border: 3px solid rgba(120, 53, 15, 0.4);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 150ms ease;
        }

        .stop-button:active {
          transform: scale(0.9);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
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

        .col-panel {
          width: 15%;
          min-width: 15vw;
          min-height: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0.2rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .col-scroller {
          flex: 1;
          min-height: 0;
          display: grid;
          align-items: stretch;
          gap: 0.45rem;
          overflow: hidden;
          padding: 0.1rem;
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
          border: none;
          padding: 0.2rem 0.6rem;
          box-shadow: none;
          background: transparent;
        }

        .emoji-glyph {
          font-size: clamp(2rem, min(7vw, 7vh), 6rem);
          line-height: 1;
          display: inline-block;
          transform-origin: center center;
        }

        .scene-row {
          flex: 1;
          min-height: 0;
          display: grid;
          align-items: stretch;
          gap: 0.35rem;
          overflow: hidden;
        }

        .scene-button {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          display: grid;
          place-items: center;
          background: transparent;
          border: none;
          border-radius: 0.75rem;
          padding: 0;
          cursor: pointer;
          overflow: hidden;
        }

        .scene-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 0.75rem;
          display: block;
          transform-origin: center center;
          transition: opacity 400ms ease, filter 400ms ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .scene-img-active {
          animation: glowPulse 0.95s ease-in-out infinite;
          will-change: filter;
        }

        .scene-img-dimmed {
          opacity: 0.4;
        }

        .storybook-ground-wrapper {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: stretch;
          border-radius: 1rem;
          overflow: hidden;
        }

        .storybook-ground {
          flex: 1;
          min-height: 0;
          display: grid;
          align-items: stretch;
          gap: 0.35rem;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0 0.4rem 0.1rem;
          border-radius: 1rem;
          background: transparent;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .storybook-ground::-webkit-scrollbar {
          display: none;
        }

        .storybook-ground > * {
          scroll-snap-align: center;
        }

        .scroll-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          font-weight: bold;
          color: rgba(255, 255, 255, 0.8);
          z-index: 2;
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
          animation: arrowPulse 2s ease-in-out infinite;
          background: rgba(0, 0, 0, 0.3);
          border: none;
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          display: grid;
          place-items: center;
          cursor: pointer;
          padding: 0;
        }

        .scroll-arrow-left {
          left: 0.25rem;
        }

        .scroll-arrow-right {
          right: 0.25rem;
        }

        @keyframes arrowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.9; }
        }

        .character-emoji {
          --character-safe-bottom-padding: clamp(0.12rem, 0.6vh, 0.5rem);
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
          font-size: clamp(4rem, min(18vw, 22vh), 13rem);
          line-height: 1;
          cursor: pointer;
          user-select: none;
          display: grid;
          place-items: end center;
          padding: 0 0 var(--character-safe-bottom-padding);
          overflow: visible;
          transform: translateY(0) scale(1);
          transition: transform 300ms ease, filter 300ms ease;
          filter: drop-shadow(0 3px 2px rgba(0, 0, 0, 0.6)) drop-shadow(0 6px 8px rgba(0, 0, 0, 0.4));
          transform-origin: center bottom;
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
          transform: translateY(0) scale(1);
          filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.7)) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
        }

        .character-emoji.character-active {
          transform: translateY(0) scale(1.25);
          filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.7)) drop-shadow(0 8px 12px rgba(0, 0, 0, 0.5));
        }

        .character-glyph-active {
          animation: tiltFloat 1.5s ease-in-out infinite, glowPulse 0.95s ease-in-out infinite;
          will-change: transform, filter;
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
