import { useEffect, useRef } from "react";
import { useGameStore } from "../state/useGameStore.js";

const AMBIENT_AUDIO_URL = "/audio/ambient-forest.mp3";

export function AudioSystem() {
  const audioReady = useGameStore((state) => state.audioReady);
  const setAudioController = useGameStore((state) => state.setAudioController);
  const ambientRef = useRef(null);
  const contextRef = useRef(null);

  useEffect(() => {
    if (!audioReady || contextRef.current) return;

    const context = new window.AudioContext();
    contextRef.current = context;

    const controller = {
      context,
      async playOneShot(url, volume = 0.7) {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await context.decodeAudioData(arrayBuffer);
          const source = context.createBufferSource();
          const gain = context.createGain();
          gain.gain.value = volume;
          source.buffer = buffer;
          source.connect(gain).connect(context.destination);
          source.start(0);
        } catch (error) {
          console.warn("Audio playback failed", error);
        }
      },
    };

    setAudioController(controller);

    const startAmbient = async () => {
      try {
        const response = await fetch(AMBIENT_AUDIO_URL);
        const buffer = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(buffer);
        const ambientSource = context.createBufferSource();
        const gain = context.createGain();
        gain.gain.value = 0.35;
        ambientSource.buffer = decoded;
        ambientSource.loop = true;
        ambientSource.connect(gain).connect(context.destination);
        ambientSource.start(0);
        ambientRef.current = ambientSource;
      } catch (error) {
        console.warn("Ambient audio failed", error);
      }
    };

    startAmbient();

    return () => {
      if (ambientRef.current) {
        ambientRef.current.stop();
      }
      context.close();
      contextRef.current = null;
    };
  }, [audioReady, setAudioController]);

  return null;
}
