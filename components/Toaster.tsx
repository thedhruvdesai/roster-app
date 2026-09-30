"use client";

import { X } from "lucide-react";
import { useToast } from "@/lib/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 pl-4 pr-2 text-[15px] text-zinc-50 shadow-2xl shadow-black/40"
        >
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                dismiss(t.id);
              }}
              className="rounded-md px-2.5 py-1 font-semibold text-vest hover:bg-zinc-700"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
