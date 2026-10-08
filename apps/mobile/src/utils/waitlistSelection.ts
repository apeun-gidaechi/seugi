export type WaitlistRole = "STUDENT" | "TEACHER";
export type WaitlistSelection = Record<WaitlistRole, string[]>;

export function toggleWaitlistSelection(
  current: WaitlistSelection,
  role: WaitlistRole,
  memberId: string,
): WaitlistSelection {
  const selected = current[role];
  return {
    ...current,
    [role]: selected.includes(memberId)
      ? selected.filter((id) => id !== memberId)
      : [...selected, memberId],
  };
}

export function waitlistSelectionCount(
  roles: readonly WaitlistRole[],
  selection: WaitlistSelection,
) {
  return roles.reduce((count, role) => count + selection[role].length, 0);
}

export function waitlistSelectionBatch(
  roles: readonly WaitlistRole[],
  selection: WaitlistSelection,
): Array<[WaitlistRole, string[]]> {
  const batch: Array<[WaitlistRole, string[]]> = [];
  for (const role of roles) {
    if (selection[role].length > 0) batch.push([role, [...selection[role]]]);
  }
  return batch;
}

export function clearProcessedWaitlistSelection(
  selection: WaitlistSelection,
  processed: Partial<Record<WaitlistRole, readonly string[]>>,
): WaitlistSelection {
  return {
    STUDENT: selection.STUDENT.filter((id) => !processed.STUDENT?.includes(id)),
    TEACHER: selection.TEACHER.filter((id) => !processed.TEACHER?.includes(id)),
  };
}
