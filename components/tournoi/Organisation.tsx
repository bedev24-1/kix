import Link from "next/link";
import { Photo } from "@/components/ui/Photo";
import { Drawer, Field, Select, SubmitButton, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { EtatTournoi } from "@/components/tournoi/Actions";
import { Formules } from "@/components/tournoi/Formules";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ArrowRightIcon, TrophyIcon } from "@/components/icons";
import { saveTournament } from "@/lib/actions";
import { CATEGORIES, DISCIPLINES, ETATS, FORMATS, TAILLE_MAX, TAILLES } from "@/lib/tournois";
import { modeDuJeu, MODES_OPTIONS } from "@/lib/regles";
import { NIVEAUX_REQUIS } from "@/lib/niveaux";
import { CAGNOTTES_MAX } from "@/lib/cagnottes";
import { f } from "@/lib/format";
import type { EventRow, Tournament, Venue } from "@/db";

const disciplines = Object.entries(DISCIPLINES).map(([value, label]) => ({ value, label }));
const formats = Object.entries(FORMATS).map(([value, label]) => ({ value, label }));

const categories = Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }));

/** `datetime-local` veut « 2026-03-14T19:00 », sans fuseau ni secondes. */
const pourInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

export type LigneTournoi = {
  tournament: Tournament;
  venue: Venue | null;
  acceptes: number;
  candidats: number;
};

/**
 * Le formulaire d'un tournoi.
 *
 * Il porte aussi la billetterie du public : une seule saisie, deux entrées —
 * le tableau des joueurs et l'événement jumeau où les spectateurs prennent
 * leur place. Séparer les deux formulaires aurait fait deux affiches pour un
 * seul tournoi.
 */
export function FormulaireTournoi({
  salles,
  tournoi,
  jumeau,
  base,
  parent,
}: {
  /** Vide pour un gérant : sa salle est déduite de son compte. */
  salles?: { value: string; label: string }[];
  tournoi?: Tournament;
  jumeau?: EventRow | null;
  /** Là où l'on revient après enregistrement — pour les liens du panneau. */
  base: string;
  /**
   * Un tableau de plus pour le même événement (« Dames » à côté de l'« Open ») :
   * il reprend les réglages du principal, et partage son affiche et sa billetterie.
   */
  parent?: Tournament;
}) {
  // Un identifiant par formulaire : la page d'administration en affiche un
  // par tournoi, et les formules doivent viser celui de la création.
  const cible = tournoi ? tournoi.id : parent ? `tableau-${parent.id}` : "nouveau";
  // Les valeurs de départ : le tournoi édité, ou le principal qu'on décline.
  const base0 = tournoi ?? parent;
  const ajout = Boolean(parent) || Boolean(tournoi?.parentId);

  return (
    <>
      <Drawer summary={tournoi ? "▸ Éditer" : parent ? "+ Ajouter un tableau (autre catégorie)" : "+ Nouveau tournoi"}>
        {/* Les formules ne s'affichent qu'à la création : sur un tournoi qui
            existe, écraser d'un clic ce que l'organisateur a réglé — et son
            règlement déjà publié — ne rendrait service à personne. */}
        {tournoi || parent ? null : (
          <div className="pt-3">
            <Formules cible={cible} />
          </div>
        )}

        <form data-formulaire={cible} action={saveTournament} className="grid gap-3 pt-3 lg:grid-cols-3">
          {tournoi ? <input type="hidden" name="id" value={tournoi.id} /> : null}
          {tournoi ? <input type="hidden" name="slug" value={tournoi.slug} /> : null}
          {parent ? <input type="hidden" name="parentId" value={parent.id} /> : null}

          <Field
            label="Titre"
            name="title"
            defaultValue={tournoi?.title ?? (parent ? `${parent.title} · Dames` : undefined)}
            required
            placeholder="Master Break Open · Akwa"
            className="lg:col-span-2"
          />
          <Select label="Discipline" name="discipline" defaultValue={base0?.discipline} options={disciplines} />

          {salles && !ajout ? <Select label="Salle" name="venueId" defaultValue={tournoi?.venueId} options={salles} /> : null}
          {ajout && parent ? <input type="hidden" name="venueId" value={parent.venueId ?? ""} /> : null}
          {ajout && tournoi ? <input type="hidden" name="venueId" value={tournoi.venueId ?? ""} /> : null}
          <Select
            label="Catégorie"
            name="category"
            defaultValue={tournoi?.category ?? (parent ? "dames" : "open")}
            options={categories}
          />
          <Select label="Format" name="format" defaultValue={base0?.format} options={formats} />
          {/* Une liste de tailles courantes, mais toute autre se tape : 88, 40…
              Le moteur complète le tableau par des exemptions. */}
          <Field
            label="Joueurs au tableau"
            name="size"
            type="number"
            min={2}
            max={TAILLE_MAX}
            list="tailles-tableau"
            defaultValue={tournoi?.size ?? 16}
            hint={`Choisis ou tape un nombre, jusqu'à ${TAILLE_MAX}.`}
          />
          <datalist id="tailles-tableau">
            {TAILLES.map((n) => <option key={n} value={n} />)}
          </datalist>
          <Field
            label="Joueurs par poule"
            name="groupSize"
            type="number"
            min={3}
            defaultValue={base0?.groupSize ?? 4}
            hint="Ignoré en élimination directe."
          />
          <Field
            label="Qualifiés par poule"
            name="qualifiers"
            type="number"
            min={1}
            defaultValue={base0?.qualifiers ?? 2}
          />
          <Select
            label="Jeu"
            name="mode"
            defaultValue={modeDuJeu(base0?.raceTo ?? 1)}
            options={MODES_OPTIONS}
          />
          {/* `min` à 1 et non 2 : une formule en parties sèches pose 1 ici, et le
              navigateur refusait alors l'envoi en affichant « la valeur doit être
              supérieure ou égale à 2 » dans une bulle que personne ne relie au
              bouton qui ne réagit pas. Une course à 1 partie est une sèche : le
              serveur la lit comme telle. */}
          <Field
            label="Parties gagnantes (1er tour)"
            name="raceTo"
            type="number"
            min={1}
            defaultValue={base0 && base0.raceTo > 1 ? base0.raceTo : 4}
            hint="En course seulement : +1 en demi-finale, +2 en finale. En partie sèche, tout le tournoi se joue à la noire."
          />
          <Select
            label="Niveau requis"
            name="minLevel"
            defaultValue={String(base0?.minLevel ?? 0)}
            options={NIVEAUX_REQUIS}
          />
          <Field
            label="Droit d'inscription (F)"
            name="entryFee"
            type="number"
            min={0}
            defaultValue={base0?.entryFee ?? 0}
          />

          <Field
            label="Début"
            name="startsAt"
            type="datetime-local"
            defaultValue={pourInput(base0?.startsAt ?? null)}
          />
          <Field
            label="Clôture des candidatures"
            name="closesAt"
            type="datetime-local"
            defaultValue={pourInput(base0?.closesAt ?? null)}
          />
          {ajout ? null : <Field label="Horaires" name="hours" defaultValue={jumeau?.hours} placeholder="18h → 23h" />}

          {/* Plusieurs enveloppes, chacune pour quelqu'un. Leur somme fait la
              dotation ; sans cagnotte, le champ dotation reste celui qu'on lit. */}
          <fieldset className="flex flex-col gap-2.5 border border-line p-3 sm:col-span-2 lg:col-span-3">
            <legend className="px-1 text-[11px] tracking-[0.1em] text-muted uppercase">Cagnottes</legend>
            {Array.from({ length: CAGNOTTES_MAX }, (_, i) => {
              const c = base0?.cagnottes?.[i];
              return (
                <div key={i} className="grid grid-cols-2 gap-2.5 sm:grid-cols-[1.2fr_1.5fr_1fr]">
                  <Field
                    label={`Cagnotte ${i + 1}`}
                    name={`cagnotte_${i}_nom`}
                    defaultValue={c?.nom}
                    placeholder={["Vainqueur", "Finaliste", "Meilleure dame"][i] ?? "Intitulé"}
                  />
                  <Field
                    label="Pour qui"
                    name={`cagnotte_${i}_pour`}
                    defaultValue={c?.pour}
                    placeholder={["Le champion du tableau", "Le perdant de la finale", "La première joueuse au classement"][i] ?? "Qui la reçoit"}
                  />
                  <Field
                    label="Montant (F)"
                    name={`cagnotte_${i}_montant`}
                    type="number"
                    min={0}
                    defaultValue={c?.montant || ""}
                    className="col-span-2 sm:col-span-1"
                  />
                </div>
              );
            })}
          </fieldset>
          <Field
            label="Dotation totale (F)"
            name="prizePool"
            type="number"
            min={0}
            defaultValue={base0?.prizePool ?? 0}
            hint="Calculée toute seule quand les cagnottes sont remplies."
          />
          <Field
            label="Partage (texte libre, facultatif)"
            name="prizeSplit"
            defaultValue={base0?.prizeSplit}
            placeholder="60 % au vainqueur, 30 % au finaliste, 10 % aux demi-finalistes"
            className="lg:col-span-2"
          />

          {ajout ? null : (
            <>
              <Field
                label="Place spectateur (F)"
                name="ticketPrice"
                type="number"
                min={0}
                defaultValue={jumeau?.price ?? 0}
                hint="0 pour une entrée libre."
              />
              <Field
                label="Places en salle"
                name="ticketCapacity"
                type="number"
                min={1}
                defaultValue={jumeau?.capacity ?? 100}
              />
            </>
          )}
          <ImageField name="image" dossier="tournois" defaultValue={base0?.image ?? "/img/table-rack.jpg"} />

          <TextArea
            label="Texte de présentation (affiché en tête et dans les partages)"
            name="presentation"
            defaultValue={base0?.presentation}
            rows={3}
            className="lg:col-span-3"
          />
          <TextArea
            label="Règlement (replié sur la page, à ouvrir)"
            name="rules"
            defaultValue={base0?.rules}
            rows={4}
            className="lg:col-span-3"
          />

          <div className="flex items-center gap-4 lg:col-span-3">
            <SubmitButton>{tournoi ? "Enregistrer" : "Créer le tournoi"}</SubmitButton>
            {tournoi ? (
              <Link href={`${base}/${tournoi.id}`} className="text-[12.5px] text-gold-text">
                Ouvrir la console →
              </Link>
            ) : null}
          </div>
        </form>
      </Drawer>
      {/* Sur un tournoi principal : en ouvrir un autre tableau sous la même affiche. */}
      {tournoi && !tournoi.parentId ? <FormulaireTournoi salles={salles} parent={tournoi} base={base} /> : null}
    </>
  );
}

/** La liste des tournois d'un organisateur, telle qu'on la lit au comptoir. */
export function ListeTournois({ lignes, base }: { lignes: LigneTournoi[]; base: string }) {
  if (lignes.length === 0) {
    return (
      <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
          <TrophyIcon size={24} />
        </span>
        <h2 className="text-lg">Aucun tournoi</h2>
        <p className="max-w-sm text-[13px] text-muted">
          Crée un tableau, ouvre les candidatures : il apparaîtra dans l&apos;application comme un événement,
          avec sa billetterie pour le public.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
      {lignes.map(({ tournament, venue, acceptes, candidats }) => (
        <Card key={tournament.id} shape="panel" className="flex flex-col gap-3 p-3.5">
          <div className="flex gap-3.5">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card">
              <Photo src={tournament.image} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <span className="flex min-w-0 grow flex-col gap-1">
              <span className="truncate text-[15px] font-semibold">{tournament.title}</span>
              <span className="truncate text-[12px] text-muted">
                {DISCIPLINES[tournament.discipline] ?? tournament.discipline} ·{" "}
                {FORMATS[tournament.format] ?? tournament.format}
                {venue ? ` · ${venue.name}` : ""}
              </span>
              <span className="text-[12px] text-gold-text">
                {Number(acceptes)} retenu{Number(acceptes) > 1 ? "s" : ""} · {Number(candidats)} en attente
                {tournament.prizePool > 0 ? ` · dotation ${f(tournament.prizePool)}` : ""}
              </span>
            </span>
            <Link
              href={`${base}/${tournament.id}`}
              aria-label={`Console ${tournament.title}`}
              className="press mt-1 shrink-0 text-muted"
            >
              <ArrowRightIcon size={16} />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={tournament.status === "inscriptions" ? "solid" : "neutral"} className="text-[11px]">
              {ETATS[tournament.status] ?? tournament.status}
            </Chip>
            {tournament.category !== "open" ? (
              <Chip tone="neutral" className="text-[11px]">
                {CATEGORIES[tournament.category] ?? tournament.category} · {tournament.size}
              </Chip>
            ) : null}
            {tournament.parentId ? <span className="text-[11px] text-muted">tableau ajouté</span> : null}
            <EtatTournoi id={tournament.id} status={tournament.status} acceptes={Number(acceptes)} />
          </div>
        </Card>
      ))}
    </div>
  );
}
