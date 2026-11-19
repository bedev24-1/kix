import { Drawer, Field, PageHead, Pill, Select, SubmitButton, Switch, Table, Td, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { AnnonceCours } from "@/components/joueur/AnnonceCours";
import { LienCours } from "@/components/mb/LienCours";
import { saveCourse } from "@/lib/actions";
import { getAllCourses, FORMATS, NIVEAUX, prixParSeance } from "@/lib/courses";
import { getAllVenues } from "@/lib/queries";
import { requireRole } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cours de billard" };

const niveaux = Object.entries(NIVEAUX).map(([value, label]) => ({ value, label }));
const formats = Object.entries(FORMATS).map(([value, label]) => ({ value, label }));

export default async function AdminCours() {
  await requireRole("admin");
  const [cours, salles] = await Promise.all([getAllCourses(), getAllVenues()]);
  const lieux = [{ value: "", label: "Aucune salle" }, ...salles.map((v) => ({ value: v.id, label: v.name }))];

  return (
    <>
      <PageHead title="Cours de billard" subtitle="Les offres d'apprentissage, mises en avant dans la boutique." />

      <Drawer summary="+ Nouveau cours">
        <form action={saveCourse} className="grid gap-3 pt-3 lg:grid-cols-3">
          <Field label="Titre" name="title" required className="lg:col-span-2" />
          <Field label="Coach" name="coachName" placeholder="Ariel N." />
          <Select label="Niveau" name="level" options={niveaux} />
          <Select label="Format" name="format" options={formats} />
          <Select label="Salle" name="venueId" options={lieux} />
          <Field label="Séances" name="sessions" type="number" min={1} defaultValue={4} />
          <Field label="Prix (F)" name="price" type="number" min={0} defaultValue={15000} />
          <Field label="Places" name="capacity" type="number" min={1} defaultValue={8} />
          <Field label="Créneau" name="schedule" placeholder="Samedi · 10h → 12h" className="lg:col-span-2" />
          <ImageField name="image" dossier="cours" defaultValue="/img/coach-1.jpg" />
          <TextArea label="Description" name="description" className="lg:col-span-3" />
          <div className="flex items-center gap-4 lg:col-span-3">
            <Switch label="Visible" name="active" />
            <Switch label="En bannière" name="featured" defaultChecked={false} />
            <SubmitButton>Créer le cours</SubmitButton>
          </div>
        </form>
      </Drawer>

      <Table head={["Cours", "Coach", "Niveau", "Séances", "Prix", "Inscrits", "État", "Annonce", ""]}>
        {cours.map(({ course, venue, inscrits }) => (
          <tr key={course.id}>
            <Td className="font-semibold">{course.title}</Td>
            <Td>
              {course.coachName || "—"}
              {venue ? <span className="block text-[11px] text-muted">{venue.name}</span> : null}
            </Td>
            <Td>{NIVEAUX[course.level] ?? course.level}</Td>
            <Td>
              {course.sessions} · {f(prixParSeance(course))}/séance
            </Td>
            <Td>{f(course.price)}</Td>
            <Td>
              {Number(inscrits)} / {course.capacity}
            </Td>
            <Td>
              <Pill tone={course.active ? (course.featured ? "gold" : "jade") : "neutral"}>
                {course.active ? (course.featured ? "En bannière" : "Visible") : "Masqué"}
              </Pill>
            </Td>
            <Td>
              {/* L'annonce est un geste d'administration : elle part à tous
                  les joueurs, et rien ne la rattrape. */}
              <div className="flex items-center gap-2">
                <AnnonceCours coursId={course.id} titre={course.title} />
              </div>
              <LienCours slug={course.slug} titre={course.title} className="mt-2 min-w-64" />
            </Td>
            <Td>
              <Drawer summary="▸ Éditer">
                <form action={saveCourse} className="grid gap-3 pt-3 lg:grid-cols-3">
                  <input type="hidden" name="id" value={course.id} />
                  <input type="hidden" name="slug" value={course.slug} />
                  <Field label="Titre" name="title" defaultValue={course.title} className="lg:col-span-2" />
                  <Field label="Coach" name="coachName" defaultValue={course.coachName} />
                  <Select label="Niveau" name="level" defaultValue={course.level} options={niveaux} />
                  <Select label="Format" name="format" defaultValue={course.format} options={formats} />
                  <Select label="Salle" name="venueId" defaultValue={course.venueId ?? ""} options={lieux} />
                  <Field label="Séances" name="sessions" type="number" min={1} defaultValue={course.sessions} />
                  <Field label="Prix (F)" name="price" type="number" min={0} defaultValue={course.price} />
                  <Field label="Places" name="capacity" type="number" min={1} defaultValue={course.capacity} />
                  <Field label="Créneau" name="schedule" defaultValue={course.schedule} className="lg:col-span-2" />
                  <ImageField name="image" dossier="cours" defaultValue={course.image} />
                  <TextArea label="Description" name="description" defaultValue={course.description} className="lg:col-span-3" />
                  <div className="flex items-center gap-4 lg:col-span-3">
                    <Switch label="Visible" name="active" defaultChecked={course.active} />
                    <Switch label="En bannière" name="featured" defaultChecked={course.featured} />
                    <SubmitButton />
                  </div>
                </form>
              </Drawer>
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
