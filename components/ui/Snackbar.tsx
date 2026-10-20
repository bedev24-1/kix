"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

type Snack = { id: number; message: string; detail?: string; tone: "gold" | "jade" | "warn"; leaving?: boolean };

type SnackbarApi = {
  /** Affiche un message court en bas de l'écran (2,6 s). */
  notify: (message: string, options?: { detail?: string; tone?: Snack["tone"] }) => void;
};

const SnackbarContext = createContext<SnackbarApi | null>(null);

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const seq = useRef(0);

  const notify = useCallback<SnackbarApi["notify"]>((message, options) => {
    const id = ++seq.current;
    setSnacks((list) => [...list, { id, message, detail: options?.detail, tone: options?.tone ?? "gold" }]);
    // on marque la sortie avant de retirer : le message s'efface au lieu de sauter
    window.setTimeout(
      () => setSnacks((list) => list.map((s) => (s.id === id ? { ...s, leaving: true } : s))),
      2400,
    );
    window.setTimeout(() => setSnacks((list) => list.filter((s) => s.id !== id)), 2700);
  }, []);

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[430px] flex-col gap-2 px-5 pb-[calc(10rem+env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-6 sm:mx-0 sm:max-w-[420px] sm:pb-6"
      >
        {snacks.map((snack) => (
          <div
            key={snack.id}
            className={cn(
              "glass-strong relative flex items-center gap-3 overflow-hidden rounded-full py-2.5 pr-5 pl-2.5 shadow-[var(--mb-shadow)]",
              snack.leaving ? "snackbar-out" : "snackbar-in",
              snack.tone === "gold" && "border-gold/45",
              snack.tone === "jade" && "border-jade/45",
              snack.tone === "warn" && "border-warn/45",
            )}
          >
            <span
              className={cn(
                "pop grid h-8 w-8 shrink-0 place-items-center rounded-full",
                snack.tone === "gold" && "bg-gold text-gold-ink",
                snack.tone === "jade" && "bg-jade text-white",
                snack.tone === "warn" && "bg-warn text-gold-ink",
              )}
            >
              <CheckIcon size={16} />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-medium">{snack.message}</span>
              {snack.detail ? <span className="truncate text-[11px] text-muted">{snack.detail}</span> : null}
            </span>
            <span
              className={cn(
                "snackbar-life absolute inset-x-0 bottom-0 h-0.5 origin-left",
                snack.tone === "gold" && "bg-gold",
                snack.tone === "jade" && "bg-jade",
                snack.tone === "warn" && "bg-warn",
              )}
            />
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useSnackbar doit être utilisé dans <SnackbarProvider>");
  return ctx;
}
