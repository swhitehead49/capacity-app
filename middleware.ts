import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "./src/infrastructure/web/passwordGate";
import { projectInAddress } from "./src/domain/projects/projectRules";
import { PROJECT_COOKIE, ROLE_COOKIE } from "./app/lib/rememberedProject";
import { accessFor, parseRole } from "./src/domain/access/roles";

/** Asks for the shared password (APP_PASSWORD) on every page when the app is hosted, sends you to the home screen
 *  until you have said who you are (keeping Engineering managers out of Reference data), and remembers your project. */
export function middleware(request: NextRequest) {
  if (isAllowed(request.headers.get("authorization"), process.env.APP_PASSWORD)) {
    const access = accessFor(parseRole(request.cookies.get(ROLE_COOKIE)?.value), request.nextUrl.pathname);
    if (!access.allowed) return NextResponse.redirect(new URL(access.goTo, request.url), 303);
    const response = NextResponse.next();
    const project = projectInAddress(request.nextUrl.pathname);
    if (project && request.cookies.get(PROJECT_COOKIE)?.value !== project) {
      response.cookies.set(PROJECT_COOKIE, project, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
    }
    return response;
  }
  return new NextResponse("Password needed", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Capacity App", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"] };
