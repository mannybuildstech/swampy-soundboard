(() => {
  // app.jsx
  var { useEffect, useMemo, useRef, useState, useCallback } = React;
  function SwampySoundboardPage() {
    const [activeScene, setActiveScene] = useState("scenes-beach");
    const [activeEmotionMelody, setActiveEmotionMelody] = useState(null);
    const [activeOneShots, setActiveOneShots] = useState(() => /* @__PURE__ */ new Set());
    const [manifest, setManifest] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [recordingUrl, setRecordingUrl] = useState(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [recordingSupported, setRecordingSupported] = useState(true);
    const sceneAudioRef = useRef(null);
    const emotionAudioRef = useRef(null);
    const audioCacheRef = useRef(/* @__PURE__ */ new Map());
    const activeOneShotInstancesRef = useRef(/* @__PURE__ */ new Map());
    const audioContextRef = useRef(null);
    const speakerGainRef = useRef(null);
    const recordingGainRef = useRef(null);
    const micGainRef = useRef(null);
    const mediaStreamDestRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const micStreamRef = useRef(null);
    const micSourceRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const previewAudioRef = useRef(null);
    useEffect(() => {
      if (typeof MediaRecorder === "undefined") {
        setRecordingSupported(false);
      }
    }, []);
    const ensureAudioContext = useCallback(() => {
      if (audioContextRef.current) {
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
        return audioContextRef.current;
      }
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const speakerGain = ctx.createGain();
      speakerGain.gain.value = 1;
      speakerGain.connect(ctx.destination);
      const recordingGain = ctx.createGain();
      recordingGain.gain.value = 0.4;
      const mediaStreamDest = ctx.createMediaStreamDestination();
      recordingGain.connect(mediaStreamDest);
      audioContextRef.current = ctx;
      speakerGainRef.current = speakerGain;
      recordingGainRef.current = recordingGain;
      mediaStreamDestRef.current = mediaStreamDest;
      return ctx;
    }, []);
    const connectAudioToGraph = useCallback((audio) => {
      const ctx = ensureAudioContext();
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(speakerGainRef.current);
        source.connect(recordingGainRef.current);
      } catch (e) {
      }
    }, [ensureAudioContext]);
    const startRecording = useCallback(async () => {
      try {
        const ctx = ensureAudioContext();
        await ctx.resume();
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        micStreamRef.current = micStream;
        const micGain = ctx.createGain();
        micGain.gain.value = 2;
        micGainRef.current = micGain;
        const micSource = ctx.createMediaStreamSource(micStream);
        micSource.connect(micGain);
        micGain.connect(recordingGainRef.current);
        micSourceRef.current = micSource;
        speakerGainRef.current.gain.setTargetAtTime(0.3, ctx.currentTime, 0.1);
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
        const recorder = new MediaRecorder(mediaStreamDestRef.current.stream, { mimeType });
        recordingChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordingChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordingChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordedBlob(blob);
          setRecordingUrl(url);
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
        if (recordingUrl) {
          URL.revokeObjectURL(recordingUrl);
        }
        setRecordedBlob(null);
        setRecordingUrl(null);
        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start recording:", err);
        setLoadError("Microphone access denied or unavailable.");
      }
    }, [ensureAudioContext, recordingUrl]);
    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      if (micGainRef.current) {
        micGainRef.current.disconnect();
        micGainRef.current = null;
      }
      if (micSourceRef.current) {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      if (audioContextRef.current && speakerGainRef.current) {
        speakerGainRef.current.gain.setTargetAtTime(1, audioContextRef.current.currentTime, 0.1);
      }
      stopAllAudio();
      setIsRecording(false);
    }, []);
    const togglePreview = useCallback(() => {
      if (isPreviewPlaying && previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
        setIsPreviewPlaying(false);
        return;
      }
      if (!recordingUrl) return;
      const audio = new Audio(recordingUrl);
      audio.addEventListener("ended", () => {
        setIsPreviewPlaying(false);
        previewAudioRef.current = null;
      }, { once: true });
      audio.play().catch(() => {
      });
      previewAudioRef.current = audio;
      setIsPreviewPlaying(true);
    }, [isPreviewPlaying, recordingUrl]);
    const saveRecording = useCallback(async () => {
      if (!recordedBlob) return;
      try {
        const arrayBuffer = await recordedBlob.arrayBuffer();
        const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
        const left = audioBuffer.getChannelData(0);
        const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;
        const sampleCount = left.length;
        const leftInt16 = new Int16Array(sampleCount);
        const rightInt16 = new Int16Array(sampleCount);
        for (let i = 0; i < sampleCount; i++) {
          leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
          rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
        }
        const mp3Data = [];
        const blockSize = 1152;
        for (let i = 0; i < sampleCount; i += blockSize) {
          const leftChunk = leftInt16.subarray(i, i + blockSize);
          const rightChunk = rightInt16.subarray(i, i + blockSize);
          const mp3buf = numChannels > 1 ? mp3encoder.encodeBuffer(leftChunk, rightChunk) : mp3encoder.encodeBuffer(leftChunk);
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
          }
        }
        const end = mp3encoder.flush();
        if (end.length > 0) {
          mp3Data.push(end);
        }
        const mp3Blob = new Blob(mp3Data, { type: "audio/mpeg" });
        const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const fileName = `swampy-recording-${timestamp}.mp3`;
        if (navigator.canShare && navigator.canShare({ files: [new File([mp3Blob], fileName, { type: "audio/mpeg" })] })) {
          const file = new File([mp3Blob], fileName, { type: "audio/mpeg" });
          try {
            await navigator.share({ files: [file], title: "Swampy Recording" });
          } catch (shareErr) {
            if (shareErr.name !== "AbortError") {
              const mp3Url = URL.createObjectURL(mp3Blob);
              window.open(mp3Url, "_blank");
            }
          }
        } else {
          const mp3Url = URL.createObjectURL(mp3Blob);
          const a = document.createElement("a");
          a.href = mp3Url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(mp3Url), 5e3);
        }
      } catch (err) {
        console.error("MP3 encoding failed, falling back to raw share:", err);
        const ext = recordedBlob.type.includes("mp4") ? "m4a" : "webm";
        const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const fileName = `swampy-recording-${timestamp}.${ext}`;
        const file = new File([recordedBlob], fileName, { type: recordedBlob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "Swampy Recording" }).catch(() => {
            window.open(recordingUrl, "_blank");
          });
        } else {
          const a = document.createElement("a");
          a.href = recordingUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    }, [recordedBlob, recordingUrl]);
    const redoRecording = useCallback(() => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (recordingUrl) {
        URL.revokeObjectURL(recordingUrl);
      }
      setRecordedBlob(null);
      setRecordingUrl(null);
      setIsPreviewPlaying(false);
    }, [recordingUrl]);
    useEffect(() => {
      const loadManifest = async () => {
        try {
          const response = await fetch("./audio-assets/manifest.json", { cache: "no-store" });
          if (!response.ok) {
            throw new Error(`Failed to load manifest (${response.status})`);
          }
          const data = await response.json();
          setManifest(data);
        } catch (error) {
          setLoadError(error instanceof Error ? error.message : "Unable to load audio assets.");
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
      setActiveOneShots(/* @__PURE__ */ new Set());
    };
    useEffect(() => {
      return () => {
        stopAllAudio();
      };
    }, []);
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) {
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
          setActiveOneShots(/* @__PURE__ */ new Set());
        } else {
          if (sceneAudioRef.current) {
            sceneAudioRef.current.play().catch(() => {
            });
          }
        }
      };
      const handlePageHide = () => {
        stopAllAudio();
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handlePageHide);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
      };
    }, []);
    const sectionData = useMemo(() => {
      if (!manifest) {
        return {
          actions: [],
          characters: [],
          emotionsMelodies: [],
          scenes: []
        };
      }
      const normalize = (folder, items = []) => items.map((item) => ({
        id: `${folder}-${item.id}`,
        label: item.label,
        emoji: item.emoji || "\u2728",
        image: item.image ? `./audio-assets/${folder}/${item.image}` : null,
        src: `./audio-assets/${folder}/${item.audio}`
      }));
      const normalizeCharacters = (items = []) => items.map((item) => ({
        id: `characters-${item.id}`,
        label: item.label,
        emoji: item.emoji || "\u2728",
        image: item.image ? `./animal-images/${item.image}` : null,
        src: `./audio-assets/characters/${item.audio}`
      }));
      const normalizeScenes = (items = []) => items.map((item) => ({
        id: `scenes-${item.id}`,
        label: item.label,
        emoji: item.emoji || "\u2728",
        image: item.image ? `./scenes/${item.image}` : null,
        src: `./audio-assets/scenes/${item.audio}`
      }));
      return {
        actions: normalize("actions", manifest.actions),
        characters: normalizeCharacters(manifest.characters),
        emotionsMelodies: normalize("emotions-melodies", manifest["emotions-melodies"]),
        scenes: normalizeScenes(manifest.scenes)
      };
    }, [manifest]);
    useEffect(() => {
      const allSounds = [
        ...sectionData.actions,
        ...sectionData.characters,
        ...sectionData.emotionsMelodies,
        ...sectionData.scenes
      ];
      allSounds.forEach((sound) => {
        if (!audioCacheRef.current.has(sound.id)) {
          const audio = new Audio(sound.src);
          audio.preload = "auto";
          audio.load();
          audioCacheRef.current.set(sound.id, audio);
        }
      });
    }, [sectionData]);
    const normalizeLabel = (value) => value.toLowerCase();
    const characterScaleMap = {
      "characters-alligator": 1.4,
      "characters-cardinal": 0.7,
      "characters-coyote": 1.1,
      "characters-crane": 1.2,
      "characters-panther": 1.15
    };
    const sceneThemeMap = {
      beach: {
        borderColor: "#3b82f6"
      },
      "oak-forest": {
        borderColor: "#92400e"
      },
      "pine-forest": {
        borderColor: "#14532d"
      },
      reef: {
        borderColor: "#1e3a8a"
      },
      spring: {
        borderColor: "#0ea5e9"
      },
      default: {
        borderColor: "#f97316"
      }
    };
    const activeSceneItem = sectionData.scenes.find((scene) => scene.id === activeScene);
    const activeSceneLabel = activeSceneItem == null ? void 0 : activeSceneItem.label;
    const activeSceneImage = activeSceneItem == null ? void 0 : activeSceneItem.image;
    const currentSceneTheme = activeSceneLabel ? sceneThemeMap[activeSceneItem.id.replace("scenes-", "")] || sceneThemeMap.default : null;
    const vibrateTap = () => {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(35);
      }
    };
    const buildPlaybackAudio = (sound, { loop = false } = {}) => {
      const audio = new Audio(sound.src);
      audio.preload = "auto";
      audio.loop = loop;
      audio.currentTime = 0;
      ensureAudioContext();
      connectAudioToGraph(audio);
      return audio;
    };
    const triggerOneShot = (sound) => {
      vibrateTap();
      const audio = buildPlaybackAudio(sound);
      const instances = activeOneShotInstancesRef.current.get(sound.id) || /* @__PURE__ */ new Set();
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
      audio.addEventListener("ended", clearActiveState, { once: true });
      audio.addEventListener("pause", clearActiveState, { once: true });
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
      nextAudio.play().catch(() => {
      });
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
      nextAudio.play().catch(() => {
      });
      sceneAudioRef.current = nextAudio;
      setActiveScene(scene.id);
    };
    const storyGroundRef = useRef(null);
    const stageRef = useRef(null);
    const touchRef = useRef({ startX: 0, startY: 0, scrollLeft: 0, isSwiping: false });
    const scrollCharacters = (direction) => {
      if (storyGroundRef.current) {
        const scrollAmount = storyGroundRef.current.offsetWidth * 0.6;
        storyGroundRef.current.scrollBy({ left: direction === "right" ? scrollAmount : -scrollAmount, behavior: "smooth" });
      }
    };
    const handleStageTouchStart = (e) => {
      if (!storyGroundRef.current) return;
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        scrollLeft: storyGroundRef.current.scrollLeft,
        isSwiping: false
      };
    };
    const handleStageTouchMove = (e) => {
      if (!storyGroundRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchRef.current.startX;
      const deltaY = touch.clientY - touchRef.current.startY;
      if (!touchRef.current.isSwiping) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          touchRef.current.isSwiping = true;
        } else {
          return;
        }
      }
      e.preventDefault();
      storyGroundRef.current.scrollLeft = touchRef.current.scrollLeft - deltaX;
    };
    return /* @__PURE__ */ React.createElement(
      "main",
      {
        className: `relative h-full w-full overflow-hidden p-0 ${isRecording ? "recording-border" : ""}`,
        style: {
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "#1a1a1a"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "relative flex h-full w-full flex-col gap-1 p-2 sm:gap-2 sm:p-3",
          style: { backgroundColor: "transparent" }
        },
        /* @__PURE__ */ React.createElement("header", { className: "top-bar" }, /* @__PURE__ */ React.createElement("h1", { className: "top-bar-title", style: { color: "#d4a054" } }, "Junior Recording Station"), recordingSupported && !recordedBlob && !isRecording && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: startRecording,
            className: "record-button",
            "aria-label": "Start recording",
            title: "Record"
          },
          /* @__PURE__ */ React.createElement("span", { className: "record-dot" })
        ), isRecording && /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: stopRecording,
            className: "record-button recording-active",
            "aria-label": "Stop recording",
            title: "Stop recording"
          },
          /* @__PURE__ */ React.createElement("span", { className: "record-stop-icon" })
        ), recordedBlob && !isRecording && /* @__PURE__ */ React.createElement("div", { className: "recording-toolbar" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: togglePreview,
            className: "toolbar-btn toolbar-play",
            "aria-label": isPreviewPlaying ? "Pause preview" : "Play preview"
          },
          isPreviewPlaying ? "\u23F8" : "\u25B6"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: saveRecording,
            className: "toolbar-btn toolbar-save",
            "aria-label": "Save recording"
          },
          "\u{1F4BE}"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: redoRecording,
            className: "toolbar-btn toolbar-redo",
            "aria-label": "Discard and re-record"
          },
          "\u{1F504}"
        ))),
        loadError && /* @__PURE__ */ React.createElement("section", { className: "rounded-2xl border-2 border-red-700/50 bg-red-100 p-2 text-xs font-bold text-red-800 sm:text-sm" }, loadError),
        /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 min-h-0 gap-1 sm:gap-2" }, /* @__PURE__ */ React.createElement("aside", { className: "col-panel" }, /* @__PURE__ */ React.createElement("div", { className: "col-scroller", style: { gridTemplateRows: `repeat(${Math.max(sectionData.actions.length, 1)}, minmax(0, 1fr))` } }, sectionData.actions.map((action) => {
          const isActive = activeOneShots.has(action.id);
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: action.id,
              type: "button",
              onClick: () => triggerOneShot(action),
              className: "pill-button text-white"
            },
            /* @__PURE__ */ React.createElement("p", { className: `emoji-glyph font-bold ${isActive ? "emoji-sound-active" : ""}` }, action.image ? /* @__PURE__ */ React.createElement("img", { src: action.image, alt: action.label, className: "inline-block h-[1em] w-[1em] object-contain" }) : action.emoji)
          );
        }))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-1 min-h-0 min-w-0 flex-col gap-1 sm:gap-2" }, /* @__PURE__ */ React.createElement(
          "section",
          {
            ref: stageRef,
            className: "row-panel story-canvas",
            style: {
              backgroundColor: "#2d6a4f",
              backgroundImage: activeSceneImage ? `url(${activeSceneImage})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "bottom center",
              transition: "background-image 400ms ease, border-color 400ms ease",
              borderColor: currentSceneTheme ? currentSceneTheme.borderColor : "rgba(180, 120, 60, 0.5)",
              position: "relative"
            }
          },
          /* @__PURE__ */ React.createElement("div", { className: "scene-darkener" }),
          /* @__PURE__ */ React.createElement("div", { className: "storybook-ground-wrapper", style: { position: "relative", zIndex: 1 } }, /* @__PURE__ */ React.createElement("button", { className: "scroll-arrow scroll-arrow-left", "aria-label": "Scroll left", onClick: () => scrollCharacters("left") }, "\u2039"), /* @__PURE__ */ React.createElement("button", { className: "scroll-arrow scroll-arrow-right", "aria-label": "Scroll right", onClick: () => scrollCharacters("right") }, "\u203A"), /* @__PURE__ */ React.createElement(
            "div",
            {
              ref: storyGroundRef,
              className: "storybook-ground",
              onTouchStart: handleStageTouchStart,
              onTouchMove: handleStageTouchMove,
              style: { gridTemplateColumns: `repeat(${sectionData.characters.length}, 25%)`, touchAction: "pan-y" }
            },
            sectionData.characters.map((character) => {
              const isActive = activeOneShots.has(character.id);
              const scale = characterScaleMap[character.id] || 1;
              return /* @__PURE__ */ React.createElement(
                "button",
                {
                  key: character.id,
                  "aria-label": character.label,
                  onClick: () => triggerOneShot(character),
                  className: `character-emoji ${isActive ? "character-active" : ""}`,
                  style: { fontSize: `calc(clamp(4rem, min(18vw, 22vh), 13rem) * ${scale})` }
                },
                /* @__PURE__ */ React.createElement("span", { className: `character-glyph ${isActive ? "character-glyph-active" : ""}` }, character.image ? /* @__PURE__ */ React.createElement("img", { src: character.image, alt: character.label, className: "inline-block h-[1em] w-[1em] object-contain" }) : character.emoji)
              );
            })
          ))
        ), /* @__PURE__ */ React.createElement("section", { className: "row-panel ambient-row" }, /* @__PURE__ */ React.createElement("div", { className: "scene-row", style: { gridTemplateColumns: `repeat(${Math.max(sectionData.scenes.length, 1)}, minmax(0, 1fr))` } }, sectionData.scenes.map((scene) => {
          const isSelected = activeScene === scene.id;
          const isDimmed = activeScene && !isSelected;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: scene.id,
              type: "button",
              onClick: () => changeEnvironment(scene),
              className: "scene-button"
            },
            /* @__PURE__ */ React.createElement(
              "img",
              {
                src: scene.image,
                alt: scene.label,
                className: `scene-img ${isSelected ? "scene-img-active" : ""} ${isDimmed ? "scene-img-dimmed" : ""}`
              }
            )
          );
        })))), /* @__PURE__ */ React.createElement("aside", { className: "col-panel" }, /* @__PURE__ */ React.createElement("div", { className: "col-scroller", style: { gridTemplateRows: `repeat(${Math.max(sectionData.emotionsMelodies.length, 1)}, minmax(0, 1fr))` } }, sectionData.emotionsMelodies.map((emotion) => {
          const isActive = activeEmotionMelody === emotion.id;
          return /* @__PURE__ */ React.createElement(
            "button",
            {
              key: emotion.id,
              type: "button",
              onClick: () => toggleEmotionMelody(emotion),
              className: "pill-button text-white"
            },
            /* @__PURE__ */ React.createElement("p", { className: `emoji-glyph ${isActive ? "emoji-sound-active" : ""}` }, emotion.image ? /* @__PURE__ */ React.createElement("img", { src: emotion.image, alt: emotion.label, className: "inline-block h-[1em] w-[1em] object-contain" }) : emotion.emoji)
          );
        }))))
      ),
      /* @__PURE__ */ React.createElement("style", null, `
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
          height: calc(100% / 4);
          border-radius: 1rem;
          background: transparent;
          overflow: hidden;
        }

        .top-bar {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          border-radius: 1rem;
          padding: 0.15rem 0.75rem;
          background: transparent;
          border: none;
          overflow: hidden;
        }

        .top-bar-title {
          font-size: clamp(0.7rem, 2.5vw, 1.25rem);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
          line-height: 1;
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
          background: #2e2e2e;
        }

        .emoji-glyph {
          font-size: clamp(1.2rem, min(5vw, 5vh), 4rem);
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
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
          border-radius: 1rem;
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
          filter: brightness(0.35);
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

        /* Recording UI styles */
        .record-button {
          width: 2.25rem;
          height: 2.25rem;
          flex-shrink: 0;
          border-radius: 50%;
          background: #1a1a1a;
          border: 3px solid #666;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 150ms ease, box-shadow 150ms ease, border-color 300ms ease;
        }

        .record-button:active {
          transform: scale(0.9);
        }

        .record-button.recording-active {
          border-color: #dc2626;
          animation: recordingPulse 1.2s ease-in-out infinite;
        }

        .record-dot {
          width: 0.9rem;
          height: 0.9rem;
          border-radius: 50%;
          background: #dc2626;
        }

        .record-stop-icon {
          width: 0.75rem;
          height: 0.75rem;
          border-radius: 2px;
          background: #dc2626;
        }

        @keyframes recordingPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4), 0 4px 10px rgba(0, 0, 0, 0.3);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(220, 38, 38, 0), 0 4px 10px rgba(0, 0, 0, 0.3);
          }
        }

        .recording-toolbar {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .toolbar-btn {
          width: 2rem;
          height: 2rem;
          flex-shrink: 0;
          border-radius: 50%;
          border: 2px solid #555;
          background: #2e2e2e;
          color: white;
          font-size: 0.85rem;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: transform 150ms ease, background 150ms ease;
        }

        .toolbar-btn:active {
          transform: scale(0.9);
          background: #444;
        }

        .toolbar-play {
          border-color: #22c55e;
        }

        .toolbar-save {
          border-color: #3b82f6;
        }

        .toolbar-redo {
          border-color: #f59e0b;
        }

        /* Recording indicator border on the main area */
        .recording-border {
          box-shadow: inset 0 0 0 3px rgba(220, 38, 38, 0.6);
          animation: recordingBorderPulse 1.5s ease-in-out infinite;
        }

        @keyframes recordingBorderPulse {
          0%, 100% { box-shadow: inset 0 0 0 3px rgba(220, 38, 38, 0.3); }
          50% { box-shadow: inset 0 0 0 3px rgba(220, 38, 38, 0.7); }
        }
      `)
    );
  }
  ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(SwampySoundboardPage, null));
})();
