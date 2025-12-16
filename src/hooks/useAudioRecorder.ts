import { useCallback, useRef, useState } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isSupported = (() => {
    try {
      if (typeof navigator === "undefined") return false;
      const hasMediaDevices = !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
      const hasMediaRecorder = typeof (window as any).MediaRecorder !== "undefined";
      const supported = Boolean(hasMediaDevices && hasMediaRecorder);
      // Debug: report feature detection details
      // eslint-disable-next-line no-console
      console.debug("useAudioRecorder: feature-detect", { hasMediaDevices, hasMediaRecorder, supported });
      return supported;
    } catch {
      // eslint-disable-next-line no-console
      console.debug("useAudioRecorder: feature-detect threw an error");
      return false;
    }
  })();

  const startRecording = useCallback(async () => {
    // Debug
    // eslint-disable-next-line no-console
    console.debug("useAudioRecorder.startRecording: called, isSupported=", isSupported);
    if (!isSupported) throw new Error("Recording not supported in this browser");

    // request microphone
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("useAudioRecorder.startRecording: getUserMedia failed", err);
      throw err;
    }
    streamRef.current = stream;

    // Choose a mime type that's widely supported; Firefox supports audio/webm (opus)
    const mimeType = ["audio/webm", "audio/ogg;codecs=opus", "audio/wav"].find((t) => {
      try {
        return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t);
      } catch {
        return false;
      }
    }) || "audio/webm";

    // Debug
    // eslint-disable-next-line no-console
    console.debug("useAudioRecorder.startRecording: chosen mimeType=", mimeType, "streamTracks=", stream.getTracks().map(t => ({kind: t.kind, label: t.label}))); 

    const recorder = new MediaRecorder(stream, { mimeType } as MediaRecorderOptions);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      // eslint-disable-next-line no-console
      console.debug("useAudioRecorder.ondataavailable: data size=", e.data?.size);
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstart = () => setIsRecording(true);
    recorder.onstop = () => setIsRecording(false);

    mediaRecorderRef.current = recorder;
    recorder.start();
    // eslint-disable-next-line no-console
    console.debug("useAudioRecorder.startRecording: recorder started", { state: recorder.state });
    return;
  }, [isSupported]);

  const stopRecording = useCallback(async (): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      // eslint-disable-next-line no-console
      console.debug("useAudioRecorder.stopRecording: called, recorder=", !!recorder);
      if (!recorder) return reject(new Error("No active recorder"));

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });

        // Debug: blob info
        // eslint-disable-next-line no-console
        console.debug("useAudioRecorder.onstop: blob created", { size: blob.size, type: blob.type, chunks: chunksRef.current.length });

        // stop all tracks
        try {
          streamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}

        mediaRecorderRef.current = null;
        streamRef.current = null;
        chunksRef.current = [];

        setIsRecording(false);
        resolve(blob);
      };

      try {
        recorder.stop();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("useAudioRecorder.stopRecording: recorder.stop threw", e);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }, []);

  const cancelRecording = useCallback(() => {
    // eslint-disable-next-line no-console
    console.debug("useAudioRecorder.cancelRecording: called");
    try {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("useAudioRecorder.cancelRecording: error while stopping", err);
    }
    mediaRecorderRef.current = null;
    streamRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
  } as const;
}
