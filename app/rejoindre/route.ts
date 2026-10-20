import { NextResponse, type NextRequest } from "next/server";
import { SUITE_COOKIE, suiteValide } from "@/lib/suite";
import { urlPublique } from "@/lib/url-publique";

export const dynamic = "force-dynamic";

/**
 * La porte des liens partagés : `/rejoindre?vers=/app/tournois/open-akwa`.
 *
 * Un joueur qui scanne le QR d'une affiche n'a souvent pas de compte, ou
 * n'est pas connecté sur ce téléphone. Sans cette porte, la connexion le
 * déposait sur l'accueil et il perdait le tournoi en route. On garde sa
 * destination quelques minutes ; la connexion ou l'inscription l'y ramène.
 */
export async function GET(request: NextRequest) {
  const vers = suiteValide(request.nextUrl.searchParams.get("vers"));
  // L'adresse publique, pas `request.url` : derrière le proxy, celle-ci est
  // « localhost:3000 », et la redirection y envoyait le joueur.
  const reponse = NextResponse.redirect(new URL(vers ?? "/app", await urlPublique()));
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
