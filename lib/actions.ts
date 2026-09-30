"use client";

import { addDays, fmtDayNum, fmtDow } from "./dates";
import { useRoster } from "./store";
import { toast } from "./toast";
import type { PaymentStatus } from "./types";
import { PAYMENT_STATUS_LABEL } from "./types";

/** Shift actions with feedback. Deleting always offers Undo. */
export function deleteShiftWithUndo(id: string) {
  const { shifts, deleteShift, restoreShift } = useRoster.getState();
  const shift = shifts.find((s) => s.id === id);
  if (!shift) return;
  deleteShift(id);
  toast(`Deleted ${fmtDow(shift.date)} ${fmtDayNum(shift.date)} shift`, {
    label: "Undo",
    run: () => restoreShift(shift),
  });
}

export function duplicateShiftToNextDay(id: string) {
  const { shifts, duplicateShift, deleteShift } = useRoster.getState();
  const shift = shifts.find((s) => s.id === id);
  if (!shift) return;
  const newId = duplicateShift(id, 1);
  const d = addDays(shift.date, 1);
  if (newId) toast(`Copied to ${fmtDow(d)} ${fmtDayNum(d)}`, { label: "Undo", run: () => deleteShift(newId) });
}

export function setStatusWithToast(ids: string[], status: PaymentStatus) {
  if (!ids.length) return;
  const { shifts, setShiftStatus } = useRoster.getState();
  const before = shifts.filter((s) => ids.includes(s.id)).map((s) => [s.id, s.status] as const);
  setShiftStatus(ids, status);
  const n = ids.length;
  toast(`${n} shift${n > 1 ? "s" : ""} marked ${PAYMENT_STATUS_LABEL[status].toLowerCase()}`, {
    label: "Undo",
    run: () => before.forEach(([id, st]) => useRoster.getState().setShiftStatus([id], st)),
  });
}
