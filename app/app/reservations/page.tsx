import Link from "next/link";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { CancelReservation } from "@/components/mb/CancelReservation";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ArrowRightIcon, ClockIcon, PinIcon, TableIcon, UserIcon } from "@/components/icons";
import { getReservations } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { fcfa } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes réservations" };

const chips: Record<string, { label: string; tone: "gold" | "jade" | "neutral" }> = {
  pending: { label: "Acompte en attente", tone: "neutral" },
  confirmed: { label: "Confirmée", tone: "gold" },
  seated: { label: "En cours", tone: "jade" },
  done: { label: "Terminée", tone: "neutral" },
  cancelled: { label: "Annulée", tone: "neutral" },
  no_show: { label: "Absent", tone: "neutral" },
};

/** 90 → « 1 h 30 ». */
const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!h) return `${rest} min`;
  return rest ? `${h} h ${rest}` : `${h} h`;
};

const when = (d: Date) =>
  new Date(d).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    // Le serveur tourne en UTC : l'heure s'affiche à l'heure du Cameroun, comme la salle la lit.
    timeZone: "Africa/Douala",
  });

export default async function ReservationsPage() {
  const user = await requireUser();
  const bookings = await getReservations(user.id);

  return (
    <>
      <ScreenHeader
        title="Mes réservations"
        subtitle="Ta table est gardée jusqu'à 20 minutes après l'heure dite."
        back="/app/salles"
      />

      {bookings.length === 0 ? (
        <Card shape="panel" className="mt-4 flex flex-col items-center gap-4 px-5 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
            <TableIcon size={24} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg">Aucune table retenue</h2>
            <p className="text-[13px] text-muted">Choisis une salle et garde ta table pour ce soir.</p>
          </div>
          <Link
            href="/app/salles"
            className="press go flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-ink"
          >
            Voir les salles
            <ArrowRightIcon size={16} />
          </Link>
        </Card>
      ) : (
        <div className="stagger flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
          {bookings.map(({ reservation, venue, table }) => {
            const chip = chips[reservation.status] ?? chips.confirmed;
            const upcoming = ["pending", "confirmed"].includes(reservation.status);
            return (
              <Card key={reservation.id} shape="panel" className="flex flex-col gap-3.5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold">{venue.name}</span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      <PinIcon size={12} />
                      {venue.address}
                    </span>
                  </span>
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                </div>

                <div className="grid grid-cols-2 gap-2.5 border-t border-line pt-3 text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-muted">
                    <ClockIcon size={13} />
                    <span className="text-ink first-letter:uppercase">{when(reservation.startsAt)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <TableIcon size={13} />
                    <span className="text-ink">
                      {table?.label ?? "table à placer"} · {duration(reservation.minutes)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <UserIcon size={13} />
                    <span className="text-ink">{reservation.players} joueurs</span>
                  </span>
                  <span className="text-muted">
                    {reservation.deposit > 0 ? (
                      <>Acompte <span className="text-gold-text">{fcfa(reservation.deposit)}</span></>
                    ) : (
                      <span className="text-gold-text">Paiement à la caisse</span>
                    )}
                  </span>
                </div>

                {reservation.note ? (
                  <p className="rounded-none bg-surface px-3 py-2.5 text-[12px] text-muted">
                    « {reservation.note} »
                  </p>
                ) : null}

                {upcoming ? <CancelReservation id={reservation.id} acompte={reservation.deposit} /> : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
