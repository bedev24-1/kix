import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, venues } from "@/db";
import { Photo } from "@/components/ui/Photo";
import { getEvent } from "@/lib/queries";
import { metadonneesApercu, prixLisible } from "@/lib/apercu";
import { soireeTerminee } from "@/lib/soirees";

/**
 * La page publique d'une soirée : celle qu'on partage.
 *
 * Les pages de l'application demandent un compte. Partager leur adresse
 * montrait donc, dans WhatsApp, l'aperçu de la page de connexion. Celle-ci
 * s'ouvre à tous : l'affiche, le jour, le lieu, le prix — et un bouton qui
 * mène à la billetterie, en passant par la connexion s'il le faut.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event || !event.active) return { title: "Soirée introuvable" };
  const salle = event.venueId
    ? (await db.select({ name: venues.name }).from(venues).where(eq(venues.id, event.venueId)).limit(1))[0]
    : null;
  const lieu = salle?.name || event.address;
  return metadonneesApercu({
    titre: event.title,
    description: [
      event.subtitle,
      [event.day, event.hours].filter(Boolean).join(" · "),
      lieu,
      prixLisible(event.price),
      event.description,
    ]
      .filter(Boolean)
      .join(" — "),
    image: event.image,
    chemin: `/e/${event.slug}`,
  });
}

export default async function SoireePublique({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event || !event.active) notFound();
  const salle = event.venueId
    ? (await db.select().from(venues).where(eq(venues.id, event.venueId)).limit(1))[0]
    : null;
  const terminee = soireeTerminee(event.endedAt);
  const billetterie = `/rejoindre?vers=/app/events/${event.slug}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-5 py-6">
      <div className="relative h-72 overflow-hidden rounded-panel border border-line">
        <Photo src={event.image} alt={event.title} fill sizes="600px" className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/35 to-black/90" />
        <div className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5 text-white">
          <span className="w-fit rounded-full border border-gold/45 bg-gold/20 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-gold uppercase">
            {terminee ? "Soirée terminée" : event.day}
          </span>
          <h1 className="text-[26px] leading-7 text-white">{event.title}</h1>
          {event.subtitle ? <p className="text-[13px] text-white/80">{event.subtitle}</p> : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 text-[13px]">
        <Info quoi="Quand" valeur={[event.day, event.hours].filter(Boolean).join(" · ") || "À confirmer"} />
        <Info quoi="Entrée" valeur={prixLisible(event.price)} />
        <Info quoi="Où" valeur={salle?.name || event.address || "À confirmer"} />
        <Info quoi="Places" valeur={`${Math.max(0, event.capacity - event.attendees)} restantes`} />
      </dl>

      {event.address && salle?.name ? <p className="text-[12.5px] text-muted">{event.address}</p> : null}
      {event.description ? <p className="text-[14px] leading-6 whitespace-pre-line text-dim">{event.description}</p> : null}

      {terminee ? (
        <p className="rounded-panel border border-line px-4 py-3 text-[13px] text-muted">Cette soirée est terminée.</p>
      ) : (
        <Link
          href={billetterie}
          className="press flex h-12 items-center justify-center rounded-full bg-gold text-sm font-semibold text-gold-ink"
        >
          {event.price > 0 ? `Prendre ma place · ${prixLisible(event.price)}` : "Réserver ma place"}
        </Link>
      )}
      <p className="text-center text-[11.5px] text-faint">
        Paiement Mobile Money, ou à l&apos;entrée. Un compte Master Break suffit.
      </p>
    </main>
  );
}

function Info({ quoi, valeur }: { quoi: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-panel border border-line px-3.5 py-2.5">
      <dt className="text-[10.5px] tracking-[0.08em] text-muted uppercase">{quoi}</dt>
      <dd className="font-semibold">{valeur}</dd>
    </div>
  );
}
