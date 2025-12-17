import { useCallback, useEffect, useState, useRef } from "react";
import { GraduationCap, Settings } from "lucide-react";
import { useHomeworkHacker } from "@/hooks/useStudyBuddy";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useSettings } from "@/hooks/useSettings";
import { useUserMicControl } from "@/hooks/useUserMicControl";
import { VoiceButton } from "./VoiceButton";
import { AudioWave } from "./AudioWave";
import { ChatInterface } from "./ChatInterface";
import { ScreenCaptureToggle } from "./ScreenCaptureToggle";
import { PersonalityToggle } from "./PersonalityToggle";
import { SettingsModal } from "../Settings/SettingsModal";
import { MuteToggle } from "./MuteToggle";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PhoneDetector from "../PhoneDetection"; // Import PhoneDetector

export function HomeworkHackerApp() {
  const [showWakeWordUI, setShowWakeWordUI] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem("isMuted");
    return saved ? JSON.parse(saved) : false;
  });
  const [isTextInputActive, setIsTextInputActive] = useState(false);
  const [debugMode, setDebugMode] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem("debugMode");
    return saved ? JSON.parse(saved) : false;
  });
  const [personality, setPersonalityState] = useState<"neutral" | "sarcastic">(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem("personality");
    return (saved as "neutral" | "sarcastic") || "neutral";
  });
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const lastMutedMessageIdRef = useRef<string | null>(null); // Track messages skipped due to mute
  const screenStateRef = useRef({ hasPermission: false, isEnabled: false });
  const screenRecordingTriggeredRef = useRef<string | null>(null);

  // Initialize user mic control - tracks whether user explicitly turned mic on/off
  const {
    userMicEnabled,
    toggleMicByUser,
    isUserMicDisabled,
    isUserMicEnabled,
    clearUserIntention,
  } = useUserMicControl();

  console.log("[HomeworkHacker] App render");
  
  // Save debug mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("debugMode", JSON.stringify(debugMode));
  }, [debugMode]);

  // Save mute state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("isMuted", JSON.stringify(isMuted));
  }, [isMuted]);

  // Save personality to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("personality", personality);
  }, [personality]);
  
  // Load settings
  const { settings, isLoaded, updateUserName, updateVoiceSpeed, updateVolume, resetSettings } = useSettings();

  const {
    messages,
    isLoading,
    personality: aiPersonality,
    setPersonality: setAiPersonality,
    sendMessage,
    sendAIPromptWithoutUserMessage,
    sendMockMessage,
    clearMessages,
  } = useHomeworkHacker({ personality: personality, userName: settings.userName });

  // Sync personality state with AI hook
  const handlePersonalityChange = (newPersonality: "neutral" | "sarcastic") => {
    setPersonalityState(newPersonality);
    setAiPersonality(newPersonality);
  };

  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis(settings.volume);

  const {
    hasPermission: hasScreenPermission,
    isEnabled: isScreenEnabled,
    isCapturing,
    requestPermission: requestScreenPermission,
    captureScreenshot,
    toggleEnabled: toggleScreenCapture,
  } = useScreenCapture();

  console.log("[HomeworkHacker] Screen state from hook:", {
    hasScreenPermission,
    isScreenEnabled,
    isCapturing,
  });

  // Keep ref in sync with screen capture state
  useEffect(() => {
    screenStateRef.current = { hasPermission: hasScreenPermission, isEnabled: isScreenEnabled };
    console.log("[HomeworkHacker] Screen state ref UPDATED:", screenStateRef.current);
  }, [hasScreenPermission, isScreenEnabled]);

  // Stop speaking when the page reloads or component unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const handleVoiceResult = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;
      
      console.log("[HomeworkHacker] ========================================");
      console.log("[HomeworkHacker] ✅ VOICE INPUT RECEIVED");
      console.log("[HomeworkHacker] handleVoiceResult() called");
      console.log("[HomeworkHacker] Transcript:", transcript);
      console.log("[HomeworkHacker] Debug Mode:", debugMode);
      console.log("[HomeworkHacker] Current debugMode state:", debugMode ? "✅ TRUE" : "❌ FALSE");
      console.log("[HomeworkHacker] Screen capture status (from state):");
      console.log("[HomeworkHacker]   - isScreenEnabled:", isScreenEnabled);
      console.log("[HomeworkHacker]   - hasScreenPermission:", hasScreenPermission);
      console.log("[HomeworkHacker] Screen capture status (from ref - SHOULD BE CURRENT):");
      console.log("[HomeworkHacker]   - ref.isEnabled:", screenStateRef.current.isEnabled);
      console.log("[HomeworkHacker]   - ref.hasPermission:", screenStateRef.current.hasPermission);
      console.log("[HomeworkHacker]   - isCapturing:", isCapturing);
      
      setShowWakeWordUI(true);
      
      let screenshot: string | null = null;
      
      // Use ref values since they're more reliable in callbacks
      if (!debugMode && screenStateRef.current.isEnabled && screenStateRef.current.hasPermission) {
        console.log("[HomeworkHacker] ► SCREEN CAPTURE IS ENABLED, ATTEMPTING TO CAPTURE...");
        try {
          screenshot = await captureScreenshot();
          
          if (screenshot) {
            const screenshotSizeKB = (screenshot.length / 1024).toFixed(2);
            console.log("[HomeworkHacker] ✓✓✓ SCREENSHOT CAPTURED SUCCESSFULLY ✓✓✓");
            console.log("[HomeworkHacker] Screenshot size:", screenshotSizeKB, "KB");
            console.log("[HomeworkHacker] Screenshot will be sent with message");
          } else {
            console.warn("[HomeworkHacker] ⚠ captureScreenshot() returned NULL");
          }
        } catch (error) {
          console.error("[HomeworkHacker] ✗ Error capturing screenshot:", error);
        }
      } else {
        if (debugMode) {
          console.log("[HomeworkHacker] Debug mode enabled - skipping screenshot");
        } else {
          console.log("[HomeworkHacker] Screen capture is DISABLED");
          console.log("[HomeworkHacker]   - Using ref values: isEnabled:", screenStateRef.current.isEnabled, "hasPermission:", screenStateRef.current.hasPermission);
        }
      }
      
      console.log("[HomeworkHacker] ► Sending message...");
      console.log("[HomeworkHacker]   - Text: \"" + transcript + "\"");
      console.log("[HomeworkHacker]   - With screenshot:", !!screenshot);
      console.log("[HomeworkHacker]   - Debug Mode:", debugMode);
      console.log("[HomeworkHacker] ========================================");
      
      if (debugMode) {
        console.log("[HomeworkHacker] 🎮 DEBUG MODE ACTIVE - Using mock message instead of Gemini API");
        console.log("[HomeworkHacker] Calling sendMockMessage()...");
        sendMockMessage(transcript);
      } else {
        console.log("[HomeworkHacker] 🌐 NORMAL MODE - Sending to Gemini API");
        console.log("[HomeworkHacker] Calling sendMessage()...");
        sendMessage(transcript, screenshot ? [screenshot] : null);
      }
    },
    [isScreenEnabled, hasScreenPermission, captureScreenshot, sendMessage, sendMockMessage, isCapturing, debugMode]
  );

  const {
    isSupported: isVoiceSupported,
    listeningState,
    startListening,
    stopListening,
    pauseRecognition,
    restartListeningAfterDelay,
    enableReplyWindow,
  } = useSpeechRecognition({
    wakeWord: "hey buddy",
    isAISpeaking: isSpeaking,
    isUserMicDisabled: isUserMicDisabled(), // Pass user mic disabled state
    isUserMicEnabled: isUserMicEnabled(), // Pass user mic enabled state
    onResult: handleVoiceResult,
    onCommandStart: () => {
      setShowWakeWordUI(false); // Hide wake word UI when command is being spoken
      toast({
        title: "Wake word detected!",
        description: "Listening for your command.",
      });
    },
    onWakeWordDetected: () => {
      stopSpeaking(); // Stop any ongoing speech synthesis when wake word is detected
    },
  });

  // Pause recognition when AI starts speaking to prevent echo/feedback
  useEffect(() => {
    if (isSpeaking) {
      console.log("[HomeworkHacker] 🔊 AI started speaking - pausing microphone to prevent echo");
      pauseRecognition();
    }
  }, [isSpeaking, pauseRecognition]);

  // Bypass mute during scolding - check last message type instead of flag
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isScolding = lastMessage?.role === "assistant" && lastMessage?.type === "scolding";
    
    if (isMuted && !isScolding) {
      stopSpeaking();
    }
  }, [isMuted, stopSpeaking, messages]);

  // Speak the latest assistant message (skipping if muted, unless it's a scolding message)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isScolding = lastMessage?.type === "scolding";
    
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.content &&
      !isLoading &&
      !isSpeaking &&
      lastMessage.id !== lastSpokenMessageIdRef.current
    ) {
      // If muted and not scolding, track that we skipped this message
      if (isMuted && !isScolding) {
        lastMutedMessageIdRef.current = lastMessage.id;
        return;
      }
      
      // Don't speak if this message was already skipped due to mute
      if (lastMessage.id === lastMutedMessageIdRef.current) {
        return;
      }
      
      lastSpokenMessageIdRef.current = lastMessage.id;
      speak(lastMessage.content, settings.voiceSpeed);
    }
  }, [messages, isLoading, isSpeaking, speak, settings.voiceSpeed, isMuted]);

  // When AI finishes speaking, enable the reply window (allow instant replies for 2 seconds)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      !isLoading &&
      !isSpeaking &&
      lastSpokenMessageIdRef.current === lastMessage.id
    ) {
      console.log("[HomeworkHacker] 🎯 AI finished speaking, enabling reply window...");
      enableReplyWindow();
    }
  }, [isSpeaking, isLoading, messages, enableReplyWindow]);

  // Auto-trigger screen recording when AI suggests it
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.content &&
      lastMessage.id !== screenRecordingTriggeredRef.current
    ) {
      // Check if the message contains the trigger phrase
      if (lastMessage.content.toLowerCase().includes("turn on screen recording")) {
        screenRecordingTriggeredRef.current = lastMessage.id;
        
        console.log("[HomeworkHacker] 🎥 Auto-trigger detected: 'Turn on screen recording'");
        
        // If no permission, request it first
        if (!hasScreenPermission) {
          console.log("[HomeworkHacker] 🎥 Requesting screen capture permission...");
          requestScreenPermission();
        } else {
          // If permission exists but not enabled, toggle it on
          if (!isScreenEnabled) {
            console.log("[HomeworkHacker] 🎥 Enabling screen capture...");
            toggleScreenCapture();
          }
        }
      }
    }
  }, [messages, hasScreenPermission, isScreenEnabled, requestScreenPermission, toggleScreenCapture]);

  // Handler for phone detection
  const handlePhoneDetectedForTooLong = useCallback(() => {
    let scoldingSystemInstruction: string;
    let toastTitle: string;
    let toastDescription: string;
    let toastVariant: "default" | "destructive" = "default";

    if (personality === "sarcastic") {
      scoldingSystemInstruction = `You are an AI assistant. Deliver a subtle, witty, and mildly judgmental comment about the user lack of focus, always encouraging the user to "get back to work" with a sarcastic undertone. The user has been too much on their phone. Do not be overtly mean, but your sarcasm should be clear. Keep the response concise. The goal is to make the user reflect on their distraction while keeping the tone light and humorous. After your comment, encourage them to return to their studies. Only write alphabetic letters, full stops, and commas.`;
      toastTitle = "Focus Alert!";
      toastDescription = "You have been reminded";
    } else {
      scoldingSystemInstruction = `You are a supportive AI assistant. Gently remind the user to refocus on their studies. Your tone should be kind and encouraging, emphasizing the importance of concentration without being harsh. The user has been too much on their phone. Keep the response concise and helpful. After gently reminding them, encourage them to get back to their studies. Only write alphabetic letters, full stops, and commas.`;
      toastTitle = "Gentle Reminder!";
      toastDescription = "You have been reminded";
    }
    
    // Send scolding message - the message type will prevent mute from working
    sendAIPromptWithoutUserMessage(scoldingSystemInstruction, null, "The user has been distracted by their phone. Please provide feedback.", "scolding");
    toast({
      title: toastTitle,
      description: toastDescription,
      variant: toastVariant,
    });
  }, [sendAIPromptWithoutUserMessage, personality]);


  const handleTypedMessage = useCallback(
    async (message: string, images: string[] | null) => {
      // Show text input indicator (screen capture OFF temporarily)
      setIsTextInputActive(true);
      
      if (debugMode) {
        sendMockMessage(message);
      } else {
        sendMessage(message, images);
      }
      
      // Reset after a short delay to show the transition
      setTimeout(() => {
        setIsTextInputActive(false);
      }, 800);
    },
    [sendMessage, sendMockMessage, debugMode]
  );
  
  const getStatusText = () => {
    if (listeningState === "listening_for_wakeword") return "Say 'Hey Buddy'...";
    if (listeningState === "listening_for_command") return "Listening for command...";
    if (listeningState === "listening_for_reply") return "Go ahead, speak now...";
    if (isLoading) return "Thinking...";
    if (isSpeaking) return "Speaking...";
    return "Ready to help";
  };

  const isMicActive = listeningState !== 'idle';
  const isProcessing = isLoading;

  const handleVoiceButtonClick = useCallback(() => {
    console.log("[HomeworkHacker] Voice button clicked");
    console.log("[HomeworkHacker] Current mic active:", isMicActive);
    
    // Toggle user mic control
    const newMicState = toggleMicByUser();
    console.log("[HomeworkHacker] User toggled mic to:", newMicState);
    
    // Start or stop listening based on new state
    if (newMicState) {
      console.log("[HomeworkHacker] Starting listening due to user click");
      startListening();
    } else {
      console.log("[HomeworkHacker] Stopping listening due to user click");
      stopListening();
    }
  }, [isMicActive, toggleMicByUser, startListening, stopListening]);

  if (!isVoiceSupported) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
          Voice recognition is not supported in this browser. Google chrome is recommended.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background gap-3">
      {/* Header */}
      <header className="glass-card rounded-2xl max-w-6xl w-full mx-auto mt-2">
        <div className="flex items-center justify-between py-3 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white glow-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Homework Hacker</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PersonalityToggle personality={personality} onToggle={handlePersonalityChange} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
              className="text-foreground hover:bg-secondary hover:text-white hover:glow-secondary transition-all"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <MuteToggle isMuted={isMuted} onToggle={() => setIsMuted(prev => !prev)} />
            {/* DEBUG: Mock AI Toggle - DELETE THIS BUTTON WHEN DONE TESTING */}
            <Button
              onClick={() => setDebugMode(prev => !prev)}
              variant="ghost"
              size="sm"
              title="Mock AI mode (no tokens used)"
              className={cn(
                "text-foreground hover:bg-secondary hover:text-white",
                debugMode && "bg-red-500 text-white hover:bg-red-600"
              )}
            >
              <span className="text-xs font-medium">{debugMode ? "Debug ON" : "Debug OFF"}</span>
            </Button>
            {/* END DEBUG BUTTON */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 gap-3 overflow-hidden px-3 pb-3">
        {/* Left panel - Voice interface */}
        <div className="glass-card flex w-1/3 flex-col items-center justify-center rounded-2xl p-6">
          <div className="flex flex-col items-center gap-6">
            {/* Status text */}
            <div className="text-center space-y-1">
              <p className="text-base font-medium text-foreground">{getStatusText()}</p>
              <p className="text-xs text-muted-foreground">
                {isMicActive ? "Continuous listening is active" : "Tap microphone to start"}
              </p>
            </div>

            {/* Voice button */}
            <VoiceButton
              isListening={isMicActive}
              isProcessing={isProcessing}
              disabled={!isVoiceSupported}
              onClick={handleVoiceButtonClick}
            />
            
            <AudioWave isActive={isMicActive || isSpeaking} />

            {showWakeWordUI && isMicActive && (
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="font-bold text-black text-sm">Say the wake word:</p>
                <p className="text-xl font-light tracking-widest text-black">"Hey Buddy"</p>
              </div>
            )}
            
            <div className="mt-3">
              <ScreenCaptureToggle
                hasPermission={hasScreenPermission}
                isEnabled={isScreenEnabled}
                isCapturing={isCapturing}
                onRequestPermission={requestScreenPermission}
                onToggle={toggleScreenCapture}
                isTextInputActive={isTextInputActive}
              />
            </div>

            {/* Phone Detection Component */}
            <div className="mt-2">
              <PhoneDetector onPhoneDetectedForTooLong={handlePhoneDetectedForTooLong} />
            </div>

            {/* DEBUG: Test Phone Detection - Only shows in debug mode */}
            {debugMode && (
              <div className="mt-4 pt-4 border-t border-muted">
                <Button
                  onClick={() => handlePhoneDetectedForTooLong()}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Test Phone Detection
                </Button>
              </div>
            )}
            {/* END DEBUG SECTION */}
          </div>
        </div>

        {/* Right panel - Chat */}
        <div className="glass-card flex-1 rounded-2xl">
          <ChatInterface
            messages={messages}
            isLoading={isProcessing}
            isSpeaking={isSpeaking}
            onSendMessage={handleTypedMessage}
            onClearMessages={clearMessages}
            onStopSpeaking={stopSpeaking}
          />
        </div>
      </main>

      {/* Settings Modal */}
      {isLoaded && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userName={settings.userName}
          onUserNameChange={updateUserName}
          voiceSpeed={settings.voiceSpeed}
          onVoiceSpeedChange={updateVoiceSpeed}
          volume={settings.volume}
          onVolumeChange={updateVolume}
          onResetSettings={resetSettings}
        />
      )}
    </div>
  );
}
