import { useState, useCallback, useRef } from "react";

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const requestPermission = useCallback(async () => {
    console.log("[useScreenCapture] ========================================");
    console.log("[useScreenCapture] Requesting screen capture permission...");
    console.log("[useScreenCapture] Current state - hasPermission:", hasPermission, "isEnabled:", isEnabled);
    console.log("[useScreenCapture] ========================================");
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: false,
      });
      
      console.log("[useScreenCapture] ✓ Permission granted! Stream obtained.");
      console.log("[useScreenCapture] Stream tracks:", stream.getTracks().length);
      console.log("[useScreenCapture] Video track settings:", stream.getVideoTracks()[0]?.getSettings());
      
      streamRef.current = stream;
      
      // Create hidden video element and append to DOM so it actually plays
      const video = document.createElement("video");
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.style.display = "none"; // Hide it but keep it in DOM
      
      // Critical: append to document so it actually renders
      document.body.appendChild(video);
      console.log("[useScreenCapture] Video element created and APPENDED TO DOM");
      
      videoRef.current = video;
      
      // Wait for video to be ready AND start playing
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("[useScreenCapture] ⚠ Video metadata load timeout after 5s");
          console.warn("[useScreenCapture] ⚠ Attempting to play anyway...");
          video.play().catch(err => console.error("[useScreenCapture] Play error:", err));
          resolve();
        }, 5000);
        
        video.onloadedmetadata = async () => {
          clearTimeout(timeout);
          console.log("[useScreenCapture] ✓ Video metadata loaded");
          console.log("[useScreenCapture] Video dimensions:", video.videoWidth, "x", video.videoHeight);
          
          // Explicitly call play() to ensure video actually plays
          try {
            console.log("[useScreenCapture] Calling video.play()...");
            await video.play();
            console.log("[useScreenCapture] ✓ video.play() succeeded!");
            console.log("[useScreenCapture] Video paused state:", video.paused);
            console.log("[useScreenCapture] Ready to capture frames");
          } catch (playErr) {
            console.error("[useScreenCapture] ✗ video.play() failed:", playErr);
          }
          resolve();
        };
      });
      
      setHasPermission(true);
      setIsEnabled(true);
      console.log("[useScreenCapture] ✓ State updated - hasPermission: true, isEnabled: true");
      console.log("[useScreenCapture] About to set stream end handler");
      console.log("[useScreenCapture] Stream video tracks:", stream.getVideoTracks().length);
      
      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        console.log("[useScreenCapture] ⚠ Stream ended by user, disabling capture");
        // Clean up video element
        if (videoRef.current && videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current);
        }
        setHasPermission(false);
        setIsEnabled(false);
        streamRef.current = null;
        videoRef.current = null;
      };
      
      console.log("[useScreenCapture] ========================================");
      console.log("[useScreenCapture] ✓ Screen capture successfully initialized");
      console.log("[useScreenCapture] ========================================");
      return true;
    } catch (error) {
      console.error("[useScreenCapture] ✗ PERMISSION DENIED OR ERROR:", error);
      console.error("[useScreenCapture] Error type:", (error as any)?.name);
      console.error("[useScreenCapture] Error message:", (error as any)?.message);
      setHasPermission(false);
      setIsEnabled(false);
      return false;
    }
  }, []);

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    console.log("[useScreenCapture] ========================================");
    console.log("[useScreenCapture] captureScreenshot() CALLED");
    console.log("[useScreenCapture] videoRef.current exists:", !!videoRef.current);
    console.log("[useScreenCapture] streamRef.current exists:", !!streamRef.current);
    console.log("[useScreenCapture] isCapturing state:", isCapturing);
    
    // Use refs instead of state to avoid stale values
    if (!videoRef.current || !streamRef.current) {
      console.error("[useScreenCapture] ✗ Cannot capture - MISSING VIDEO OR STREAM");
      console.error("[useScreenCapture] videoRef.current is null:", !videoRef.current);
      console.error("[useScreenCapture] streamRef.current is null:", !streamRef.current);
      console.log("[useScreenCapture] ========================================");
      return null;
    }

    setIsCapturing(true);
    console.log("[useScreenCapture] setIsCapturing set to true");
    
    try {
      const video = videoRef.current;
      console.log("[useScreenCapture] Video element ready state:", video.readyState);
      console.log("[useScreenCapture] Video networkState:", video.networkState);
      console.log("[useScreenCapture] Video paused:", video.paused);
      console.log("[useScreenCapture] Video dimensions:", video.videoWidth, "x", video.videoHeight);
      console.log("[useScreenCapture] Video in DOM:", video.parentNode !== null);
      
      // If video is paused, try to play it
      if (video.paused) {
        console.warn("[useScreenCapture] ⚠ VIDEO IS PAUSED! Attempting to resume...");
        try {
          await video.play();
          console.log("[useScreenCapture] ✓ Video resumed successfully");
        } catch (playErr) {
          console.error("[useScreenCapture] ✗ Failed to resume video:", playErr);
        }
      }
      
      // Wait a bit for the frame to be ready if needed
      if (video.readyState < 2) {
        console.log("[useScreenCapture] ⚠ Video not ready yet (readyState:", video.readyState, "), waiting for frame...");
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            console.log("[useScreenCapture] ✓ Waited for frame - now readyState:", video.readyState);
            resolve();
          }, 200);
        });
      }
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("[useScreenCapture] ⚠ WARNING: Video has zero dimensions! readyState:", video.readyState);
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log("[useScreenCapture] Canvas created - size:", canvas.width, "x", canvas.height);
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not get canvas 2D context");
      }
      console.log("[useScreenCapture] Canvas context obtained");
      
      ctx.drawImage(video, 0, 0);
      console.log("[useScreenCapture] ✓ Image drawn to canvas");
      
      // Convert to base64 data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const sizeKB = (dataUrl.length / 1024).toFixed(2);
      
      console.log("[useScreenCapture] ========================================");
      console.log("[useScreenCapture] ✓✓✓ SCREENSHOT CAPTURED SUCCESSFULLY ✓✓✓");
      console.log("[useScreenCapture] Data URL size:", sizeKB, "KB (", dataUrl.length, "chars)");
      console.log("[useScreenCapture] First 100 chars:", dataUrl.substring(0, 100) + "...");
      console.log("[useScreenCapture] ========================================");
      
      setIsCapturing(false);
      return dataUrl;
    } catch (error) {
      console.error("[useScreenCapture] ✗✗✗ SCREENSHOT CAPTURE FAILED ✗✗✗");
      console.error("[useScreenCapture] Error:", error);
      console.error("[useScreenCapture] Error type:", (error as any)?.name);
      console.error("[useScreenCapture] Error message:", (error as any)?.message);
      console.error("[useScreenCapture] Error stack:", (error as any)?.stack);
      console.log("[useScreenCapture] ========================================");
      setIsCapturing(false);
      return null;
    }
  }, [isCapturing]);

  const stopCapture = useCallback(() => {
    console.log("[useScreenCapture] stopCapture() called");
    if (streamRef.current) {
      const trackCount = streamRef.current.getTracks().length;
      console.log("[useScreenCapture] Stopping", trackCount, "tracks");
      streamRef.current.getTracks().forEach((track, index) => {
        console.log("[useScreenCapture] Stopping track", index + 1, "-", track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    videoRef.current = null;
    setHasPermission(false);
    setIsEnabled(false);
    console.log("[useScreenCapture] ✓ Screen capture stopped");
  }, []);

  const toggleEnabled = useCallback(async () => {
    console.log("[useScreenCapture] ========================================");
    console.log("[useScreenCapture] toggleEnabled() called");
    const currentlyEnabled = streamRef.current !== null;
    console.log("[useScreenCapture] Currently enabled:", currentlyEnabled);
    
    if (currentlyEnabled) {
      // Disable
      console.log("[useScreenCapture] ► DISABLING screen capture");
      stopCapture();
      console.log("[useScreenCapture] ✓ Screen capture disabled");
    } else {
      // Enable - request permission
      console.log("[useScreenCapture] ► ENABLING screen capture - requesting permission");
      const success = await requestPermission();
      console.log("[useScreenCapture] Permission request result:", success);
    }
    console.log("[useScreenCapture] ========================================");
  }, [stopCapture, requestPermission]);

  return {
    isCapturing,
    hasPermission,
    isEnabled,
    requestPermission,
    captureScreenshot,
    stopCapture,
    toggleEnabled,
  };
}
