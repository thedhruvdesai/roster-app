"use client";

import { create } from "zustand";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, action?: Toast["action"]) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

/** Tiny toast queue: one line of feedback after an action, with an optional Undo. */
export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, action) => {
    const id = ++seq;
    // Keep at most two on screen so they never stack up over the roster
    set((s) => ({ toasts: [...s.toasts.slice(-1), { id, message, action }] }));
    setTimeout(() => get().dismiss(id), action ? 6000 : 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, action?: Toast["action"]) => useToast.getState().show(message, action);
