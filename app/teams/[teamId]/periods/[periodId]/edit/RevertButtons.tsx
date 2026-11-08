"use client";

import { revertAllAction, revertPeriodAction } from "./actions";

/** Revert to the team default: this period only, or all current and future periods (asks first). */
export function RevertButtons({ teamId, periodId, hasOverride }: { teamId: string; periodId: string; hasOverride: boolean }) {
  return (
    <div className="revert">
      <form action={revertPeriodAction}>
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="periodId" value={periodId} />
        <button type="submit" className="secondary" disabled={!hasOverride}>Revert this period to default</button>
      </form>
      <form
        action={revertAllAction}
        onSubmit={(event) => {
          if (!window.confirm("Remove every override for this team on current and future sprints and quarters?")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="teamId" value={teamId} />
        <button type="submit" className="secondary danger">Revert all periods to default</button>
      </form>
    </div>
  );
}
