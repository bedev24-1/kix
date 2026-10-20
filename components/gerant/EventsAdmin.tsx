import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { Drawer, Field, SubmitButton, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, CalendarIcon, TicketIcon } from "@/components/icons";
import { saveEvent } from "@/lib/actions";
import { soireeTerminee } from "@/lib/soirees";
import { f, fcfa } from "@/lib/format";
import { cn } from "@/lib/cn";

export type EventRowView = {
  id: string;
  endedAt: Date | null;
  slug: string;
  title: string;
  day: string;
  hours: string;
  price: number;
  capacity: number;
  image: string;
  active: boolean;
  vendus: number;
  entres: number;
  attente: number;
  recette: number;
};

/**
 * L'agenda de la salle.
 *
 * Dessiné pour le téléphone d'abord : un gérant regarde ses chiffres debout
 * derrière son comptoir, pas assis devant un écran large.
 */
export function EventsAdmin({ rows }: { rows: EventRowView[] }) {
  const recette = rows.reduce((n, r) => n + r.recette, 0);
  const vendus = rows.reduce((n, r) => n + r.vendus, 0);
  const aVenir = rows.filter((r) => r.active && !soireeTerminee(r.endedAt)).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl lg:text-[26px]">Les événements</h1>
        <p className="text-[13px] text-muted">Tes soirées, ce qu&apos;elles ont rapporté, et qui vient.</p>
      </header>

      {/* Une soirée se décide au comptoir, la veille : le gérant n'avait
          jusqu'ici aucun moyen de la créer sans passer par l'administration.
          La salle n'est pas demandée — c'est la sienne, imposée côté serveur. */}
      <Drawer summary="＋ Créer une soirée">
        <form action={saveEvent} className="grid gap-3 pt-3 sm:grid-cols-2">
          <Field label="Titre" name="title" required className="sm:col-span-2" />
          <Field label="Sous-titre" name="subtitle" className="sm:col-span-2" />
          <Field label="Jour" name="day" placeholder="Samedi 03 octobre" />
          <Field label="Horaires" name="hours" placeholder="18:00 → 23:30" />
          <Field label="Check-in" name="checkin" placeholder="dès 17:30" />
          <Field label="Prix du billet (F)" name="price" type="number" min={0} defaultValue={2000} />
          <Field label="Capacité" name="capacity" type="number" min={0} defaultValue={120} />
          <Field label="Tags (virgules)" name="tags" placeholder="Soirée,8-ball" />
          <ImageField name="image" dossier="evenements" defaultValue="/img/crowd-lights.jpg" />
          <Field label="Adresse" name="address" className="sm:col-span-2" />
          <TextArea label="Description" name="description" className="sm:col-span-2" />
          <input type="hidden" name="active" value="on" />
          <div className="flex items-end sm:col-span-2">
            <SubmitButton>Créer la soirée</SubmitButton>
          </div>
        </form>
      </Drawer>

      <div className="grid grid-cols-3 gap-2.5">
        <Chiffre valeur={fcfa(recette)} quoi="encaissé" tone="gold" />
        <Chiffre valeur={String(vendus)} quoi={vendus > 1 ? "billets vendus" : "billet vendu"} />
        <Chiffre valeur={String(aVenir)} quoi={aVenir > 1 ? "à l'affiche" : "à l'affiche"} />
      </div>

      {rows.length === 0 ? (
        <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
            <CalendarIcon size={24} />
          </span>
          <h2 className="text-lg">Aucun événement</h2>
          <p className="max-w-sm text-[13px] text-muted">
            Crée ta première soirée ci-dessus : elle apparaîtra ici avec sa recette et ses inscrits.
          </p>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/gerant/evenements/${row.id}`}
            className="press block"
          >
            <Card shape="panel" className="flex flex-col gap-3.5 overflow-hidden p-3.5">
              <div className="flex gap-3.5">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card">
                  <Photo src={row.image} alt="" fill sizes="64px" className="object-cover" />
                </span>

                <span className="flex min-w-0 grow flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold">{row.title}</span>
                    {soireeTerminee(row.endedAt) ? (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                        terminé
                      </span>
                    ) : !row.active ? (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                        masqué
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-[12px] text-muted">
                    {row.day} · {row.hours} · {row.price > 0 ? f(row.price) : "entrée libre"}
                  </span>
                  <span className="text-[12px] text-gold-text">{fcfa(row.recette)} encaissés</span>
                </span>

                <ArrowRightIcon size={16} className="mt-1 shrink-0 text-muted" />
              </div>

              {/* Le remplissage se lit d'un coup d'œil : c'est la question
                  qu'on se pose la veille d'une soirée. */}
              <Jauge vendus={row.vendus} capacity={row.capacity} />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <TicketIcon size={13} /> {row.vendus} / {row.capacity} places
                </span>
                <span>{row.entres} entrés</span>
                {row.attente > 0 ? <span className="text-warn">{row.attente} en attente</span> : null}
                {!soireeTerminee(row.endedAt) ? <span className="ml-auto font-semibold text-gold-text">Promouvoir →</span> : null}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Chiffre({ valeur, quoi, tone }: { valeur: string; quoi: string; tone?: "gold" }) {
  return (
    <Card
      shape="panel"
      tone={tone}
      className="flex flex-col gap-0.5 px-3 py-3.5"
    >
      <span className={cn("text-[18px] leading-tight font-bold tracking-[-0.02em] lg:text-[24px]", tone === "gold" && "text-gold-text")}>
        {valeur}
      </span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}

function Jauge({ vendus, capacity }: { vendus: number; capacity: number }) {
  const part = capacity > 0 ? Math.min(100, Math.round((vendus / capacity) * 100)) : 0;
  const complet = capacity > 0 && vendus >= capacity;
  return (
    <span className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <span
        className={cn("h-full rounded-full transition-[width]", complet ? "bg-jade-clair" : "bg-gold")}
        style={{ width: `${part}%` }}
      />
    </span>
  );
}
