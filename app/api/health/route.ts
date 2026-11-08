// Render checks this to know the app is up. Kept outside the password gate.
export function GET() {
  return Response.json({ ok: true });
}
