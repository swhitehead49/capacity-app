import { chooseRoleAction } from "./actions";

export const dynamic = "force-dynamic";

/** The home screen (sean, 15 Nov 2026): no menu, just "who are you?". */
export default function Home() {
  return (
    <>
      <header className="topbar" role="banner"><span>Capacity App</span></header>
      <main className="home">
        <h1>Capacity App</h1>
        <p className="muted">Team capacity per sprint and quarter, and how it splits across the work types.</p>
        <h2>Who are you?</h2>
        <form action={chooseRoleAction} className="role-choice">
          <button type="submit" name="role" value="admin">
            Admin<span>Set up the reference data: value streams, locations, public holidays and project settings.</span>
          </button>
          <button type="submit" name="role" value="manager">
            Engineering manager<span>Choose your project and plan your teams.</span>
          </button>
        </form>
        <p className="muted">This isn&apos;t a login yet: anyone can choose either. Personal logins will come later.</p>
      </main>
    </>
  );
}
