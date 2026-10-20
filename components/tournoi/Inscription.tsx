"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { TicketButton } from "@/components/mb/TicketButton";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, TargetIcon, TicketIcon } from "@/components/icons";
import { payerAuGuichet, payerInscription, postuler, retirerCandidature, type CandidatureState } from "@/lib/actions";
import { NIVEAUX } from "@/lib/tournois";
import { displayPhone } from "@/lib/phone";
import { fcfa } from "@/lib/format";

export type MaCandidature = {
  status: string;
  payment: string;
  fee: number;
  seed: number | null;
  nickname: string;
  level: string;
} | null;

/**
 * Les deux portes d'un tournoi.
 *
 * On vient voir, ou on vient jouer — et ce ne sont pas les mêmes gestes. Le
 * spectateur achète un billet, comme pour n'importe quelle soirée. Le joueur,
 * lui, dépose une candidature que l'organisateur retient ou non : un tableau
 * ne se remplit pas au premier arrivé.
 */
export function Inscription({
  tournamentId,
  titre,
  eventId,
  ticketPrice,
  entryFee,
  phone,
  nom,
  ouvert,
  billetPris,
  candidature,
  niveauRequis = 0,
  monNiveau = 1,
  ilMeManque = 0,
}: {
  tournamentId: string;
  titre: string;
  eventId: string | null;
  ticketPrice: number;
  entryFee: number;
  phone: string;
  nom: string;
  ouvert: boolean;
  billetPris: boolean;
  candidature: MaCandidature;
  /** Le palier exigé par l'organisateur, 0 si le tournoi est ouvert à tous. */
  niveauRequis?: number;
  monNiveau?: number;
  ilMeManque?: number;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
      <Card shape="panel" className="flex flex-col gap-3 p-4">
        <Entete
          icon={<TicketIcon size={16} />}
          titre="Venir voir"
          detail="Une place dans la salle, le soir des matchs."
        />
        {eventId ? (
          <TicketButton
            eventId={eventId}
            eventTitle={titre}
            price={ticketPrice}
            phone={phone}
            owned={billetPris}
            libelle="Billet spectateur"
          />
        ) : (
          <p className="text-[12.5px] text-muted">La billetterie ouvre bientôt.</p>
        )}
      </Card>

      <Card shape="panel" tone="gold" className="flex flex-col gap-3 p-4">
        <Entete
          icon={<TargetIcon size={16} />}
          titre="Jouer le tournoi"
          detail={
            entryFee > 0
              ? `Candidature, puis droit d'inscription de ${fcfa(entryFee)}.`
              : "Candidature libre : l'organisateur retient le tableau."
          }
        />
        <Joueur
          tournamentId={tournamentId}
          titre={titre}
          entryFee={entryFee}
          phone={phone}
          nom={nom}
          ouvert={ouvert}
          candidature={candidature}
          niveauRequis={niveauRequis}
          monNiveau={monNiveau}
          ilMeManque={ilMeManque}
        />
      </Card>
    </div>
  );
}

function Entete({ icon, titre, detail }: { icon: React.ReactNode; titre: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{titre}</span>
        <span className="text-[11.5px] leading-tight text-muted">{detail}</span>
      </span>
    </div>
  );
}

function Joueur({
  tournamentId,
  titre,
  entryFee,
  phone,
  nom,
  ouvert,
  candidature,
  niveauRequis,
  monNiveau,
  ilMeManque,
}: {
  tournamentId: string;
  titre: string;
  entryFee: number;
  phone: string;
  nom: string;
  ouvert: boolean;
  niveauRequis: number;
  monNiveau: number;
  ilMeManque: number;
  candidature: MaCandidature;
}) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [formulaire, setFormulaire] = useState(false);
  const [caisse, setCaisse] = useState(false);
  const [retrait, retirer] = useTransition();
  // La feuille se referme quand le serveur a accepté la candidature : c'est sa
  // réponse qui fait foi, pas le clic. On enveloppe l'action plutôt que de
  // guetter son résultat depuis un effet — un effet qui appelle `setState`
  // rejoue un rendu pour rien, et React le signale à juste titre.
  const [state, action, pending] = useActionState<CandidatureState, FormData>(async (prev, fd) => {
    const res = await postuler(prev, fd);
    if (res?.ok) {
      setFormulaire(false);
      notify("Candidature déposée", { detail: "L'organisateur te répond avant le tirage.", tone: "jade" });
      router.refresh();
    }
    return res;
  }, null);

  const encours = candidature && candidature.status !== "retire" ? candidature : null;
  const doitPayer = encours?.status === "accepte" && encours.fee > 0 && encours.payment !== "paye";

  const start = async (numero: string, method: Method) => {
    const res = await payerInscription(tournamentId, method, numero);
    if (!res.ok) return res;
    return { ok: true as const, reference: res.reference, instruction: res.instruction };
  };

  if (encours) {
    return (
      <>
        <Etat candidature={encours} />

        {doitPayer ? (
          <button
            onClick={() => setCaisse(true)}
            className="press flex h-11 items-center justify-center gap-2 rounded-full bg-gold text-[13px] font-semibold text-gold-ink transition hover:brightness-105"
          >
            Régler mon inscription · {fcfa(encours.fee)}
          </button>
        ) : null}

        {/* Pas de Mobile Money sous la main : on réglera sur place, en espèces.
            L'organisateur encaisse et confirme la place avant le tirage. */}
        {doitPayer && encours.payment !== "guichet" ? (
          <button
            onClick={() =>
              retirer(async () => {
                const res = await payerAuGuichet(tournamentId);
                if (!res.ok) notify("Impossible", { detail: res.error, tone: "warn" });
                else {
                  notify("C'est noté", { detail: "Règle ton inscription au guichet avant le tirage.", tone: "jade" });
                  router.refresh();
                }
              })
            }
            disabled={retrait}
            className="press flex h-10 items-center justify-center gap-2 rounded-full border border-line text-[12.5px] font-semibold text-ink"
          >
            {retrait ? <Spinner size={14} /> : null}
            Je paierai au guichet
          </button>
        ) : null}

        {ouvert && encours.status !== "refuse" ? (
          <button
            onClick={() =>
              retirer(async () => {
                const res = await retirerCandidature(tournamentId);
                if (!res.ok) notify("Retrait impossible", { detail: res.error, tone: "warn" });
                else {
                  notify("Candidature retirée");
                  router.refresh();
                }
              })
            }
            disabled={retrait}
            className="press flex h-10 items-center justify-center gap-2 rounded-full border border-line text-[12.5px] text-muted transition hover:text-ink"
          >
            {retrait ? <Spinner size={14} /> : null}
            Retirer ma candidature
          </button>
        ) : null}

        <Sheet open={caisse} onClose={() => setCaisse(false)} title={`Inscription · ${titre}`}>
          <MomoCheckout
            amount={encours.fee}
            defaultPhone={phone}
            start={start}
            onPaid={() => {
              setCaisse(false);
              notify("Inscription réglée", { detail: "Ta place au tableau est retenue.", tone: "jade" });
              router.refresh();
            }}
            hint="Droit d'inscription joueur"
            label={`Payer · ${fcfa(encours.fee)}`}
          />
        </Sheet>
      </>
    );
  }

  // Le niveau manque : on le dit et on donne le compte, plutôt qu'un bouton
  // grisé sans raison. Le serveur refuse de toute façon.
  const tropBas = niveauRequis > 0 && monNiveau < niveauRequis;
  if (tropBas) {
    return (
      <div className="flex flex-col gap-1.5 rounded-panel border border-dashed border-line bg-surface px-4 py-3.5">
        <span className="text-[13px] font-semibold">Tournoi réservé</span>
        <span className="text-[12px] leading-5 text-muted">
          Il te manque {ilMeManque} point{ilMeManque > 1 ? "s" : ""} pour y prétendre. Chaque jeton scanné
          en rapporte — reviens jouer, et la place sera à toi.
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setFormulaire(true)}
        disabled={!ouvert}
        className="press flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-gold-ink transition hover:brightness-105 disabled:opacity-45"
      >
        <TargetIcon size={18} />
        {ouvert ? "Déposer ma candidature" : "Candidatures closes"}
      </button>

      <Sheet open={formulaire} onClose={() => setFormulaire(false)} title="Candidature joueur">
        <form action={action} className="flex flex-col gap-3.5">
          <input type="hidden" name="tournamentId" value={tournamentId} />

          <Champ label="Nom porté au tableau" name="nickname" defaultValue={nom} maxLength={40} required />
          <Champ
            label="Numéro de joueur"
            name="phone"
            defaultValue={displayPhone(phone)}
            inputMode="tel"
            required
          />

          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[10px]">Niveau annoncé</span>
            <select
              name="level"
              defaultValue="intermediaire"
              className="h-11 rounded-full border border-line bg-surface px-4 text-[13.5px] text-ink"
            >
              {Object.entries(NIVEAUX).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[10px]">Un mot pour l&apos;organisateur</span>
            <textarea
              name="note"
              rows={3}
              maxLength={400}
              placeholder="Salle habituelle, palmarès, disponibilités…"
              className="rounded-panel border border-line bg-surface px-4 py-3 text-[13.5px] text-ink"
            />
          </label>

          {entryFee > 0 ? (
            <p className="text-[12px] text-muted">
              Droit d&apos;inscription de {fcfa(entryFee)}, à régler une fois ta candidature retenue. Rien
              n&apos;est prélevé maintenant.
            </p>
          ) : null}

          {state && !state.ok && state.error ? (
            <p className="text-[12.5px] text-warn">{state.error}</p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="press flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-gold-ink transition hover:brightness-105 disabled:opacity-50"
          >
            {pending ? <Spinner size={17} /> : <CheckIcon size={18} />}
            {pending ? "Envoi…" : "Envoyer ma candidature"}
          </button>
        </form>
      </Sheet>
    </>
  );
}

function Champ({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label-caps text-[10px]">{label}</span>
      <input
        {...props}
        className="h-11 rounded-full border border-line bg-surface px-4 text-[13.5px] text-ink placeholder:text-faint"
      />
    </label>
  );
}

function Etat({ candidature }: { candidature: NonNullable<MaCandidature> }) {
  const paye = candidature.payment === "paye" || candidature.fee === 0;
  const texte =
    candidature.status === "candidat"
      ? "Candidature déposée · en attente de l'organisateur"
      : candidature.status === "refuse"
        ? "Candidature non retenue pour cette édition"
        : paye
          ? candidature.seed
            ? `Au tableau · tête de série n°${candidature.seed}`
            : "Retenu · inscription réglée"
          : candidature.payment === "guichet"
            ? "Retenu · à régler au guichet avant le tirage"
            : "Retenu · droit d'inscription à régler";

  return (
    <div className="flex items-center gap-2.5 rounded-panel border border-line bg-surface px-3.5 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-text">
        <CheckIcon size={15} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">{candidature.nickname}</span>
        <span className="text-[11.5px] leading-tight text-muted">{texte}</span>
      </span>
    </div>
  );
}
