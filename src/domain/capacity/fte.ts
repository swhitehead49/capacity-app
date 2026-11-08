/** Hours a person is contracted for, compared with full time at their location. */
export interface Contract {
  contractedHours: number; // hours per week in the person's contract
  standardHours: number; // full-time hours per week at their location
}

/** A contract plus the share of that time given to one team (0 to 1). */
export interface TeamAssignment extends Contract {
  teamAllocation: number;
}

/** Step 1 (requirements §3): contracted hours ÷ standard hours. */
export function contractedFte({ contractedHours, standardHours }: Contract): number {
  return contractedHours / standardHours;
}

/** Step 2 (requirements §3): contracted FTE × team allocation. */
export function allocatedFte(assignment: TeamAssignment): number {
  return contractedFte(assignment) * assignment.teamAllocation;
}
