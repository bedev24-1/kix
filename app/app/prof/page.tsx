import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { Drawer, Field, Select, SubmitButton, Switch, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { DemandeRetrait } from "@/components/caisse/Retrait";
import { Card } from "@/components/ui/Card";
import { CoinIcon, UserIcon } from "@/components/icons";
import { deleteCourse, saveCourse } from "@/lib/actions";
import { LienCours } from "@/components/mb/LienCours";
import { FORMATS, NIVEAUX, getCoursDuProf, getElevesDuProf, getSoldeProf } from "@/lib/courses";
import { getVenues } from "@/lib/queries";
import { RETRAIT_MINIMUM, getSoldeRetirableVendeur } from "@/lib/caisse";
import { NIVEAU_PROF, ilManque, nomDuNiveau, peutEnseigner } from "@/lib/niveaux";
import { requireUser } from "@/lib/session";
import { displayPhone } from "@/lib/phone";
import { f, fcfa } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes cours" };

const niveaux = Object.entries(NIVEAUX).map(([value, label]) => ({ value, label }));
const formats = Object.entries(FORMATS).map(([value, label]) => ({ value, label }));

/**
 * L'espace du prof.
 *
 * Enseigner n'est pas un rôle qu'on attribue : c'est un niveau qu'on atteint,
 * ou une salle qu'on tient. Le joueur qui y arrive publie ses cours en son
 * nom, voit ses élèves arriver, et retire ce qu'il a gagné — la même bourse
 * que celle d'un vendeur, parce qu'un joueur qui vend des puffs et enseigne le
 * samedi n'a pas deux comptes à surveiller.
 */
export default async function EspaceProf() {
  const moi = await requireUser();
  const habilite =
    moi.role === "admin" || moi.role === "manager" || moi.role === "seller" || peutEnseigner(moi.points);

  const [mesCours, eleves, gains, solde, salles] = await Promise.all([
    getCoursDuProf(moi.id),
    getElevesDuProf(moi.id),
    getSoldeProf(moi.id),
    getSoldeRetirableVendeur(moi.id),
    getVenues(),
  ]);

  if (!habilite && mesCours.length === 0) {
    return (
      <>
        <ScreenHeader title="Enseigner" subtitle="Montrer la table à ceux qui débutent." back="/app/rewards" />
        <Card tone="dashed" shape="panel" className="flex flex-col gap-2 px-5 py-8">
          <h2 className="text-[15px]">Encore un peu</h2>
          <p className="text-[13px] leading-6 text-muted">
            Donner des cours s&apos;ouvre au niveau {nomDuNiveau(NIVEAU_PROF)}. Il te manque{" "}
            <span className="text-ink">{ilManque(moi.points, NIVEAU_PROF)} points</span> — chaque jeton scanné
            en rapporte, chaque tournoi disputé davantage.
          </p>
          <Link href="/app/classement" className="press w-fit text-[12.5px] text-gold-text">
            Voir le classement →
          </Link>
        </Card>
      </>
    );
  }

  const lieux = [{ value: "", label: "Sans salle" }, ...salles.map((v) => ({ value: v.id, label: v.name }))];

  return (
    <>
      <ScreenHeader
        title="Mes cours"
        subtitle="Ce que tu enseignes, qui vient, et ce que ça rapporte."
        back="/app/rewards"
      />

      <div className="grid grid-cols-3 gap-2.5">
        <Chiffre valeur={String(mesCours.length)} quoi={mesCours.length > 1 ? "cours publiés" : "cours publié"} />
        <Chiffre valeur={String(gains.eleves)} quoi={gains.eleves > 1 ? "élèves" : "élève"} />
        <Chiffre valeur={fcfa(gains.net)} quoi="gagnés" tone="gold" />
      </div>

      <Card shape="panel" className="flex flex-col gap-3 p-4">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold">
          <CoinIcon size={16} /> Ce que tu peux retirer
        </span>
        <p className="text-[12px] text-muted">
          {fcfa(gains.brut)} encaissés, moins {fcfa(gains.commission)} de commission. Les ventes de la boutique,
          si tu en as, comptent dans la même bourse.
        </p>
        <DemandeRetrait disponible={solde.disponible} minimum={RETRAIT_MINIMUM} phone={moi.phone} />
      </Card>

      {habilite ? (
        <Drawer summary="＋ Proposer un cours">
          <form action={saveCourse} className="grid gap-3 pt-3 sm:grid-cols-2">
            <Field label="Titre" name="title" required className="sm:col-span-2" />
            <Select label="Niveau visé" name="level" options={niveaux} />
            <Select label="Format" name="format" options={formats} />
            <Select label="Salle" name="venueId" options={lieux} />
            <Field label="Séances" name="sessions" type="number" min={1} defaultValue={4} />
            <Field label="Prix (F)" name="price" type="number" min={0} defaultValue={15000} />
            <Field label="Places" name="capacity" type="number" min={1} defaultValue={8} />
            <Field label="Créneau" name="schedule" placeholder="Samedi · 10h → 12h" className="sm:col-span-2" />
            <ImageField name="image" dossier="cours" defaultValue="/img/coach-1.jpg" />
            <TextArea label="Ce que l'élève apprendra" name="description" className="sm:col-span-2" />
            <div className="flex items-center gap-4 sm:col-span-2">
              <Switch label="Visible" name="active" defaultChecked />
              <SubmitButton>Publier le cours</SubmitButton>
            </div>
          </form>
        </Drawer>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[15px]">Mes cours</h2>
        {mesCours.length === 0 ? (
          <Card tone="dashed" shape="panel" className="px-5 py-8 text-center text-[13px] text-muted">
            Tu n&apos;enseignes encore rien. Le premier cours se remplit souvent par les amis.
          </Card>
        ) : null}

        {mesCours.map(({ course, venue, inscrits }) => (
          <Card key={course.id} shape="panel" className="flex flex-col gap-3 p-3.5">
            <div className="flex gap-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-card">
                <Photo src={course.image} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-[14.5px] font-semibold">{course.title}</span>
                <span className="text-[12px] text-muted">
                  {NIVEAUX[course.level] ?? course.level} · {course.sessions} séance
                  {course.sessions > 1 ? "s" : ""} · {f(course.price)}
                </span>
                <span className="text-[12px] text-gold-text">
                  {Number(inscrits)} / {course.capacity} inscrits{venue ? ` · ${venue.name}` : ""}
                </span>
              </span>
            </div>

            <LienCours slug={course.slug} titre={course.title} />

            <Drawer summary="Modifier">
              <form action={saveCourse} className="grid gap-3 pt-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <Field label="Titre" name="title" defaultValue={course.title} className="sm:col-span-2" />
                <Select label="Niveau visé" name="level" defaultValue={course.level} options={niveaux} />
                <Select label="Format" name="format" defaultValue={course.format} options={formats} />
                <Select label="Salle" name="venueId" defaultValue={course.venueId} options={lieux} />
                <Field label="Séances" name="sessions" type="number" min={1} defaultValue={course.sessions} />
                <Field label="Prix (F)" name="price" type="number" min={0} defaultValue={course.price} />
                <Field label="Places" name="capacity" type="number" min={1} defaultValue={course.capacity} />
                <Field label="Créneau" name="schedule" defaultValue={course.schedule} className="sm:col-span-2" />
                <ImageField name="image" dossier="cours" defaultValue={course.image} />
                <TextArea label="Description" name="description" defaultValue={course.description} className="sm:col-span-2" />
                <div className="flex items-center gap-4 sm:col-span-2">
                  <Switch label="Visible" name="active" defaultChecked={course.active} />
                  <SubmitButton />
                </div>
              </form>
              <form action={deleteCourse} className="pt-2">
                <input type="hidden" name="id" value={course.id} />
                <button className="h-10 text-[12px] text-muted transition hover:text-warn">
                  Retirer ce cours
                </button>
              </form>
            </Drawer>
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[15px]">
          Mes élèves
          <span className="ml-2 text-[13px] text-muted">{eleves.length}</span>
        </h2>

        {eleves.length === 0 ? (
          <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted">
              <UserIcon size={19} />
            </span>
            <p className="text-[13px] text-muted">Personne encore. Tu seras prévenu à la première inscription.</p>
          </Card>
        ) : null}

        {eleves.map(({ enrollment, eleve, course }) => (
          <Card key={enrollment.id} shape="panel" className="flex items-center gap-3 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-[12px] font-semibold text-dim">
              {eleve.avatar ? (
                <Photo src={eleve.avatar} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
              ) : (
                eleve.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="flex min-w-0 grow flex-col gap-0.5">
              <Link href={`/app/joueurs/${eleve.id}`} className="truncate text-[14px] font-semibold hover:underline">
                {eleve.name}
              </Link>
              <span className="truncate text-[12px] text-muted">
                {course.title} · {displayPhone(eleve.phone)}
              </span>
            </span>
            <span className="shrink-0 text-[12.5px] font-semibold text-gold-text">
              {fcfa(enrollment.price - enrollment.commission)}
            </span>
          </Card>
        ))}
      </section>
    </>
  );
}

function Chiffre({ valeur, quoi, tone }: { valeur: string; quoi: string; tone?: "gold" }) {
  return (
    <Card shape="panel" tone={tone} className="flex flex-col gap-0.5 px-3 py-3.5">
      <span className={`text-[18px] leading-tight font-bold tracking-[-0.02em] ${tone === "gold" ? "text-gold-text" : ""}`}>
        {valeur}
      </span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
