import { NextResponse, type NextRequest } from "next/server";
import { SUITE_COOKIE, suiteValide } from "@/lib/suite";

export const dynamic = "force-dynamic";

/**
 * La porte des liens partagés : `/rejoindre?vers=/app/tournois/open-akwa`.
 *
 * Un joueur qui scanne le QR d'une affiche n'a souvent pas de compte, ou
 * n'est pas connecté sur ce téléphone. Sans cette porte, la connexion le
 * déposait sur l'accueil et il perdait le tournoi en route. On garde sa
 * destination quelques minutes ; la connexion ou l'inscription l'y ramène.
 */
export function GET(request: NextRequest) {
  const vers = suiteValide(request.nextUrl.searchParams.get("vers"));
  const reponse = NextResponse.redirect(new URL(vers ?? "/app", request.url));
  if (vers) {
    reponse.cookies.set(SUITE_COOKIE, vers, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });
  }
  return reponse;
}
