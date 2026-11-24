-- sean, 24 Nov 2026: Team_Pct imported as a fraction (Excel's 1 = 100%, 0.8 = 80%) was saved as 1% and 0.8%.
-- Any team % of 1% or less is one of those, so multiply it by 100 (1% -> 100%, 0.8% -> 80%).
UPDATE "assignments" SET "team_allocation" = "team_allocation" * 100 WHERE "team_allocation" > 0 AND "team_allocation" <= 0.01;
