// src/components/PhoneDetection/PhoneDetector.tsx
import { useEffect, useRef, useState } from "react";

const PHONE_DETECTION_THRESHOLD_MS = 10000; // 10 seconds

interface PhoneDetectorProps {
  onPhoneDetectedForTooLong: (durationMs: number) => void;
}

export default function PhoneDetector({ onPhoneDetectedForTooLong }: PhoneDetectorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<string>("Initializing...");
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false); // New state for tracking permission request
  const [isHovering, setIsHovering] = useState(false);

  const phoneDetectedStartTime = useRef<number | null>(null);
  const lastDetectionTime = useRef<number | null>(null);
  const scoldingTriggered = useRef<boolean>(false);


  // Request camera access and start video playback
  useEffect(() => {
    console.log("[PhoneDetector] useEffect for camera initialization triggered.");
    const hiddenVideo = hiddenVideoRef.current;

    let stream: MediaStream | null = null;

    async function initCamera() {
      console.log("[PhoneDetector] initCamera() called. Attempting to get user media.");
      setIsRequestingPermission(true); // Set state to true when request starts
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (hiddenVideoRef.current) { // Use hidden video ref for the actual stream
          hiddenVideoRef.current.srcObject = stream;
          await hiddenVideoRef.current.play();
          setStatus("Camera ready. Detecting...");
          setHasCameraPermission(true);
          console.log("[PhoneDetector] Camera permission granted and stream started.");
        } else {
          console.error("[PhoneDetector] hiddenVideoRef.current became null before stream could be assigned.");
          setStatus("Error: Video element not found.");
        }
      } catch (err) {
        console.error("[PhoneDetector] Error accessing camera:", err);
        setStatus("Camera permission denied.");
        setHasCameraPermission(false);
        // Add a toast notification or more prominent error message here if needed
      } finally {
        setIsRequestingPermission(false); // Set state to false when request finishes
      }
    }

    // Only try to init camera if the video element is available
    if (hiddenVideo) {
      initCamera();
    } else {
        console.warn("[PhoneDetector] hiddenVideoRef.current was null during useEffect initial run. This should ideally not happen with new rendering logic.");
    }


    return () => {
      console.log("[PhoneDetector] Cleaning up camera stream.");
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Removed dependency on `videoRef.current`

  // Periodically capture frames and send to backend
  useEffect(() => {
    if (!hasCameraPermission) {
      console.log("[PhoneDetector] Not starting detection interval: No camera permission.");
      return;
    }
    console.log("[PhoneDetector] Starting phone detection interval.");

    const intervalId = setInterval(async () => {
      const hiddenVideo = hiddenVideoRef.current;
      const canvas = canvasRef.current;
      if (!hiddenVideo || !canvas || hiddenVideo.videoWidth === 0 || hiddenVideo.videoHeight === 0) {
        // If video not ready, reset detection timers and status
        phoneDetectedStartTime.current = null;
        lastDetectionTime.current = null;
        scoldingTriggered.current = false;
        // console.log("[PhoneDetector] Video or canvas not ready for frame capture.");
        return;
      }

      // Draw the current video frame to a hidden canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = hiddenVideo.videoWidth;
      canvas.height = hiddenVideo.videoHeight;
      ctx.drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");

      try {
        const response = await fetch("http://localhost:8000/detect_phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const { phone_detected } = await response.json();
        setStatus(phone_detected ? "Phone detected 📱" : "No phone detected");

        const currentTime = Date.now();

        if (phone_detected) {
          if (phoneDetectedStartTime.current === null) {
            phoneDetectedStartTime.current = currentTime;
            console.log("[PhoneDetector] Phone detection started.");
          }
          lastDetectionTime.current = currentTime;
          
          const duration = currentTime - phoneDetectedStartTime.current;
          if (duration >= PHONE_DETECTION_THRESHOLD_MS && !scoldingTriggered.current) {
            console.warn(`[PhoneDetector] Phone detected for too long (${duration}ms). Triggering scolding.`);
            onPhoneDetectedForTooLong(duration);
            scoldingTriggered.current = true; // Prevent multiple scoldings for same continuous event
          }
        } else {
          if (phoneDetectedStartTime.current !== null) {
            console.log("[PhoneDetector] Phone no longer detected. Resetting timers.");
          }
          phoneDetectedStartTime.current = null;
          lastDetectionTime.current = null;
          scoldingTriggered.current = false; // Reset when phone is no longer detected
        }

      } catch (err) {
        console.error("[PhoneDetector] Detection error:", err);
        setStatus("Error contacting server");
        phoneDetectedStartTime.current = null; // Reset on error
        lastDetectionTime.current = null;
        scoldingTriggered.current = false;
      }
    }, 5000); // every 5 seconds

    return () => {
      console.log("[PhoneDetector] Cleaning up detection interval.");
      clearInterval(intervalId)
    };
  }, [hasCameraPermission, onPhoneDetectedForTooLong]);

  // Handle canvas display when hovering
  useEffect(() => {
    if (!isHovering || !hasCameraPermission) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const drawFrame = () => {
      const hiddenVideo = hiddenVideoRef.current;
      const displayCanvas = displayCanvasRef.current;
      
      if (!hiddenVideo || !displayCanvas || hiddenVideo.videoWidth === 0 || hiddenVideo.videoHeight === 0) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      displayCanvas.width = hiddenVideo.videoWidth;
      displayCanvas.height = hiddenVideo.videoHeight;
      ctx.drawImage(hiddenVideo, 0, 0);

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isHovering, hasCameraPermission]);

  return (
    <div className="relative flex flex-col items-center gap-1.5 p-3">
      {/* Hidden video element - always renders and processes frames */}
      <video
        ref={hiddenVideoRef}
        style={{ display: "none" }}
        autoPlay
        playsInline
        muted
      />
      
      {/* Visible video container with hover effect */}
      <div
        ref={videoRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="relative w-full max-w-xs rounded border border-dashed border-gray-400 bg-gray-900 overflow-hidden transition-all aspect-video flex items-center justify-center"
        style={{ minHeight: '5.5rem', maxWidth: '12rem' }}
      >
        {/* Canvas displays the video when hovering */}
        {isHovering && hasCameraPermission && !isRequestingPermission && (
          <canvas
            ref={displayCanvasRef}
            className="w-full h-full"
            style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
        
        {/* Hover hint */}
        {!isHovering && hasCameraPermission && !isRequestingPermission && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-800/80 to-gray-900/80 backdrop-blur-sm">
            <p className="text-xs font-medium text-gray-300">Hover to preview camera</p>
          </div>
        )}
      </div>

      {/* hidden canvas used for capturing frames */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {(isRequestingPermission || !hasCameraPermission) && (
        <div className="w-full max-w-xs rounded border border-gray-400 overflow-hidden">
          <div className="flex flex-col items-center justify-center bg-gray-900 p-8 aspect-video">
            {isRequestingPermission && (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-blue-500">Requesting Camera Permission...</p>
                <p className="text-sm text-muted-foreground">Please allow camera access to enable phone detection.</p>
              </div>
            )}
            {!hasCameraPermission && !isRequestingPermission && (
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-red-500">Camera Access Required</p>
                <p className="text-sm text-muted-foreground">Please grant camera permission to enable phone detection.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {hasCameraPermission && !isRequestingPermission && (
        <div className="text-xs font-medium">{status}</div>
      )}
    </div>
  );
}
