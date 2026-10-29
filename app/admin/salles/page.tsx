import { Drawer, Field, PageHead, Pill, SubmitButton, Table, Td } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { deleteVenue, saveVenue } from "@/lib/actions";
import { getAllVenues } from "@/lib/queries";
import { f } from "@/lib/format";
import { ChoixPosition } from "@/components/salles/ChoixPosition";

export const metadata = { title: "Salles" };

export default async function AdminVenues() {
  const venues = await getAllVenues();

  return (
    <>
      <PageHead title="Salles partenaires" subtitle="Tarif du jeton, tables disponibles, visibilité dans l'app." />

      <Drawer summary="+ Nouvelle salle">
        <form action={saveVenue} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nom" name="name" required />
          <Field label="Quartier" name="area" />
          <Field label="Ville" name="city" defaultValue="Douala" />
          <Field label="Adresse" name="address" className="lg:col-span-2" />
          <Field label="Tables" name="tables" type="number" defaultValue={6} />
          <Field label="Tables libres" name="freeTables" type="number" defaultValue={0} />
          <Field label="Prix du jeton (F)" name="tokenPrice" type="number" defaultValue={400} />
          <ImageField name="image" dossier="salles" defaultValue="/img/hall-dark.jpg" className="lg:col-span-2" />
          <ImageField name="logo" dossier="logos" label="Logo (facultatif)" className="lg:col-span-2" />
          <input type="hidden" name="active" value="on" />
          <div className="flex items-end">
            <SubmitButton>Créer la salle</SubmitButton>
          </div>
        </form>
      </Drawer>

      <Table head={["Salle", "Ville", "Tables", "Libres", "Jeton", "GPS", "État", ""]}>
        {venues.map((venue) => (
          <tr key={venue.id}>
            <Td className="font-semibold">{venue.name}</Td>
            <Td className="text-muted">
              {venue.area} · {venue.city}
            </Td>
            <Td>{venue.tables}</Td>
            <Td>{venue.freeTables}</Td>
            <Td>{f(venue.tokenPrice)}</Td>
            <Td>
              {venue.latitude != null ? (
                <Pill tone="gold">Placée</Pill>
              ) : (
                <span className="text-[11px] text-warn">À placer</span>
              )}
            </Td>
            <Td>
              <Pill tone={venue.active ? "gold" : "neutral"}>{venue.active ? "Visible" : "Masquée"}</Pill>
            </Td>
            <Td>
              <div className="flex items-center gap-2">
                <details className="relative">
                  <summary className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[11px] marker:hidden">
                    Éditer
                  </summary>
                  <form
                    action={saveVenue}
                    className="absolute right-0 z-10 mt-2 grid w-80 gap-3 border border-line bg-bg p-4 shadow-[var(--mb-shadow)]"
                  >
                    <input type="hidden" name="id" value={venue.id} />
                    <input type="hidden" name="slug" value={venue.slug} />
                    <Field label="Nom" name="name" defaultValue={venue.name} />
                    <Field label="Quartier" name="area" defaultValue={venue.area} />
                    <Field label="Ville" name="city" defaultValue={venue.city} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Tables" name="tables" type="number" defaultValue={venue.tables} />
                      <Field label="Libres" name="freeTables" type="number" defaultValue={venue.freeTables} />
                      <Field label="Jeton (F)" name="tokenPrice" type="number" defaultValue={venue.tokenPrice} />
                    </div>
                    <ImageField name="image" dossier="salles" defaultValue={venue.image} />
                    <ImageField name="logo" dossier="logos" label="Logo" defaultValue={venue.logo} />
                    <input type="hidden" name="address" value={venue.address} />
                    <input type="hidden" name="active" value="on" />
                    <SubmitButton />
                  </form>
                </details>
                <details className="relative">
                  <summary className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-[11px] marker:hidden">
                    Position
                  </summary>
                  <div className="absolute right-0 z-10 mt-2 w-[22rem] border border-line bg-bg p-4 shadow-[var(--mb-shadow)]">
                    <ChoixPosition venueId={venue.id} latitude={venue.latitude} longitude={venue.longitude} />
                  </div>
                </details>
                <form action={deleteVenue}>
                  <input type="hidden" name="id" value={venue.id} />
                  <button className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted hover:text-warn">
                    Masquer
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
