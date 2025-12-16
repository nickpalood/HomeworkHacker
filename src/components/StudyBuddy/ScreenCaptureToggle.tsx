import { Monitor, MonitorOff, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ScreenCaptureToggleProps {
  hasPermission: boolean;
  isEnabled: boolean;
  isCapturing: boolean;
  onRequestPermission: () => void;
  onToggle: () => void;
}

export function ScreenCaptureToggle({
  hasPermission,
  isEnabled,
  isCapturing,
  onRequestPermission,
  onToggle,
}: ScreenCaptureToggleProps) {
  if (!hasPermission) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRequestPermission}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              "bg-muted text-muted-foreground hover:bg-[#f67555] hover:text-white"
            )}
          >
            <Monitor className="h-4 w-4" />
            <span>Enable Screen Capture</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Allow screen capture so the AI can see what you're studying</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all",
          isEnabled ? "bg-[#68639c]/20 text-[#68639c]" : "bg-muted text-muted-foreground"
        )}
      >
        {isCapturing ? (
          <Camera className="h-4 w-4 animate-pulse" />
        ) : isEnabled ? (
          <Monitor className="h-4 w-4" />
        ) : (
          <MonitorOff className="h-4 w-4" />
        )}
        <span>{isEnabled ? "Screen capture ON" : "Screen capture OFF"}</span>
      </div>
      <Switch checked={isEnabled} onCheckedChange={onToggle} />
    </div>
  );
}
