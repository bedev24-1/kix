import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ChevronLeftIcon, TicketIcon } from "@/components/icons";
import { getEventAttendees, getTournoiDeLEvenement, getVenueEvents } from "@/lib/queries";
import { cloreEvenement } from "@/lib/actions";
import { etatSoiree, ETATS_SOIREE, soireeTerminee } from "@/lib/soirees";
import { requireRole } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { f, fcfa } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PartageEvenement } from "@/components/tournoi/Partage";
import { Drawer } from "@/components/admin/AdminUI";
import { Promouvoir } from "@/components/gerant/Promouvoir";
import { db, promotions, tarifsPromo } from "@/db";
import { desc, eq } from "drizzle-orm";
import { VitrineForm } from "@/components/admin/VitrineForm";

export const dynamic = "force-dynamic";

const ETAT: Record<string, { label: string; ton: string }> = {
  valid: { label: "à venir", ton: "border-gold/40 bg-gold/12 text-gold-text" },
  used: { label: "entré", ton: "border-jade/40 bg-jade/12 text-jade-text" },
  pending: { label: "en attente", ton: "border-warn/40 bg-warn/12 text-warn" },
  failed: { label: "échoué", ton: "border-line bg-surface-2 text-muted" },
  guichet: { label: "paiera à l'entrée", ton: "border-gold/40 bg-gold/12 text-gold-text" },
};

export default async function GerantEvenement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) notFound();

  // On repasse par les événements de la salle : un identifiant deviné dans
  // l'URL ne doit pas ouvrir l'agenda du voisin.
  const ligne = (await getVenueEvents(manager.venueId)).find((l) => l.event.id === id);
  if (!ligne) notFound();

  const { event, vendus, entres, attente, recette } = ligne;
  const [participants, jumeau] = await Promise.all([
    getEventAttendees(event.id),
    getTournoiDeLEvenement(event.id),
  ]);
  const terminee = soireeTerminee(event.endedAt);
  const [tarifs, promos] = await Promise.all([
    db.select().from(tarifsPromo).where(eq(tarifsPromo.actif, true)).orderBy(tarifsPromo.prix),
    db.select().from(promotions).where(eq(promotions.eventId, event.id)).orderBy(desc(promotions.createdAt)),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/gerant/evenements" className="press flex w-fit items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ChevronLeftIcon size={15} /> Les événements
      </Link>

      <PartageEvenement titre={event.title} slug={event.slug} imprimable />

      <Promouvoir
        eventId={event.id}
        phone={manager.phone}
        tarifs={tarifs.map((t) => ({ formule: t.formule, nom: t.nom, prix: t.prix, jours: t.jours }))}
        promos={promos.map((p) => ({
          id: p.id,
          formule: p.formule,
          status: p.status,
          prix: p.prix,
          debut: p.debut?.toISOString() ?? null,
          fin: p.fin?.toISOString() ?? null,
          motif: p.motifRefus,
        }))}
      />

      <Drawer summary="Page publique : vidéo, galerie, artistes, musique">
        <div className="pt-3">
          <VitrineForm id={event.id} slug={event.slug} vitrine={event.vitrine ?? {}} />
        </div>
      </Drawer>

      <div className="flex gap-3.5">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-panel">
          <Photo src={event.image} alt="" fill sizes="80px" className="object-cover" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[19px] leading-tight lg:text-[26px]">{event.title}</h1>
          <p className="text-[13px] text-muted">
            {event.day} · {event.hours} · {event.price > 0 ? f(event.price) : "entrée libre"}
          </p>
          <span
            className={cn(
              "w-fit rounded-full border px-2.5 py-0.5 text-[10.5px]",
              terminee
                ? "border-line bg-surface-2 text-muted"
                : "border-jade/40 bg-jade/12 text-jade-text",
            )}
          >
            {ETATS_SOIREE[etatSoiree(event)]}
          </span>
        </div>
      </div>

      {/* Une soirée finit : sans ce bouton, l'affiche restait « en cours » des
          semaines après, et la billetterie vendait encore des places. Un
          tournoi, lui, referme sa soirée tout seul à la finale. */}
      <form action={cloreEvenement} className="flex items-center gap-3">
        <input type="hidden" name="id" value={event.id} />
        {terminee ? <input type="hidden" name="rouvrir" value="on" /> : null}
        <button className="press h-11 rounded-full border border-line px-4 text-[13px] text-dim transition hover:text-ink">
          {terminee ? "Rouvrir la soirée" : "Clore la soirée"}
        </button>
        <span className="text-[12px] text-muted">
          {terminee
            ? "Les billets déjà émis restent valables au scan."
            : "Après clôture, plus aucun billet ne se vend."}
        </span>
      </form>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Chiffre valeur={fcfa(Number(recette) + (jumeau?.droits ?? 0))} quoi="encaissé" tone="gold" />
        <Chiffre valeur={`${Number(vendus)} / ${event.capacity}`} quoi="places vendues" />
        <Chiffre valeur={String(Number(entres))} quoi="entrés" />
        <Chiffre valeur={String(Number(attente))} quoi="en attente" />
      </div>

      {/* Sur une soirée de tournoi, les joueurs paient un droit d'inscription :
          c'est souvent le gros de la recette, et il n'apparaissait pas ici. */}
      {jumeau ? (
        <Card shape="panel" className="flex flex-col gap-2.5 p-4">
          <span className="label-caps text-[10px]">Le tournoi</span>
          <div className="grid grid-cols-3 gap-2.5">
            <Chiffre valeur={String(jumeau.inscrits)} quoi="joueurs retenus" />
            <Chiffre valeur={String(jumeau.candidats)} quoi="candidatures" />
            <Chiffre valeur={fcfa(jumeau.droits)} quoi="droits encaissés" />
          </div>
          <p className="text-[12px] text-muted">
            Billetterie spectateurs : {fcfa(Number(recette))} · droits joueurs : {fcfa(jumeau.droits)}.
          </p>
          <Link
            href={`/gerant/tournois/${jumeau.tournoi.id}`}
            className="press w-fit text-[12.5px] text-gold-text"
          >
            Ouvrir le tournoi
          </Link>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px]">
          Les participants
          <span className="ml-2 text-[13px] text-muted">{participants.length}</span>
        </h2>

        {participants.length === 0 ? (
          <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-muted">
              <TicketIcon size={20} />
            </span>
            <p className="text-[13px] text-muted">Personne n&apos;a encore pris sa place.</p>
          </Card>
        ) : null}

        <div className="flex flex-col gap-2">
          {participants.map(({ ticket, user, paye }) => {
            const etat = ETAT[ticket.status] ?? ETAT.failed;
            return (
              <Card key={ticket.id} shape="panel" className="flex items-center gap-3 p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-dim">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>

                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[14px] font-semibold">{user.name}</span>
                  <span className="text-[12px] text-muted">{displayPhone(user.phone)}</span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10.5px]", etat.ton)}>{etat.label}</span>
                  <span className="text-[12px] text-muted">{paye ? fcfa(paye) : "gratuit"}</span>
                </span>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Chiffre({ valeur, quoi, tone }: { valeur: string; quoi: string; tone?: "gold" }) {
  return (
    <Card shape="panel" tone={tone} className="flex flex-col gap-0.5 px-3.5 py-3.5">
      <span className={cn("text-[19px] leading-tight font-bold tracking-[-0.02em]", tone === "gold" && "text-gold-text")}>
        {valeur}
      </span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
