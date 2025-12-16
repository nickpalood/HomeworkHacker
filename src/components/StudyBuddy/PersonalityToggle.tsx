import { Smile, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalityToggleProps {
  personality: "neutral" | "sarcastic";
  onToggle: (personality: "neutral" | "sarcastic") => void;
}

export function PersonalityToggle({ personality, onToggle }: PersonalityToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      <button
        onClick={() => onToggle("neutral")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          personality === "neutral"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Smile className="h-4 w-4" />
        <span>Neutral</span>
      </button>
      <button
        onClick={() => onToggle("sarcastic")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
          personality === "sarcastic"
            ? "bg-[#68639c] text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>Sarcastic</span>
      </button>
    </div>
  );
}
