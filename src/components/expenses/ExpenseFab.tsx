import { useNavigate } from "react-router-dom";
import { Camera, Receipt, Loader2 } from "lucide-react";
import { useReceiptScanner } from "@/hooks/useReceiptScanner";

interface ExpenseFabProps {
  position: "tabbed" | "detail";
  locationState?: Record<string, string>;
}

export function ExpenseFab({ position, locationState }: ExpenseFabProps) {
  const navigate = useNavigate();
  const { scanning, error, fileInputRef, triggerScan, handleFileChange } =
    useReceiptScanner({ locationState });

  const bottomClass = position === "tabbed" ? "bottom-20" : "bottom-6";

  return (
    <div className={`fixed ${bottomClass} right-4 z-50 flex flex-col items-end gap-2`}>
      {/* Error toast */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-md">
          {error}
        </div>
      )}

      {/* Scan receipt button */}
      <button
        onClick={triggerScan}
        disabled={scanning}
        className="flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-lg transition-all hover:bg-muted active:scale-95 disabled:opacity-70"
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Scan receipt
          </>
        )}
      </button>

      {/* Add expense button */}
      <button
        className="flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-all hover:bg-teal-700 active:scale-95"
        onClick={() =>
          navigate("/expenses/add", locationState ? { state: locationState } : undefined)
        }
      >
        <Receipt className="h-4 w-4" />
        Add expense
      </button>

      {/* Hidden file input for camera/gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
