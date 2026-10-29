import { Photo } from "@/components/ui/Photo";
import { FloorPlan } from "@/components/mb/FloorPlan";
import { Card, StatBlock } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ClockIcon } from "@/components/icons";
import { getFloor, getVenueReservations } from "@/lib/queries";
import { eq } from "drizzle-orm";
import { db, venues } from "@/db";
import { ChoixPosition } from "@/components/salles/ChoixPosition";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/AdminUI";
import { definirLogoSalle } from "@/lib/actions-salles";
import { joueursActifs } from "@/lib/presences";
import { requireRole } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de salle" };

const hhmm = (d: Date) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const statusChip: Record<string, { label: string; tone: "gold" | "jade" | "neutral" }> = {
  confirmed: { label: "Attendu", tone: "gold" },
  seated: { label: "En jeu", tone: "jade" },
  done: { label: "Terminé", tone: "neutral" },
  cancelled: { label: "Annulé", tone: "neutral" },
  no_show: { label: "Absent", tone: "neutral" },
};

export default async function SallePage() {
  const manager = await requireRole("manager", "admin");
  if (!manager.venueId) {
    return (
      <Card shape="panel" className="flex flex-col gap-2 p-6">
        <h1 className="text-xl">Aucune salle rattachée</h1>
        <p className="text-[13px] text-muted">
          Ce compte n&apos;est pas rattaché à une salle. L&apos;administration peut le faire depuis
          « Utilisateurs ».
        </p>
      </Card>
    );
  }

  const [floor, bookings, salle, actifs] = await Promise.all([
    getFloor(manager.venueId),
    getVenueReservations(manager.venueId),
    db.select().from(venues).where(eq(venues.id, manager.venueId)).limit(1).then((r) => r[0] ?? null),
    joueursActifs(manager.venueId),
  ]);

  const busy = floor.filter((t) => t.table.status === "occupied").length;
  const free = floor.filter((t) => t.table.status === "free").length;
  const expected = bookings.filter((b) => b.reservation.status === "confirmed");
  const deposits = bookings
    .filter((b) => ["confirmed", "seated", "done", "no_show"].includes(b.reservation.status))
    .reduce((sum, b) => sum + b.reservation.deposit, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl lg:text-[26px]">Plan de salle</h1>
          <p className="text-[13px] text-muted">
            {floor.length} tables · état en direct, réservations du soir et acomptes déjà encaissés.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full border border-gold/30 bg-gold/12 px-3 py-2 text-[11px] text-gold-text">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-gold" />
          Service en cours
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatBlock label="Tables libres" value={String(free)} hint={`sur ${floor.length}`} className="rounded-none" tone="jade" />
        <StatBlock label="En jeu" value={String(busy)} hint="tables occupées" className="rounded-none" />
        <StatBlock label="Clients attendus" value={String(expected.length)} hint="réservations confirmées" className="rounded-none" />
        <StatBlock label="Acomptes" value={f(deposits)} hint="déduits des notes" tone="gold" className="rounded-none" />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <FloorPlan floor={floor} />

        <Card shape="panel" className="flex min-h-0 flex-col gap-3.5 p-5">
          <h2 className="text-[17px]">Cahier du soir</h2>

          {bookings.length === 0 ? (
            <p className="text-[13px] text-muted">Aucune réservation aujourd&apos;hui.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {bookings.map(({ reservation, client, table }) => {
                const chip = statusChip[reservation.status] ?? statusChip.confirmed;
                return (
                  <div key={reservation.id} className="flex items-center gap-3 rounded-none bg-surface px-3.5 py-3">
                    {client.avatar ? (
                      <Photo
                        src={client.avatar}
                        alt={client.name}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">
                        {client.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold">{client.name}</span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted">
                        <ClockIcon size={12} />
                        {hhmm(reservation.startsAt)} · {reservation.minutes} min ·{" "}
                        {table?.label ?? "table à placer"}
                      </span>
                    </span>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card shape="panel" className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px]">Position de la salle</h2>
            <p className="text-[12.5px] text-muted">
              {salle?.latitude != null
                ? "Ta salle apparaît sur la carte des joueurs, avec l'itinéraire pour venir."
                : "Ta salle n'est pas encore sur la carte : place-la pour que les joueurs la trouvent et puissent s'y signaler."}
            </p>
          </div>
          {salle ? <ChoixPosition venueId={salle.id} latitude={salle.latitude} longitude={salle.longitude} /> : null}
        </Card>

        {salle ? (
          <Card shape="panel" className="flex flex-col gap-3 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[17px]">Logo de la salle</h2>
              <p className="text-[12.5px] text-muted">
                Il s&apos;affiche en petit, en rond, sur tes directs à l&apos;accueil. Sans logo, ce sont tes initiales.
              </p>
            </div>
            <form action={definirLogoSalle} className="flex flex-col gap-3">
              <input type="hidden" name="venueId" value={salle.id} />
              <ImageField name="logo" dossier="logos" label="Logo" defaultValue={salle.logo} />
              <SubmitButton>Enregistrer le logo</SubmitButton>
            </form>
          </Card>
        ) : null}

        <Card shape="panel" className="flex flex-col gap-3 p-5">
          <h2 className="text-[17px]">Joueurs actifs · {actifs.length}</h2>
          {actifs.length === 0 ? (
            <p className="text-[13px] text-muted">Personne de signalé en ce moment.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {actifs.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 bg-surface px-3 py-2 text-[13px]">
                  <span className="truncate font-semibold">{a.name}</span>
                  <span className="text-[11px] text-muted">
                    {a.comment === "en_jeu" ? "en partie" : a.comment === "a_table" ? "à une table" : "présent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
