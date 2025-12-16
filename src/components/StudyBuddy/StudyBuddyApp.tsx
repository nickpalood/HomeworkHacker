import { useCallback, useEffect, useState, useRef } from "react";
import { GraduationCap, Settings } from "lucide-react";
import { useHomeworkHacker } from "@/hooks/useStudyBuddy";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { useSettings } from "@/hooks/useSettings";
import { VoiceButton } from "./VoiceButton";
import { AudioWave } from "./AudioWave";
import { ChatInterface } from "./ChatInterface";
import { ScreenCaptureToggle } from "./ScreenCaptureToggle";
import { PersonalityToggle } from "./PersonalityToggle";
import { SettingsModal } from "../Settings/SettingsModal";
import { MuteToggle } from "./MuteToggle";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PhoneDetector from "../PhoneDetection"; // Import PhoneDetector

export function HomeworkHackerApp() {
  const [showWakeWordUI, setShowWakeWordUI] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [shouldBypassMute, setShouldBypassMute] = useState(false);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const screenStateRef = useRef({ hasPermission: false, isEnabled: false });
  const screenRecordingTriggeredRef = useRef<string | null>(null);

  console.log("[HomeworkHacker] App render");
  
  // Load settings
  const { settings, isLoaded, updateUserName, updateVoiceSpeed, resetSettings } = useSettings();

  const {
    messages,
    isLoading,
    personality,
    setPersonality,
    sendMessage,
    sendAIPromptWithoutUserMessage, // Destructure the new function
    clearMessages,
  } = useHomeworkHacker({ personality: "neutral", userName: settings.userName });

  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

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

  const handleVoiceResult = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;
      
      console.log("[HomeworkHacker] ========================================");
      console.log("[HomeworkHacker] handleVoiceResult() called");
      console.log("[HomeworkHacker] Transcript:", transcript);
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
      if (screenStateRef.current.isEnabled && screenStateRef.current.hasPermission) {
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
        console.log("[HomeworkHacker] Screen capture is DISABLED");
        console.log("[HomeworkHacker]   - Using ref values: isEnabled:", screenStateRef.current.isEnabled, "hasPermission:", screenStateRef.current.hasPermission);
      }
      
      console.log("[HomeworkHacker] ► Sending message to AI...");
      console.log("[HomeworkHacker]   - Text: \"" + transcript + "\"");
      console.log("[HomeworkHacker]   - With screenshot:", !!screenshot);
      console.log("[HomeworkHacker] ========================================");
      
      sendMessage(transcript, screenshot ? [screenshot] : null);
    },
    [isScreenEnabled, hasScreenPermission, captureScreenshot, sendMessage, isCapturing]
  );

  const {
    isSupported: isVoiceSupported,
    listeningState,
    startListening,
    stopListening,
    restartListeningAfterDelay,
    enableReplyWindow,
  } = useSpeechRecognition({
    wakeWord: "hey buddy",
    isAISpeaking: isSpeaking,
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

  // Stop speaking if muted (unless bypassed for phone detection)
  useEffect(() => {
    if (isMuted && !shouldBypassMute) {
      stopSpeaking();
    }
  }, [isMuted, stopSpeaking, shouldBypassMute]);

  // Speak the latest assistant message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage?.role === "assistant" &&
      lastMessage.content &&
      !isLoading &&
      !isSpeaking &&
      lastMessage.id !== lastSpokenMessageIdRef.current &&
      (!isMuted || shouldBypassMute)
    ) {
      lastSpokenMessageIdRef.current = lastMessage.id;
      speak(lastMessage.content, settings.voiceSpeed);
      // Reset bypass flag after speaking is triggered
      if (shouldBypassMute) {
        setShouldBypassMute(false);
      }
    }
  }, [messages, isLoading, isSpeaking, speak, settings.voiceSpeed, isMuted, shouldBypassMute]);

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
      // Bypass mute to always speak phone detection response
      setShouldBypassMute(true);
    }
    
    sendAIPromptWithoutUserMessage(scoldingSystemInstruction, null, "The user has been distracted by their phone. Please provide feedback.");
    toast({
      title: toastTitle,
      description: toastDescription,
      variant: toastVariant,
    });
  }, [sendAIPromptWithoutUserMessage, personality]);


  const handleTypedMessage = useCallback(
    async (message: string, images: string[] | null) => {
      sendMessage(message, images);
    },
    [sendMessage]
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f67555]/80 text-white shadow-[0_0_12px_1px_#f67555b3,0_0_24px_4px_#f6755566]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Homework Hacker</h1>
              <p className="text-xs text-muted-foreground">AI-powered study companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PersonalityToggle personality={personality} onToggle={setPersonality} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettingsModal(true)}
              title="Settings"
              className="text-foreground hover:bg-[#68639c] hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <MuteToggle isMuted={isMuted} onToggle={() => setIsMuted(prev => !prev)} />
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
              onClick={isMicActive ? stopListening : startListening}
            />
            
            <AudioWave isActive={isMicActive || isSpeaking} />

            {showWakeWordUI && isMicActive && (
              <div className="text-center p-3 bg-[#f67555]/10 rounded-lg">
                <p className="font-bold text-black text-sm">Say the wake word:</p>
                <p className="text-xl font-light tracking-widest text-black/80">"Hey Buddy"</p>
              </div>
            )}
            
            <div className="mt-3">
              <ScreenCaptureToggle
                hasPermission={hasScreenPermission}
                isEnabled={isScreenEnabled}
                isCapturing={isCapturing}
                onRequestPermission={requestScreenPermission}
                onToggle={toggleScreenCapture}
              />
            </div>

            {/* Phone Detection Component */}
            <div className="mt-2">
              <PhoneDetector onPhoneDetectedForTooLong={handlePhoneDetectedForTooLong} />
            </div>
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
          onResetSettings={resetSettings}
        />
      )}
    </div>
  );
}
