import { useState, useCallback, useEffect } from "react";

interface Settings {
  userName: string;
  voiceSpeed: number;
}

const DEFAULT_SETTINGS: Settings = {
  userName: "Student",
  voiceSpeed: 1,
};

const STORAGE_KEY = "homework-hacker-settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        console.log("[useSettings] ✓ Settings loaded from localStorage:", parsed);
      }
    } catch (error) {
      console.error("[useSettings] Error loading settings:", error);
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log("[useSettings] ✓ Settings saved to localStorage:", updated);
      } catch (error) {
        console.error("[useSettings] Error saving settings:", error);
      }
      return updated;
    });
  }, []);

  const updateUserName = useCallback((userName: string) => {
    updateSettings({ userName });
  }, [updateSettings]);

  const updateVoiceSpeed = useCallback((voiceSpeed: number) => {
    // Clamp between 0.5 and 2
    const clamped = Math.max(0.5, Math.min(2, voiceSpeed));
    updateSettings({ voiceSpeed: clamped });
  }, [updateSettings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    console.log("[useSettings] ✓ Settings reset to defaults");
  }, []);

  return {
    settings,
    isLoaded,
    updateSettings,
    updateUserName,
    updateVoiceSpeed,
    resetSettings,
  };
}
