import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MuteToggleProps {
  isMuted: boolean;
  onToggle: () => void;
}

export function MuteToggle({ isMuted, onToggle }: MuteToggleProps) {
  const Icon = isMuted ? VolumeX : Volume2;
  const title = isMuted ? "Unmute" : "Mute";

  return (
    <Button variant="ghost" size="icon" onClick={onToggle} title={title} className="text-foreground hover:bg-[#68639c] hover:text-white">
      <Icon className="h-5 w-5" />
    </Button>
  );
}
