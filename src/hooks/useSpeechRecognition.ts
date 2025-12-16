import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// #region Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
// #endregion

export type ListeningState = "idle" | "listening_for_wakeword" | "listening_for_command" | "listening_for_reply";

interface UseSpeechRecognitionOptions {
  wakeWord?: string;
  onResult?: (transcript: string) => void;
  onCommandStart?: () => void;
  onWakeWordDetected?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  isAISpeaking?: boolean;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [listeningState, setListeningState] = useState<ListeningState>("idle");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const replyWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wakeWord = options.wakeWord || "hey buddy";
  const isAISpeakingRef = useRef(options.isAISpeaking || false);

  console.log("[SpeechRecognition] useSpeechRecognition hook rendered/called");

  // Use a ref for state to avoid stale closures in event handlers
  const listeningStateRef = useRef(listeningState);
  
  // Update the ref whenever isAISpeaking changes
  useEffect(() => {
    isAISpeakingRef.current = options.isAISpeaking || false;
  }, [options.isAISpeaking]);

  useEffect(() => {
    listeningStateRef.current = listeningState;
  }, [listeningState]);

  // Ref to track the transcript from the last final result to avoid re-processing
  const lastFinalTranscript = useRef("");

  // Track if stop was intentional (to prevent auto-restart on onend)
  const isIntentionallyStopped = useRef(false);

  // Track if we've detected speech in the reply window (to keep accumulating text)
  const replyWindowSpeechDetectedRef = useRef(false);

  // Accumulate text during reply window (in case user speaks multiple phrases)
  const replyWindowTranscriptRef = useRef("");
  
  // Timeout to detect silence in reply window and auto-submit
  const replyWindowSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize callbacks to prevent unnecessary recreations
  const onResult = useMemo(() => options.onResult, [options.onResult]);
  const onCommandStart = useMemo(() => options.onCommandStart, [options.onCommandStart]);
  const onWakeWordDetected = useMemo(() => options.onWakeWordDetected, [options.onWakeWordDetected]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("[SpeechRecognition] NOT SUPPORTED - Browser does not support Web Speech API");
      console.log("[SpeechRecognition] window.SpeechRecognition:", window.SpeechRecognition);
      console.log("[SpeechRecognition] window.webkitSpeechRecognition:", window.webkitSpeechRecognition);
      setIsSupported(false);
      return;
    }

    console.log("[SpeechRecognition] ✓ Browser supports Web Speech API");
    setIsSupported(true);

    const recognition = new SpeechRecognition();
    console.log("[SpeechRecognition] Recognition instance created");

    // Set up ALL event handlers BEFORE configuring
    recognition.onstart = () => {
      console.log("[SpeechRecognition] ✓ onstart event - Service has started listening");
    };

    recognition.onspeechstart = () => {
      console.log("[SpeechRecognition] ✓ onspeechstart event - Audio/speech input detected");
    };

    recognition.onspeechend = () => {
      console.log("[SpeechRecognition] ✗ onspeechend event - Speech/audio has stopped being detected");
      
      // If we're in reply window and speech was detected, set a timeout to submit after silence
      if (listeningStateRef.current === "listening_for_reply" && replyWindowSpeechDetectedRef.current) {
        console.log("[SpeechRecognition] 🎙️ User stopped speaking, waiting 500ms to ensure we have final text...");
        
        // Clear any existing silence timeout
        if (replyWindowSilenceTimeoutRef.current) {
          clearTimeout(replyWindowSilenceTimeoutRef.current);
        }
        
        // Set a short timeout to allow final speech-to-text results to arrive
        replyWindowSilenceTimeoutRef.current = setTimeout(() => {
          const accumulatedText = replyWindowTranscriptRef.current.trim();
          if (accumulatedText) {
            console.log(`[SpeechRecognition] 🎙️ [onspeechend] Submitting accumulated text after silence: "${accumulatedText}"`);
            
            // Clear the reply window timeout since we're processing the response
            if (replyWindowTimeoutRef.current) {
              clearTimeout(replyWindowTimeoutRef.current);
              replyWindowTimeoutRef.current = null;
            }
            
            // Send the accumulated text
            onResult?.(accumulatedText);
            
            // Reset reply window state
            replyWindowSpeechDetectedRef.current = false;
            replyWindowTranscriptRef.current = "";
            lastFinalTranscript.current = "";
            setListeningState("listening_for_wakeword");
            recognitionRef.current?.stop();
          }
          replyWindowSilenceTimeoutRef.current = null;
        }, 500);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Concatenate all new transcripts since the last event
      let interimTranscript = "";
      let finalTranscript = "";

      console.log(`[SpeechRecognition] ✓ onresult event - resultIndex: ${event.resultIndex}, total results: ${event.results.length}`);

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        const isFinal = event.results[i].isFinal;

        console.log(
          `[SpeechRecognition]   → Result ${i}: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%, final: ${isFinal})`
        );

        if (isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        console.log(`[SpeechRecognition] 🎤 Interim (live): "${interimTranscript}"`);

        // Check for wake word in interim results too (for faster detection)
        if (listeningStateRef.current === "listening_for_wakeword") {
          const wakeWordLower = wakeWord.toLowerCase();
          const interimLower = interimTranscript.toLowerCase();
          if (interimLower.includes(wakeWordLower)) {
            console.log("[SpeechRecognition] 🎯 WAKE WORD DETECTED IN INTERIM!");
            onWakeWordDetected?.();
          }
        }
        
        // If in reply mode, accumulate interim text as well
        if (listeningStateRef.current === "listening_for_reply" && !isAISpeakingRef.current) {
          console.log(`[SpeechRecognition] 🎤 Reply mode - interim detected: "${interimTranscript}"`);
          if (!replyWindowSpeechDetectedRef.current) {
            console.log("[SpeechRecognition] 📍 First speech detected in reply window (interim), starting to accumulate...");
            replyWindowSpeechDetectedRef.current = true;
            
            // Clear the reply window timeout since we detected speech
            if (replyWindowTimeoutRef.current) {
              clearTimeout(replyWindowTimeoutRef.current);
              replyWindowTimeoutRef.current = null;
              console.log("[SpeechRecognition] ✓ Cleared reply window timeout (speech detected in interim)");
            }
          }
        }
      }

      if (finalTranscript) {
        console.log(`[SpeechRecognition] ✅ FINAL TEXT: "${finalTranscript}"`);

        // Skip if this is the same transcript we just processed
        if (finalTranscript === lastFinalTranscript.current) {
          console.log("[SpeechRecognition] ⏭️ Skipping duplicate final transcript");
          return;
        }

        lastFinalTranscript.current = finalTranscript;

        const currentState = listeningStateRef.current;
        console.log(`[SpeechRecognition] Current listening state: ${currentState}`);

        if (currentState === "listening_for_wakeword") {
          const wakeWordLower = wakeWord.toLowerCase();
          const finalLower = finalTranscript.toLowerCase();
          const wakeWordIndex = finalLower.indexOf(wakeWordLower);

          console.log(`[SpeechRecognition] Checking for wake word "${wakeWord}" in "${finalTranscript}"`);

          if (wakeWordIndex !== -1) {
            console.log("[SpeechRecognition] 🎯 WAKE WORD DETECTED!");
            // IMMEDIATELY stop recognition to prevent audio feedback when speech synthesis starts
            console.log("[SpeechRecognition] ⚠️ Stopping recognition immediately to prevent microphone feedback");
            onWakeWordDetected?.();
            isIntentionallyStopped.current = true;
            lastFinalTranscript.current = ""; // Reset for next cycle
            recognitionRef.current?.stop();

            const command = finalTranscript
              .substring(wakeWordIndex + wakeWord.length)
              .trim();

            if (command) {
              console.log(`[SpeechRecognition] 🎙️ Command with wake word: "${command}"`);
              onResult?.(command);
            } else {
              console.log("[SpeechRecognition] Wake word detected but no command yet. Waiting for command (2 second timeout)...");
              lastFinalTranscript.current = ""; // Reset for next cycle
              setListeningState("listening_for_command");
              onCommandStart?.();

              // Set a 2-second timeout to go back to continuous listening if no command is spoken
              if (commandTimeoutRef.current) {
                clearTimeout(commandTimeoutRef.current);
              }
              commandTimeoutRef.current = setTimeout(() => {
                console.log("[SpeechRecognition] ⏱️ Command timeout (2 seconds) - no speech after wake word. Going back to continuous listening...");
                setListeningState("listening_for_wakeword");
                isIntentionallyStopped.current = false;
                commandTimeoutRef.current = null;
                // Stop recognition to trigger onend handler which will auto-restart
                try {
                  recognitionRef.current?.stop();
                  console.log("[SpeechRecognition] ✓ Stopped recognition to return to continuous listening");
                } catch (error) {
                  console.error("[SpeechRecognition] Error stopping recognition:", error);
                }
              }, 2000);
            }
          } else {
            console.log(`[SpeechRecognition] Wake word not found. Continuing to listen...`);
          }
        } else if (currentState === "listening_for_command") {
          console.log(`[SpeechRecognition] 🎙️ Processing command: "${finalTranscript}"`);
          
          // Clear the timeout since we got a command
          if (commandTimeoutRef.current) {
            clearTimeout(commandTimeoutRef.current);
            commandTimeoutRef.current = null;
            console.log("[SpeechRecognition] ✓ Cleared command timeout (command received)");
          }
          
          onResult?.(finalTranscript);
          lastFinalTranscript.current = ""; // Reset for next cycle
          setListeningState("listening_for_wakeword");
          // Don't set intentionallyStopped - let it restart automatically for continuous listening
          recognitionRef.current?.stop();
        } else if (currentState === "listening_for_reply") {
          // Only process if AI is NOT currently speaking
          if (isAISpeakingRef.current) {
            console.log(`[SpeechRecognition] ⏸️ AI is still speaking, ignoring transcript: "${finalTranscript}"`);
            lastFinalTranscript.current = ""; // Reset for next cycle
            return;
          }

          console.log(`[SpeechRecognition] 🎙️ Detected speech in reply window: "${finalTranscript}"`);
          
          // Mark that we've detected speech and start accumulating
          if (!replyWindowSpeechDetectedRef.current) {
            console.log("[SpeechRecognition] 📍 First speech detected in reply window, starting to accumulate text...");
            replyWindowSpeechDetectedRef.current = true;
            
            // Clear the reply window timeout since we detected speech
            if (replyWindowTimeoutRef.current) {
              clearTimeout(replyWindowTimeoutRef.current);
              replyWindowTimeoutRef.current = null;
              console.log("[SpeechRecognition] ✓ Cleared reply window timeout (speech detected)");
            }
          }
          
          // Remove wake word from the transcript before accumulating
          const wakeWordLower = wakeWord.toLowerCase();
          const finalLower = finalTranscript.toLowerCase();
          const wakeWordIndex = finalLower.indexOf(wakeWordLower);
          
          let textToAccumulate = finalTranscript;
          if (wakeWordIndex !== -1) {
            // Remove the wake word and everything before it
            textToAccumulate = finalTranscript.substring(wakeWordIndex + wakeWord.length).trim();
            console.log(`[SpeechRecognition] 🚫 Removed wake word. Original: "${finalTranscript}" → Cleaned: "${textToAccumulate}"`);
          }
          
          // Only accumulate if there's text after removing the wake word
          if (textToAccumulate) {
            replyWindowTranscriptRef.current += (replyWindowTranscriptRef.current ? " " : "") + textToAccumulate;
            console.log(`[SpeechRecognition] 📝 Accumulated text so far: "${replyWindowTranscriptRef.current}"`);
          }
          lastFinalTranscript.current = ""; // Reset for next cycle
          
          // Set a timeout to submit the accumulated text after 1 second of no new final results
          // This allows us to capture multi-part speech before submitting
          if (replyWindowTimeoutRef.current) {
            clearTimeout(replyWindowTimeoutRef.current);
          }
          
          replyWindowTimeoutRef.current = setTimeout(() => {
            console.log("[SpeechRecognition] ⏱️ No new speech detected for 1 second, submitting accumulated text...");
            const accumulatedText = replyWindowTranscriptRef.current.trim();
            if (accumulatedText) {
              console.log(`[SpeechRecognition] 🎙️ Submitting reply: "${accumulatedText}"`);
              onResult?.(accumulatedText);
              
              // Reset reply window state
              replyWindowSpeechDetectedRef.current = false;
              replyWindowTranscriptRef.current = "";
              lastFinalTranscript.current = "";
              setListeningState("listening_for_wakeword");
              replyWindowTimeoutRef.current = null;
              recognitionRef.current?.stop();
            }
          }, 1000);
        }
      }
    };

    recognition.onend = () => {
      console.log("[SpeechRecognition] ✗ onend event - recognition service ended");
      const currentState = listeningStateRef.current;
      console.log(`[SpeechRecognition] Current state on end: ${currentState}`);

      // Fallback: If we're in reply mode and have accumulated text, send it
      // (in case onspeechend didn't fire reliably)
      if (currentState === "listening_for_reply" && replyWindowSpeechDetectedRef.current) {
        const accumulatedText = replyWindowTranscriptRef.current.trim();
        if (accumulatedText) {
          console.log(`[SpeechRecognition] 🎙️ [FALLBACK] User stopped talking in reply window. Sending accumulated text: "${accumulatedText}"`);
          
          // Clear the reply window timeout since we're processing the response
          if (replyWindowTimeoutRef.current) {
            clearTimeout(replyWindowTimeoutRef.current);
            replyWindowTimeoutRef.current = null;
          }
          
          // Send the accumulated text
          onResult?.(accumulatedText);
          
          // Reset reply window state
          replyWindowSpeechDetectedRef.current = false;
          replyWindowTranscriptRef.current = "";
          lastFinalTranscript.current = "";
          setListeningState("listening_for_wakeword");
          // Don't call stop() here since onend is already being called
          isIntentionallyStopped.current = false;
          return;
        }
      }

      // Auto-restart if we're not in idle state (for continuous listening)
      // The isIntentionallyStopped flag only prevents restart when user explicitly stops
      if (currentState !== "idle") {
        console.log("[SpeechRecognition] ↻ Restarting recognition service for continuous listening...");
        try {
          recognitionRef.current?.start();
          console.log("[SpeechRecognition] ✓ Recognition service restarted");
        } catch (error) {
          console.error("[SpeechRecognition] Failed to restart:", error);
        }
      } else {
        console.log("[SpeechRecognition] Recognition service stopped (user requested idle state)");
      }
      // Reset the intentionally stopped flag
      isIntentionallyStopped.current = false;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("[SpeechRecognition] ❌ ERROR EVENT:", event.error);
    };

    // NOW set configuration AFTER handlers are attached
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    console.log("[SpeechRecognition] Configuration set: continuous=true, interimResults=true, lang=en-US");

    recognitionRef.current = recognition;

    return () => {
      console.log("[SpeechRecognition] Cleanup: Cleaning up recognition instance");
      // Clear any pending restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      // Clear any pending command timeout
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current);
        commandTimeoutRef.current = null;
      }
      // Clear any pending reply window timeout
      if (replyWindowTimeoutRef.current) {
        clearTimeout(replyWindowTimeoutRef.current);
        replyWindowTimeoutRef.current = null;
      }
      // Clear any pending reply window silence timeout
      if (replyWindowSilenceTimeoutRef.current) {
        clearTimeout(replyWindowSilenceTimeoutRef.current);
        replyWindowSilenceTimeoutRef.current = null;
      }
      isIntentionallyStopped.current = false;
      lastFinalTranscript.current = "";
      replyWindowSpeechDetectedRef.current = false;
      replyWindowTranscriptRef.current = "";
      if (recognitionRef.current) {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onspeechstart = null;
        recognitionRef.current.onspeechend = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    console.log("[SpeechRecognition] startListening called");
    console.log(`[SpeechRecognition] Current state: ${listeningStateRef.current}, isSupported: ${isSupported}`);

    if (!recognitionRef.current) {
      console.error("[SpeechRecognition] ❌ Recognition instance not initialized!");
      return;
    }

    if (listeningStateRef.current !== "idle") {
      console.warn("[SpeechRecognition] ⚠️ Already listening, ignoring start request");
      return;
    }

    // Request microphone permission first
    console.log("[SpeechRecognition] 🎤 Requesting microphone permission with echo cancellation...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 16000
        }
      });
      console.log("[SpeechRecognition] ✓ Microphone permission granted with echo cancellation!");

      // Stop all tracks - we don't need the stream, we just needed permission
      stream.getTracks().forEach(track => {
        console.log(`[SpeechRecognition] Stopping track: ${track.kind}`);
        track.stop();
      });
    } catch (error) {
      console.error("[SpeechRecognition] ❌ Microphone permission denied or error:", error);
      return;
    }

    console.log("[SpeechRecognition] → Starting continuous listening for wake word...");
    isIntentionallyStopped.current = false;
    setListeningState("listening_for_wakeword");

    try {
      recognitionRef.current.start();
      console.log("[SpeechRecognition] ✓ start() method called successfully");
      console.log("[SpeechRecognition] 🎤 Waiting for onstart event...");
    } catch (error) {
      console.error("[SpeechRecognition] ❌ Error starting recognition:", error);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    console.log("[SpeechRecognition] stopListening called");
    console.log(`[SpeechRecognition] Current state: ${listeningStateRef.current}`);

    if (!recognitionRef.current) {
      console.error("[SpeechRecognition] Recognition instance not initialized!");
      return;
    }

    if (listeningStateRef.current === "idle") {
      console.warn("[SpeechRecognition] Already idle, ignoring stop request");
      return;
    }

    console.log("[SpeechRecognition] → Stopping listening...");
    isIntentionallyStopped.current = true;
    setListeningState("idle");

    // Clear any pending restart timeout when user manually stops
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Clear any pending command timeout when user manually stops
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }

    // Clear any pending reply window timeout when user manually stops
    if (replyWindowTimeoutRef.current) {
      clearTimeout(replyWindowTimeoutRef.current);
      replyWindowTimeoutRef.current = null;
    }

    // Clear any pending reply window silence timeout when user manually stops
    if (replyWindowSilenceTimeoutRef.current) {
      clearTimeout(replyWindowSilenceTimeoutRef.current);
      replyWindowSilenceTimeoutRef.current = null;
    }

    try {
      recognitionRef.current.stop();
      console.log("[SpeechRecognition] ✓ Recognition service stopped");
    } catch (error) {
      console.error("[SpeechRecognition] Error stopping recognition:", error);
    }
  }, []);

  const restartListeningAfterDelay = useCallback((delayMs: number = 500) => {
    console.log(`[SpeechRecognition] Scheduling recognition restart in ${delayMs}ms to prevent audio feedback`);
    // Clear any existing timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const enableReplyWindow = useCallback(() => {
    console.log("[SpeechRecognition] enableReplyWindow called - Switching to reply listening mode");
    console.log(`[SpeechRecognition] Current state: ${listeningStateRef.current}`);

    if (!recognitionRef.current) {
      console.error("[SpeechRecognition] Recognition instance not initialized!");
      return;
    }

    // Clear any existing reply window timeout
    if (replyWindowTimeoutRef.current) {
      clearTimeout(replyWindowTimeoutRef.current);
      replyWindowTimeoutRef.current = null;
    }

    // Clear any existing reply window silence timeout
    if (replyWindowSilenceTimeoutRef.current) {
      clearTimeout(replyWindowSilenceTimeoutRef.current);
      replyWindowSilenceTimeoutRef.current = null;
    }

    // Switch to reply listening mode (skip wake word requirement)
    console.log("[SpeechRecognition] 🎯 Entering reply window - user can speak without saying wake word");
    lastFinalTranscript.current = ""; // Reset transcript for this new window
    replyWindowSpeechDetectedRef.current = false; // Reset speech detection flag
    replyWindowTranscriptRef.current = ""; // Reset accumulated text
    setListeningState("listening_for_reply");

    // Set 2-second timeout to revert back to wake word mode
    replyWindowTimeoutRef.current = setTimeout(() => {
      console.log("[SpeechRecognition] ⏱️ Reply window timeout (2 seconds) - No speech detected. Reverting to wake word mode...");
      setListeningState("listening_for_wakeword");
      replyWindowTimeoutRef.current = null;
      // Stop recognition to trigger onend handler which will auto-restart
      try {
        recognitionRef.current?.stop();
        console.log("[SpeechRecognition] ✓ Stopped recognition to return to wake word mode");
      } catch (error) {
        console.error("[SpeechRecognition] Error stopping recognition:", error);
      }
    }, 2000);

    console.log("[SpeechRecognition] ⏱️ Reply window timer started (2 seconds)");
  }, []);

  return {
    isSupported,
    listeningState,
    startListening,
    stopListening,
    restartListeningAfterDelay,
    enableReplyWindow,
  };
}