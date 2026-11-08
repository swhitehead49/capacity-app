import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "./src/infrastructure/web/passwordGate";

/** Asks for the shared password (APP_PASSWORD) on every page when the app is hosted. */
export function middleware(request: NextRequest) {
  if (isAllowed(request.headers.get("authorization"), process.env.APP_PASSWORD)) return NextResponse.next();
  return new NextResponse("Password needed", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Capacity App", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
