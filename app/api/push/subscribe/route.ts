import { and, eq } from "drizzle-orm";
import { db, pushSubscriptions } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { uid } from "@/lib/domain";

export const dynamic = "force-dynamic";

/**
 * Enregistrer — ou retirer — le navigateur d'un compte.
 *
 * L'endpoint identifie le navigateur et change à chaque réinstallation. On le
 * réattribue au compte connecté plutôt que de refuser : un téléphone prêté,
 * puis repris, ne doit pas envoyer les notifications de l'un à l'autre.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Connecte-toi." }, { status: 401 });

  const corps = (await request.json().catch(() => null)) as {
    provider?: string;
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;

  // Deux formes d'abonnement : l'endpoint du protocole standard, une URL, et
  // le jeton d'enregistrement Firebase, qui n'en est pas une. On ne peut donc
  // pas valider les deux de la même façon.
  const provider = corps?.provider === "fcm" ? "fcm" : "web";
  const endpoint = corps?.endpoint?.trim();
  const p256dh = corps?.keys?.p256dh?.trim() ?? "";
  const auth = corps?.keys?.auth?.trim() ?? "";

  const valide =
    provider === "fcm"
      ? Boolean(endpoint && endpoint.length > 20 && !endpoint.includes(" "))
      : Boolean(endpoint && endpoint.startsWith("https://"));
  if (!endpoint || !valide) {
    return Response.json({ ok: false, error: "Abonnement invalide." }, { status: 400 });
  }

  const existant = (
    await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).limit(1)
  )[0];

  const champs = {
    userId: user.id,
    provider,
    p256dh,
    auth,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
    lastSeenAt: new Date(),
  };

  if (existant) await db.update(pushSubscriptions).set(champs).where(eq(pushSubscriptions.id, existant.id));
  else await db.insert(pushSubscriptions).values({ id: uid(), endpoint, ...champs });

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const corps = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (corps?.endpoint) {
    // Seulement les siens : une adresse d'envoi n'est pas un secret.
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, corps.endpoint), eq(pushSubscriptions.userId, user.id)));
  }
  return Response.json({ ok: true });
}
