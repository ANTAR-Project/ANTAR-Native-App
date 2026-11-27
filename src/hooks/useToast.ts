import { useCallback, useEffect, useRef, useState } from "react";

export type ToastKind = "info" | "success" | "error";

export interface ToastState {
  message: string;
  kind: ToastKind;
}

export function useToast(durationMs: number = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "info") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ message, kind });
      timerRef.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, show, hide };
}
