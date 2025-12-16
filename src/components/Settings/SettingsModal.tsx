import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings as SettingsIcon } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onUserNameChange: (name: string) => void;
  voiceSpeed: number;
  onVoiceSpeedChange: (speed: number) => void;
  onResetSettings: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userName,
  onUserNameChange,
  voiceSpeed,
  onVoiceSpeedChange,
  onResetSettings,
}: SettingsModalProps) {
  const [tempUserName, setTempUserName] = useState(userName);

  const handleSave = () => {
    onUserNameChange(tempUserName.trim() || "Student");
    onClose();
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to defaults?")) {
      onResetSettings();
      setTempUserName("Student");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-black">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#68639c]" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Customize your Study Buddy experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Name Section */}
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-base font-semibold">
              Your Name
            </Label>
            <p className="text-sm text-gray-500">
              Used in Study Buddy's responses to personalize your experience
            </p>
            <Input
              id="userName"
              placeholder="Enter your name"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              className="mt-2 bg-gray-100 text-black focus-visible:ring-2 focus-visible:ring-[#f67555]"
            />
          </div>

          {/* Voice Speed Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Voice Speed</Label>
            <p className="text-sm text-gray-500">
              Adjust the speech synthesis speed
            </p>
            <div className="space-y-3 mt-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500 font-mono">0.5x</span>
                <span className="text-sm font-semibold">{voiceSpeed.toFixed(2)}x</span>
                <span className="text-xs text-gray-500 font-mono">2.0x</span>
              </div>
              <Slider
                value={[voiceSpeed]}
                onValueChange={(value) => onVoiceSpeedChange(value[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <Button onClick={handleSave} className="w-full bg-[#f67555] text-white hover:bg-[#f67555]/90">
              Save Settings
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
