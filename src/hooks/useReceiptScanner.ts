import { useState, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";

interface UseReceiptScannerOptions {
  locationState?: Record<string, string>;
}

function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIZE = 1600;
      let { width, height } = img;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function useReceiptScanner(options?: UseReceiptScannerOptions) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanReceipt = useAction(api.receipts.scanReceipt);
  const navigate = useNavigate();

  const handleCapture = useCallback(
    async (file: File) => {
      setShowCamera(false);

      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10 MB.");
        return;
      }

      setScanning(true);
      setError(null);

      try {
        const { base64, mimeType } = await compressImage(file);
        const result = await scanReceipt({ base64Image: base64, mimeType });

        navigate("/expenses/add", {
          state: {
            ...options?.locationState,
            receiptData: result,
          },
        });
      } catch (err) {
        console.error("Receipt scan failed:", err);
        setError("Could not read receipt. Try a clearer photo.");
      } finally {
        setScanning(false);
      }
    },
    [scanReceipt, navigate, options?.locationState]
  );

  const triggerScan = useCallback(() => {
    setError(null);
    setShowPicker(true);
  }, []);

  const closePicker = useCallback(() => {
    setShowPicker(false);
  }, []);

  const chooseCamera = useCallback(() => {
    setShowPicker(false);
    setShowCamera(true);
  }, []);

  const chooseMedia = useCallback(() => {
    setShowPicker(false);
    fileInputRef.current?.click();
  }, []);

  const closeCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  const fallbackToFileInput = useCallback(() => {
    setShowCamera(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (!file) return;
      handleCapture(file);
    },
    [handleCapture]
  );

  return {
    scanning,
    error,
    fileInputRef,
    triggerScan,
    handleFileChange,
    showCamera,
    closeCamera,
    fallbackToFileInput,
    handleCapture,
    showPicker,
    closePicker,
    chooseCamera,
    chooseMedia,
  };
}
