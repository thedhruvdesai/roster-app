"use client";

import { X } from "lucide-react";
import { useToast } from "@/lib/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl bg-zinc-50 py-3 pl-4 pr-2 text-[15px] font-medium text-zinc-950 shadow-2xl shadow-black/40"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="rounded-md px-2.5 py-1 font-semibold text-zinc-950 underline underline-offset-2"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-950">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
