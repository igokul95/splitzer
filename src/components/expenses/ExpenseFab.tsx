import { useNavigate } from "react-router-dom";
import { Camera, ImageIcon, Loader2, Plus } from "lucide-react";
import { useReceiptScanner } from "@/hooks/useReceiptScanner";
import { CameraCapture } from "./CameraCapture";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ExpenseFabProps {
  position: "tabbed" | "detail";
  locationState?: Record<string, string>;
}

export function ExpenseFab({ position, locationState }: ExpenseFabProps) {
  const navigate = useNavigate();
  const { scanning, error, fileInputRef, triggerScan, handleFileChange, showCamera, closeCamera, fallbackToFileInput, handleCapture, showPicker, closePicker, chooseCamera, chooseMedia } = useReceiptScanner({ locationState });

  const bottomClass = position === "tabbed" ? "bottom-22" : "bottom-6";

  return (
    <>
      {showCamera && <CameraCapture onCapture={handleCapture} onClose={closeCamera} onFallback={fallbackToFileInput} />}

      <Sheet open={showPicker} onOpenChange={(open) => !open && closePicker()}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-xl pb-8 bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Scan receipt</SheetTitle>
          </SheetHeader>
          <div className="flex gap-3 px-4">
            <button
              onClick={chooseCamera}
              className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-border bg-muted py-6 text-sm font-semibold transition-all hover:border-brand hover:text-brand active:scale-95"
            >
              <Camera className="h-6 w-6" />
              Camera
            </button>
            <button
              onClick={chooseMedia}
              className="flex flex-1 flex-col items-center gap-2 rounded-lg border border-border bg-muted py-6 text-sm font-semibold transition-all hover:border-brand hover:text-brand active:scale-95"
            >
              <ImageIcon className="h-6 w-6" />
              Media
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className={`fixed ${bottomClass} right-4 z-50 flex flex-col items-end gap-2`}>
        {error && (
          <div className="rounded-lg border border-negative/30 bg-negative-light px-3 py-2 text-xs font-bold text-negative shadow-lg">
            {error}
          </div>
        )}

        <button
          onClick={triggerScan}
          disabled={scanning}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-lg transition-all hover:border-brand hover:text-brand active:scale-95 disabled:opacity-70"
        >
          {scanning ? <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</> : <><Camera className="h-4 w-4" />Scan</>}
        </button>

        <button
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground shadow-lg transition-all hover:bg-brand-hover active:scale-95"
          onClick={() => navigate("/expenses/add", locationState ? { state: locationState } : undefined)}
        >
          <Plus className="h-4 w-4" />
          Add expense
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
    </>
  );
}
