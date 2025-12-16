import { useState, useCallback, useRef, useEffect } from "react";

// This hook uses ElevenLabs TTS when an API key and voice id are provided
// via environment variables. If not available it falls back to
// the browser `speechSynthesis` API.
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ELEVEN_API_KEY = (import.meta.env.VITE_ELEVENLABS_KEY as string) || "";
  const ELEVEN_VOICE = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string) || "";

  useEffect(() => {
    // Consider supported if either ElevenLabs config is present or browser TTS exists
    const browserSupported = "speechSynthesis" in window;
    setIsSupported(Boolean(browserSupported || (ELEVEN_API_KEY && ELEVEN_VOICE)));
    return () => {
      // cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = useCallback(
    async (text: string, voiceSpeed: number = 1) => {
      if (!text) return;

      // If ElevenLabs is configured, use it
      if (ELEVEN_API_KEY && ELEVEN_VOICE) {
        try {
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;

          setIsSpeaking(true);

          const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
            ELEVEN_VOICE
          )}`;

          const body = {
            text,
            // You can expose additional options here (voice settings)
          };

          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": ELEVEN_API_KEY,
              Accept: "audio/mpeg",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`ElevenLabs TTS failed: ${resp.status} ${errText}`);
          }

          const arrayBuffer = await resp.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
          const objectUrl = URL.createObjectURL(blob);

          // cleanup previous audio
          if (audioRef.current) {
            audioRef.current.pause();
            URL.revokeObjectURL(audioRef.current.src);
            audioRef.current.src = "";
          }

          const audio = new Audio(objectUrl);
          audioRef.current = audio;
          
          // Apply voice speed to audio playback
          audio.playbackRate = voiceSpeed;

          audio.onended = () => {
            setIsSpeaking(false);
            try {
              URL.revokeObjectURL(objectUrl);
            } catch {}
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            try {
              URL.revokeObjectURL(objectUrl);
            } catch {}
          };

          // play
          await audio.play();
        } catch (e) {
          console.error("ElevenLabs speak error:", e);
          setIsSpeaking(false);
        } finally {
          abortRef.current = null;
        }

        return;
      }

      // Fallback to browser TTS
      if (!("speechSynthesis" in window)) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSpeed;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium")
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [ELEVEN_API_KEY, ELEVEN_VOICE]
  );

  const stop = useCallback(() => {
    // Abort ElevenLabs request or stop playback
    abortRef.current?.abort();
    abortRef.current = null;

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch {}
      audioRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
  };
}
