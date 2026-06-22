"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ExportCaptureContextValue = {
  isCapturing: boolean;
  setCapturing: (capturing: boolean) => void;
};

const ExportCaptureContext = createContext<ExportCaptureContextValue | null>(null);

export function ExportCaptureProvider({ children }: { children: ReactNode }) {
  const [isCapturing, setCapturing] = useState(false);
  const value = useMemo(() => ({ isCapturing, setCapturing }), [isCapturing]);

  return (
    <ExportCaptureContext.Provider value={value}>{children}</ExportCaptureContext.Provider>
  );
}

export function useExportCapture() {
  const context = useContext(ExportCaptureContext);
  if (!context) {
    return { isCapturing: false, setCapturing: () => undefined };
  }
  return context;
}
