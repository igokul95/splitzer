import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  onFallback: () => void;
}

export function CameraCapture({ onCapture, onClose, onFallback }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback();
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onFallback();
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [onFallback, stopStream]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "receipt.jpg", { type: "image/jpeg" });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, stopStream]);

  const handleClose = useCallback(() => {
    stopStream();
    onClose();
  }, [onClose, stopStream]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {/* Instruction overlay */}
      {ready && (
        <div className="absolute top-16 left-0 right-0 text-center">
          <span className="rounded-full bg-black/50 px-4 py-2 text-sm text-white">
            Point at receipt
          </span>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white active:bg-black/70"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Capture button */}
      {ready && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <button
            onClick={capture}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 active:bg-white/40"
          >
            <Camera className="h-7 w-7 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
