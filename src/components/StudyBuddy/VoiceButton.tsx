import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function VoiceButton({ isListening, isProcessing, disabled, onClick }: VoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={cn(
        "relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#f67555]/50",
        isListening
          ? "bg-[#f67555] text-white scale-110 shadow-[0_0_12px_1px_#f67555b3,0_0_24px_4px_#f6755566]"
          : "bg-card/80 text-foreground hover:bg-[#f67555] hover:text-white hover:scale-105 shadow-lg",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-label={isListening ? "Stop listening" : "Start listening"}
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : isListening ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
      
      {/* Pulse animation is now handled by CSS variables */}
      {isListening && <span className="absolute inset-0 rounded-full pulse-ring" />}
    </button>
  );
}
