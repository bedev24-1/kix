import { notFound } from "next/navigation";
import { etatBarre } from "@/lib/barre";
import { Incrustation } from "@/components/live/barre/Incrustation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Barre Master Break",
  robots: { index: false, follow: false },
};

/**
 * L'incrustation d'un match, pour OBS (« Source navigateur », 1920 × 1080) ou
 * un écran : fond transparent, la Barre Master Break par-dessus la vidéo.
 * Publique comme le score du match : on peut la coller sans se connecter.
 *
 * ?sans=coin,sponsor,chrono,annonce,direct — masquer un élément.
 * ?fond=table — un fond de table, pour l'essayer hors d'OBS.
 */
export default async function IncrustationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sans?: string; fond?: string }>;
}) {
  const [{ id }, { sans, fond }] = await Promise.all([params, searchParams]);
  const etat = await etatBarre(id);
  if (!etat) notFound();
  const caches = new Set((sans ?? "").split(",").map((s) => s.trim()));
  return (
    <Incrustation
      initial={etat}
      fond={fond === "table"}
      options={{
        coin: !caches.has("coin"),
        sponsor: !caches.has("sponsor"),
        chrono: !caches.has("chrono"),
        annonce: !caches.has("annonce"),
        direct: !caches.has("direct"),
      }}
    />
  );
}
