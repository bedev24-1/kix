import { Drawer, Field, PageHead, Pill, Select, SubmitButton, Table, Td, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { cloreEvenement, deleteEvent, mettreALaUne, saveEvent } from "@/lib/actions";
import { etatSoiree, ETATS_SOIREE, soireeTerminee } from "@/lib/soirees";
import { getAllEvents, getAllVenues } from "@/lib/queries";
import { f } from "@/lib/format";
import { PartageEvenement } from "@/components/tournoi/Partage";
import { VitrineForm } from "@/components/admin/VitrineForm";

export const metadata = { title: "Événements" };

export default async function AdminEvents() {
  const [rows, venues] = await Promise.all([getAllEvents(), getAllVenues()]);
  const venueOptions = venues.map((v) => ({ value: v.id, label: v.name }));

  return (
    <>
      <PageHead title="Événements" subtitle="Tournois et soirées : capacité, prix du billet, salle d'accueil." />

      <Drawer summary="+ Nouvel événement">
        <form action={saveEvent} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Titre" name="title" required className="lg:col-span-2" />
          <Field label="Sous-titre" name="subtitle" className="lg:col-span-2" />
          <Field label="Jour" name="day" placeholder="Samedi 03 octobre" />
          <Field label="Horaires" name="hours" placeholder="18:00 → 23:30" />
          <Field label="Check-in" name="checkin" placeholder="dès 17:30" />
          <Select label="Salle" name="venueId" options={venueOptions} />
          <Field label="Prix (F)" name="price" type="number" defaultValue={3000} />
          <Field label="Capacité" name="capacity" type="number" defaultValue={120} />
          <ImageField name="image" dossier="evenements" defaultValue="/img/crowd-lights.jpg" />
          <Field label="Tags (virgules)" name="tags" placeholder="Tournoi 8-ball,32 joueurs" />
          <Field label="Adresse" name="address" className="lg:col-span-2" />
          <TextArea label="Description" name="description" className="lg:col-span-4" />
          <input type="hidden" name="active" value="on" />
          <div className="flex items-end">
            <SubmitButton>Créer l&apos;événement</SubmitButton>
          </div>
        </form>
      </Drawer>

      <Table head={["Événement", "Salle", "Date", "Billet", "Inscrits", "Vendus", "État", ""]}>
        {rows.map(({ event, venue, sold }) => (
          <tr key={event.id}>
            <Td>
              <span className="flex flex-col">
                <span className="font-semibold">
                  {event.featured ? <span className="mr-1.5 text-gold-text">★</span> : null}
                  {event.title}
                </span>
                <span className="text-[11px] text-muted">{event.subtitle}</span>
              </span>
            </Td>
            <Td className="text-muted">{venue?.name ?? "—"}</Td>
            <Td className="text-muted">{event.day}</Td>
            <Td className="font-semibold">{f(event.price)}</Td>
            <Td>
              {event.attendees} / {event.capacity}
            </Td>
            <Td>{sold}</Td>
            <Td>
              <Pill tone={etatSoiree(event) === "affiche" ? "gold" : "neutral"}>
                {event.active ? ETATS_SOIREE[etatSoiree(event)] : "Archivé"}
              </Pill>
            </Td>
            <Td>
              <div className="flex items-center gap-2">
                <details className="relative">
                  <summary className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[11px] marker:hidden">
                    Éditer
                  </summary>
                  <form
                    action={saveEvent}
                    className="absolute right-0 z-10 mt-2 grid w-80 gap-3 border border-line bg-bg p-4 shadow-[var(--mb-shadow)]"
                  >
                    <input type="hidden" name="id" value={event.id} />
                    <input type="hidden" name="slug" value={event.slug} />
                    <Field label="Titre" name="title" defaultValue={event.title} />
                    <Field label="Sous-titre" name="subtitle" defaultValue={event.subtitle} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Jour" name="day" defaultValue={event.day} />
                      <Field label="Horaires" name="hours" defaultValue={event.hours} />
                      <Field label="Prix (F)" name="price" type="number" defaultValue={event.price} />
                      <Field label="Capacité" name="capacity" type="number" defaultValue={event.capacity} />
                    </div>
                    <Select label="Salle" name="venueId" defaultValue={event.venueId} options={venueOptions} />
                    <Field label="Check-in" name="checkin" defaultValue={event.checkin} />
                    <Field label="Tags" name="tags" defaultValue={event.tags} />
                    <ImageField name="image" dossier="evenements" defaultValue={event.image} />
                    <Field label="Adresse" name="address" defaultValue={event.address} />
                    <TextArea label="Description" name="description" defaultValue={event.description} />
                    <input type="hidden" name="active" value="on" />
                    <SubmitButton />
                  </form>
                </details>
                <details className="relative">
                  <summary className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[11px] marker:hidden">
                    Page publique
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 max-h-[80vh] w-[min(32rem,90vw)] overflow-y-auto border border-line bg-bg p-4 shadow-[var(--mb-shadow)]">
                    <VitrineForm id={event.id} slug={event.slug} vitrine={event.vitrine ?? {}} />
                  </div>
                </details>
                <details className="relative">
                  <summary className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[11px] marker:hidden">
                    QR
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-96">
                    <PartageEvenement titre={event.title} slug={event.slug} imprimable />
                  </div>
                </details>
                {/* La une de l'accueil : un seul événement, avec sa propre image. */}
                <form action={mettreALaUne}>
                  <input type="hidden" name="id" value={event.id} />
                  {event.featured ? <input type="hidden" name="retirer" value="on" /> : null}
                  <button
                    className={
                      event.featured
                        ? "rounded-full border border-gold/50 bg-gold/15 px-3 py-1.5 text-[11px] text-gold-text"
                        : "rounded-full border border-line px-3 py-1.5 text-[11px] text-muted hover:text-ink"
                    }
                  >
                    {event.featured ? "★ À la une" : "Mettre à la une"}
                  </button>
                </form>
                {/* Clore une soirée la laisse à l'affiche, marquée terminée,
                    mais ferme sa billetterie. L'archiver la retire. */}
                <form action={cloreEvenement}>
                  <input type="hidden" name="id" value={event.id} />
                  {soireeTerminee(event.endedAt) ? <input type="hidden" name="rouvrir" value="on" /> : null}
                  <button className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted hover:text-ink">
                    {soireeTerminee(event.endedAt) ? "Rouvrir" : "Clore"}
                  </button>
                </form>
                <form action={deleteEvent}>
                  <input type="hidden" name="id" value={event.id} />
                  <button className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted hover:text-warn">
                    Archiver
                  </button>
                </form>
              </div>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
