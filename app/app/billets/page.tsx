import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { QrCode } from "@/components/mb/QrCode";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ArrowRightIcon, TicketIcon } from "@/components/icons";
import { getTickets } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { passUrl, TICKET_TTL } from "@/lib/pass";
import { qrShape } from "@/lib/qr";
import { f } from "@/lib/format";

export const metadata = { title: "Mes billets" };

export default async function BilletsPage() {
  const user = await requireUser();
  const tickets = await getTickets(user.id);

  return (
    <>
      <ScreenHeader title="Mes billets" subtitle="Ton pass est scanné à l\u2019entrée, comme un jeton." back="/app/events" />

      {tickets.length === 0 ? (
        <Card shape="panel" className="mt-4 flex flex-col items-center gap-4 px-5 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
            <TicketIcon size={24} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg">Aucun billet</h2>
            <p className="text-[13px] text-muted">Prends ta place pour le prochain tournoi.</p>
          </div>
          <Link
            href="/app/events"
            className="flex h-12 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-gold-ink"
          >
            Voir les événements
            <ArrowRightIcon size={16} />
          </Link>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      {tickets.map(({ ticket, event }) => (
        <Card key={ticket.id} shape="panel" className="overflow-hidden">
          <div className="relative h-32">
            <Photo src={event.image} alt={event.title} fill sizes="430px" className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/85 to-black/20" />
            <div className="absolute inset-x-4 bottom-3 flex items-end justify-between text-white">
              <span className="flex flex-col">
                <span className="text-[17px] font-bold">{event.title}</span>
                <span className="text-[11px] text-white/75">
                  {event.day} · {event.hours}
                </span>
              </span>
              <Chip tone={ticket.status === "valid" || ticket.status === "guichet" ? "gold" : "neutral"}>
                {ticket.status === "valid" ? "Valide" : ticket.status === "guichet" ? "À régler à l'entrée" : "Utilisé"}
              </Chip>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="rounded-card bg-white p-2">
              <QrCode
                shape={qrShape(
                  passUrl({ k: "ticket", i: ticket.id, c: ticket.code, u: user.id }, TICKET_TTL),
                )}
                size={104}
              />
            </div>
            <div className="flex grow flex-col gap-1.5">
              <span className="label-caps">Code d&apos;entrée</span>
              <span className="text-[24px] font-bold tracking-[0.16em]">{ticket.code}</span>
              <span className="text-[11px] text-muted">
                {event.address} · billet {f(event.price)}
              </span>
              {ticket.status === "guichet" ? (
                <span className="text-[11px] text-gold-text">
                  Présente ce code à l&apos;entrée et règle {f(event.price)} en espèces.
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
      </div>
    </>
  );
}
