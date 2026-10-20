import { asc, desc, eq, inArray } from "drizzle-orm";
import { db, events, promotions, tarifsPromo, users, venues } from "@/db";
import { PageHead, Pill, SubmitButton, Table, Td } from "@/components/admin/AdminUI";
import { DecisionsPromo } from "@/components/admin/PromotionsAdmin";
import { modifierTarif } from "@/lib/actions-promo";
import { CAPACITE } from "@/lib/promotions";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotions" };

const ETATS: Record<string, string> = { demande: "À valider", valide: "Validée · à payer", payee: "Programmée", refusee: "Refusée" };

/** Les promotions des gérants : les tarifs, les demandes, et la file de la vitrine. */
export default async function AdminPromotions() {
  await requireRole("admin");
  const [tarifs, lignes] = await Promise.all([
    db.select().from(tarifsPromo).orderBy(asc(tarifsPromo.prix)),
    db
      .select({ promo: promotions, event: { id: events.id, title: events.title, slug: events.slug }, venue: venues.name, gerant: users.name })
      .from(promotions)
      .innerJoin(events, eq(events.id, promotions.eventId))
      .leftJoin(venues, eq(venues.id, events.venueId))
      .leftJoin(users, eq(users.id, promotions.demandeurId))
      .where(inArray(promotions.status, ["demande", "valide", "payee", "refusee"]))
      .orderBy(desc(promotions.createdAt)),
  ]);
  const nom = (f: string) => tarifs.find((t) => t.formule === f)?.nom ?? f;
  const jour = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Douala" }) : "—");
  const demandes = lignes.filter((l) => l.promo.status === "demande");
  const file = lignes.filter((l) => l.promo.status === "payee").sort((a, b) => (a.promo.debut?.getTime() ?? 0) - (b.promo.debut?.getTime() ?? 0));
  const autres = lignes.filter((l) => l.promo.status === "valide" || l.promo.status === "refusee");

  return (
    <>
      <PageHead
        title="Promotions des événements"
        subtitle={`Places à la fois : ${CAPACITE.une} à la une, ${CAPACITE.sponsorise} sponsorisés, ${CAPACITE.popup} pop-up. Au plus une notification promotionnelle par joueur et par jour.`}
      />

      <section className="flex flex-col gap-3 border border-line p-4">
        <h2 className="text-[14px] font-semibold">Formules et prix</h2>
        <div className="flex flex-col gap-2">
          {tarifs.map((t) => (
            <form key={t.formule} action={modifierTarif} className="grid items-end gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto_auto]">
              <input type="hidden" name="formule" value={t.formule} />
              <span className="pb-2.5 text-[13px] font-semibold">{t.nom}</span>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">Prix (F)</span>
                <input name="prix" type="number" min={0} defaultValue={t.prix} className="h-10 rounded-none border border-line bg-surface px-3 text-[13px] text-ink" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">Jours</span>
                <input name="jours" type="number" min={1} defaultValue={t.jours} className="h-10 rounded-none border border-line bg-surface px-3 text-[13px] text-ink" />
              </label>
              <label className="flex items-center gap-2 pb-2.5 text-[12px]">
                <input type="checkbox" name="actif" defaultChecked={t.actif} /> Proposée
              </label>
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          ))}
        </div>
      </section>

      <h2 className="text-[15px] font-semibold">Demandes à valider · {demandes.length}</h2>
      {demandes.length ? (
        <Table head={["Événement", "Formule", "Prix", "À partir du", "Gérant", ""]}>
          {demandes.map(({ promo, event, venue, gerant }) => (
            <tr key={promo.id}>
              <Td>
                <a href={`/e/${event.slug}`} target="_blank" className="font-semibold underline">
                  {event.title}
                </a>
                <span className="block text-[11px] text-muted">{venue ?? ""}</span>
              </Td>
              <Td>{nom(promo.formule)}</Td>
              <Td>{promo.prix.toLocaleString("fr-FR")} F</Td>
              <Td className="text-muted">{jour(promo.debutSouhaite)}</Td>
              <Td className="text-muted">{gerant ?? "—"}</Td>
              <Td>
                <DecisionsPromo id={promo.id} />
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <p className="text-[13px] text-muted">Aucune demande en attente.</p>
      )}

      <h2 className="text-[15px] font-semibold">File de la vitrine</h2>
      <Table head={["Événement", "Formule", "Du", "Au", "Origine", "Notification"]}>
        {file.map(({ promo, event }) => (
          <tr key={promo.id}>
            <Td className="font-semibold">{event.title}</Td>
            <Td>{nom(promo.formule)}</Td>
            <Td>{jour(promo.debut)}</Td>
            <Td>{jour(promo.fin)}</Td>
            <Td className="text-muted">{promo.source === "admin" ? "Offerte" : "Payée"}</Td>
            <Td className="text-muted">{promo.notifEnvoyee ? "Envoyée" : promo.formule === "notification" || promo.formule === "pack" ? "Au début" : "—"}</Td>
          </tr>
        ))}
      </Table>

      {autres.length ? (
        <>
          <h2 className="text-[15px] font-semibold">Validées ou refusées</h2>
          <Table head={["Événement", "Formule", "État"]}>
            {autres.map(({ promo, event }) => (
              <tr key={promo.id}>
                <Td>{event.title}</Td>
                <Td>{nom(promo.formule)}</Td>
                <Td>
                  <Pill tone={promo.status === "valide" ? "gold" : "neutral"}>{ETATS[promo.status]}</Pill>
                </Td>
              </tr>
            ))}
          </Table>
        </>
      ) : null}
    </>
  );
}
