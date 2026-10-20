import { desc } from "drizzle-orm";
import { db, popups } from "@/db";
import { PageHead, Pill, Table, Td } from "@/components/admin/AdminUI";
import { GestesPopup, NouveauPopup } from "@/components/admin/PopupsAdmin";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pop-ups" };

/** Les pop-ups promotionnels : les programmer, les arrêter, voir s'ils marchent. */
export default async function AdminPopups() {
  await requireRole("admin");
  const lignes = await popupsAvecEtat();
  const etat = (p: (typeof lignes)[number]) => p.etat;
  const quand = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

  return (
    <>
      <PageHead
        title="Pop-ups promotionnels"
        subtitle="Un seul par visite, jamais plus de fois par jour que ce que tu fixes, toujours fermable."
      />
      <section className="flex flex-col gap-3 border border-line p-4">
        <h2 className="text-[14px] font-semibold">Nouveau pop-up</h2>
        <NouveauPopup />
      </section>

      <Table head={["Pop-up", "Modèle", "Période", "Par jour", "Où", "Vues", "Clics", "Fermés", "État", ""]}>
        {lignes.map((p) => (
          <tr key={p.id}>
            <Td>
              <span className="flex flex-col">
                <span className="font-semibold">{p.titre}</span>
                <span className="max-w-xs truncate text-[11px] text-muted">{p.texte}</span>
              </span>
            </Td>
            <Td>{p.modele === "neon" ? "Néon" : "Cinéma"}</Td>
            <Td className="text-[12px] text-muted">
              {quand(p.debut)} → {quand(p.fin)}
            </Td>
            <Td>{p.parJour}×</Td>
            <Td className="text-muted">{p.pages === "tous" ? "App + site" : p.pages === "app" ? "App" : "Site"}</Td>
            <Td>{p.vues}</Td>
            <Td>
              {p.clics}
              {p.vues ? <span className="text-[11px] text-muted"> ({Math.round((p.clics / p.vues) * 100)} %)</span> : null}
            </Td>
            <Td>{p.fermetures}</Td>
            <Td>
              <Pill tone={etat(p) === "En cours" ? "gold" : "neutral"}>{etat(p)}</Pill>
            </Td>
            <Td>
              <GestesPopup id={p.id} actif={p.actif} />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}

/** Les pop-ups, avec leur état à l'instant de la lecture. */
async function popupsAvecEtat() {
  const lignes = await db.select().from(popups).orderBy(desc(popups.createdAt));
  const maintenant = Date.now();
  return lignes.map((p) => ({
    ...p,
    etat: !p.actif ? "Arrêté" : p.debut.getTime() > maintenant ? "Programmé" : p.fin.getTime() <= maintenant ? "Terminé" : "En cours",
  }));
}
