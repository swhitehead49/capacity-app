import type { ReactNode } from "react";
import "./styles.css";

export const metadata = { title: "Capacity App" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/">Capacity App</a>
          <nav><a href="/teams">Teams</a><a href="/holidays">Holidays</a></nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
