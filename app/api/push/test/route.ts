import { count, eq } from "drizzle-orm";
import { db, notifications, pushSubscriptions } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { uid } from "@/lib/domain";

export const dynamic = "force-dynamic";

/**
 * S'envoyer une notification d'essai.
 *
 * « J'ai activé, je ne reçois rien » n'est pas diagnosticable depuis un
 * téléphone : on ne sait pas si c'est l'abonnement qui manque, la clé du
 * serveur, ou le service de push qui refuse. Ce bouton pousse pour de vrai et
 * rend le compte exact — combien de navigateurs touchés, combien d'abonnements
 * morts retirés au passage.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Connecte-toi." }, { status: 401 });

  const { envoiPossible, pousser } = await import("@/lib/push");
  if (!envoiPossible()) {
    return Response.json({
      ok: false,
      error: "Aucun chemin d'envoi configuré sur le serveur (clé VAPID ou compte Firebase).",
    });
  }

  // Combien d'appareils sont censés sonner : sans ce compte, on ne saurait pas
  // distinguer « personne n'est inscrit » de « l'envoi a été refusé », et les
  // deux appellent des gestes opposés.
  const inscrits = Number(
    (await db.select({ n: count() }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)))[0]?.n ?? 0,
  );
  if (inscrits === 0) {
    return Response.json({
      ok: false,
      envoyes: 0,
      error: "Aucun navigateur enregistré pour ce compte. Touche « Activer » sur l'appareil qui doit sonner.",
    });
  }

  // Le service worker va chercher la dernière notification du compte : il en
  // faut donc une à trouver, sans quoi il afficherait son message de repli.
  await db.insert(notifications).values({
    id: uid(),
    userId: user.id,
    title: "Essai de notification",
    body: "Si tu lis ceci sur ton écran, tout fonctionne.",
    kind: "system",
    href: "/app/notifications",
    read: false,
  });

  const envoi = await pousser([user.id], "high");

  if (envoi.envoyes === 0) {
    return Response.json({
      ok: false,
      ...envoi,
      error:
        envoi.retires > 0
          ? "Cet abonnement n'était plus valable : il vient d'être retiré. Réactive les notifications sur l'appareil."
          : `Rien n'est parti (${envoi.ignores} appareil${envoi.ignores > 1 ? "s" : ""}). ${envoi.raisons.join(" · ") || "Réactive les notifications sur l'appareil."}`,
    });
  }

  return Response.json({ ok: true, ...envoi });
}
