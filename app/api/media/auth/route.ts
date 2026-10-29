import { timingSafeEqual } from "node:crypto";
import { db, screens, streams, users } from "@/db";
import { eq } from "drizzle-orm";
import { lireBilletEcran } from "@/lib/screens";
import { canWatch, getStreamByPath, readTicket } from "@/lib/stream";

export const dynamic = "force-dynamic";

/**
 * Crochet d'authentification de MediaMTX.
 *
 * Le serveur média ne décide rien : à chaque connexion — diffuseur ou
 * spectateur — il nous demande ici si elle est autorisée, et attend un 200.
 * L'autorisation de regarder vit donc au même endroit que le reste des droits
 * de l'application (`canWatch`), et non dupliquée dans un fichier de config.
 *
 * https://github.com/bluenviron/mediamtx#authentication
 */
type Hook = {
  user?: string;
  password?: string;
  /** `Authorization: Bearer <clé>` arrive ici, pas dans `password`. */
  token?: string;
  ip?: string;
  action?: string;
  path?: string;
  protocol?: string;
  id?: string;
  query?: string;
};

const deny = (reason: string) => Response.json({ error: reason }, { status: 401 });
const allow = () => new Response(null, { status: 200 });

/** Comparaison en temps constant, longueurs différentes comprises. */
function sameSecret(given: string, expected: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  let hook: Hook;
  try {
    hook = await request.json();
  } catch {
    return deny("corps illisible");
  }

  const path = (hook.path ?? "").replace(/^\/+/, "");
  const query = new URLSearchParams(hook.query ?? "");

  // L'API et les métriques de MediaMTX ne passent pas par l'application.
  if (hook.action && !["publish", "read", "playback"].includes(hook.action)) return deny("action refusée");
  if (!path) return deny("chemin absent");

  const stream = await getStreamByPath(path);
  if (!stream) return deny("direct inconnu");

  /* ------------------------------------------------------------- diffusion */
  if (hook.action === "publish") {
    // Chaque transport apporte la clé à sa façon, et MediaMTX nous la relaie
    // dans un champ différent selon les cas :
    //
    //   · WHIP navigateur → `Authorization: Bearer <clé>` → champ `token` ;
    //   · OBS / RTMP      → identifiants d'URL           → `user` / `password` ;
    //   · lien simple     → `?key=` ou `?pass=`          → `query`.
    //
    // `token` manquait. Comme nos clés sont en base64url, elles ne contiennent
    // jamais de deux-points — or MediaMTX ne coupe un Bearer en user:pass que
    // s'il en trouve un. Toute diffusion depuis le navigateur arrivait donc
    // avec une clé vide, et repartait en « clé refusée ».
    //
    // Permissif sur le transport, strict sur la valeur.
    const given = hook.token || hook.password || query.get("key") || query.get("pass") || hook.user || "";
    if (!sameSecret(given, stream.streamKey)) return deny("clé de diffusion invalide");

    await db
      .update(streams)
      .set({ status: "live", startedAt: stream.startedAt ?? new Date(), endedAt: null, updatedAt: new Date() })
      .where(eq(streams.id, stream.id));
    // La caméra s'allume : ceux qui suivent ce diffuseur l'apprennent. Sur la
    // transition seulement — MediaMTX rappelle ce hook à chaque reconnexion.
    if (stream.status !== "live") {
      const { prevenirLesAbonnes } = await import("@/lib/suivis");
      await prevenirLesAbonnes(stream).catch(() => 0);
      // Et tous ceux qui ont touché « Me prévenir » sur l'accueil.
      const { prevenirLesRappels } = await import("@/lib/rappels");
      await prevenirLesRappels(stream).catch(() => 0);
    }
    return allow();
  }

  /* -------------------------------------------------------------- lecture */
  if (stream.access === "free") return allow();

  const ticket = query.get("mb");
  if (!ticket) return deny("billet requis");

  // Un téléviseur de la salle porte son propre billet : il n'a pas de compte.
  // Il n'ouvre que les directs de la salle qui l'a adopté — sans quoi un écran
  // servirait à regarder gratuitement le direct payant d'une autre salle.
  const ecran = lireBilletEcran(ticket);
  if (ecran.ok) {
    if (ecran.streamId !== stream.id) return deny("billet émis pour un autre direct");
    const ligne = (await db.select().from(screens).where(eq(screens.id, ecran.screenId)).limit(1))[0];
    if (!ligne) return deny("écran inconnu");
    if (ligne.venueId !== stream.venueId) return deny("écran d'une autre salle");
    return allow();
  }

  const check = readTicket(ticket);
  if (!check.ok) return deny(check.reason);
  if (check.streamId !== stream.id) return deny("billet émis pour un autre direct");

  const viewer = (await db.select().from(users).where(eq(users.id, check.userId)).limit(1))[0];
  if (!viewer) return deny("spectateur inconnu");

  // On rejoue la règle au lieu de se fier au billet : un accès retiré entre
  // l'émission et la lecture doit fermer la porte tout de suite.
  const access = await canWatch(viewer, stream);
  if (!access.ok) return deny(access.reason === "ppv" ? "billet vidéo non payé" : "réservé aux abonnés");

  return allow();
}
