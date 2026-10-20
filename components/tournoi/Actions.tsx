"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, TrophyIcon } from "@/components/icons";
import {
  deciderCandidat,
  encaisserAuGuichet,
  lancerTableau,
  noterDuel,
  ouvrirLeTableauFinal,
  setTournamentStatus,
} from "@/lib/actions";
import { cn } from "@/lib/cn";
import { jeuCourt, modeDuJeu } from "@/lib/regles";

/**
 * Les gestes de l'organisateur.
 *
 * Tous passent par le même chemin : une action serveur, un mot dans la barre
 * de notification, un rafraîchissement. L'organisateur travaille souvent
 * debout à côté de la table — il ne doit jamais se demander si son clic a été
 * pris en compte.
 */

function useGeste() {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();

  const faire = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    succes: string,
    detail?: string,
  ) =>
    start(async () => {
      const res = await action();
      if (!res.ok) {
        notify("Impossible", { detail: res.error, tone: "warn" });
        return;
      }
      notify(succes, { detail, tone: "jade" });
      router.refresh();
    });

  return { faire, pending };
}

/** Ouvrir les candidatures, les clore, tirer le tableau, annuler. */
export function EtatTournoi({
  id,
  status,
  acceptes,
  format = "direct",
  poulesFinies = false,
  tableauOuvert = false,
}: {
  id: string;
  status: string;
  acceptes: number;
  format?: string;
  poulesFinies?: boolean;
  tableauOuvert?: boolean;
}) {
  const { faire, pending } = useGeste();
  const fige = status === "encours" || status === "termine";
  const enPoules = format === "poules";
  const minimum = enPoules ? 3 : 2;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "brouillon" || status === "annule" ? (
        <Bouton
          accent
          pending={pending}
          onClick={() => faire(() => setTournamentStatus(id, "inscriptions"), "Candidatures ouvertes")}
        >
          Ouvrir les candidatures
        </Bouton>
      ) : null}

      {status === "inscriptions" ? (
        <Bouton
          pending={pending}
          onClick={() => faire(() => setTournamentStatus(id, "complet"), "Candidatures closes")}
        >
          Clore les candidatures
        </Bouton>
      ) : null}

      {(status === "inscriptions" || status === "complet") && acceptes >= minimum ? (
        <Bouton
          accent
          pending={pending}
          onClick={() =>
            faire(
              () => lancerTableau(id),
              enPoules ? "Poules tirées" : "Tableau tiré",
              "Les joueurs sont prévenus de leur place.",
            )
          }
        >
          <TrophyIcon size={15} />
          {enPoules ? "Tirer les poules" : "Tirer le tableau"}
        </Bouton>
      ) : null}

      {/* Les poules jouées, le tableau final s'ouvre entre les qualifiés. */}
      {enPoules && status === "encours" && poulesFinies && !tableauOuvert ? (
        <Bouton
          accent
          pending={pending}
          onClick={() =>
            faire(() => ouvrirLeTableauFinal(id), "Tableau ouvert", "Les qualifiés sont prévenus.")
          }
        >
          <TrophyIcon size={15} />
          Ouvrir le tableau final
        </Bouton>
      ) : null}

      {!fige && status !== "annule" ? (
        <Bouton
          pending={pending}
          onClick={() => faire(() => setTournamentStatus(id, "annule"), "Tournoi annulé")}
        >
          Annuler
        </Bouton>
      ) : null}
    </div>
  );
}

/** Retenir ou écarter un candidat. */
export function DecisionCandidat({ playerId, status }: { playerId: string; status: string }) {
  const { faire, pending } = useGeste();

  if (status === "retire") return <span className="text-[11.5px] text-faint">retiré</span>;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Bouton
        accent={status !== "accepte"}
        pending={pending}
        onClick={() => faire(() => deciderCandidat(playerId, "accepte"), "Candidat retenu")}
        petit
      >
        {status === "accepte" ? <CheckIcon size={13} /> : null}
        Retenir
      </Bouton>
      <Bouton
        pending={pending}
        onClick={() => faire(() => deciderCandidat(playerId, "refuse"), "Candidat écarté")}
        petit
      >
        Écarter
      </Bouton>
    </div>
  );
}

/** Le droit d'inscription reçu en espèces, au guichet. */
export function EncaisserGuichet({ playerId, montant }: { playerId: string; montant: string }) {
  const { faire, pending } = useGeste();
  return (
    <Bouton accent pending={pending} petit onClick={() => faire(() => encaisserAuGuichet(playerId), "Encaissé", montant)}>
      Encaissé · {montant}
    </Bouton>
  );
}

/** La saisie d'un score, duel par duel. */
export function SaisieScore({
  duelId,
  raceTo,
  nomA,
  nomB,
  scoreA,
  scoreB,
  termine,
}: {
  duelId: string;
  raceTo: number;
  nomA: string;
  nomB: string;
  scoreA: number;
  scoreB: number;
  termine: boolean;
}) {
  const { faire, pending } = useGeste();
  const [a, setA] = useState(scoreA);
  const [b, setB] = useState(scoreB);
  const seche = modeDuJeu(raceTo) === "seche";

  return (
    <div
      data-duel={duelId}
      className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface p-3.5"
    >
      <span className="text-[12.5px] text-muted">
        {nomA} <span className="text-faint">contre</span> {nomB}
        <span className="text-faint"> · {jeuCourt(raceTo)}</span>
      </span>

      {/* En partie sèche, il n'y a pas de score à saisir : il y a celui qui a
          mis la noire. Deux boutons disent la rencontre entière. */}
      {seche ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps text-[10.5px] text-muted">Qui a mis la noire ?</span>
          <Bouton
            accent={!termine || scoreA > scoreB}
            pending={pending}
            petit
            onClick={() => faire(() => noterDuel(duelId, 1, 0), "Vainqueur enregistré", nomA)}
          >
            {nomA}
          </Bouton>
          <Bouton
            accent={termine && scoreB > scoreA}
            pending={pending}
            petit
            onClick={() => faire(() => noterDuel(duelId, 0, 1), "Vainqueur enregistré", nomB)}
          >
            {nomB}
          </Bouton>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Compteur label={nomA} value={a} onChange={setA} max={raceTo} />
          <span className="text-[13px] text-faint">—</span>
          <Compteur label={nomB} value={b} onChange={setB} max={raceTo} />

          <Bouton
            accent
            pending={pending}
            petit
            onClick={() =>
              faire(
                () => noterDuel(duelId, a, b),
                termine ? "Résultat corrigé" : "Résultat enregistré",
                `${a} — ${b}`,
              )
            }
          >
            {termine ? "Corriger" : "Valider"}
          </Bouton>
        </div>
      )}
    </div>
  );
}

function Compteur({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  return (
    <label className="flex min-w-0 grow items-center gap-2">
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        className="h-10 w-full min-w-0 rounded-full border border-line bg-surface-2 px-3 text-center text-[14px] font-semibold tabular-nums"
      />
    </label>
  );
}

function Bouton({
  children,
  onClick,
  pending,
  accent,
  petit,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pending: boolean;
  accent?: boolean;
  petit?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={cn(
        "press flex items-center justify-center gap-1.5 rounded-full font-semibold transition disabled:opacity-50",
        petit ? "h-9 px-3.5 text-[12px]" : "h-10 px-4 text-[12.5px]",
        accent
          ? "bg-gold text-gold-ink hover:brightness-105"
          : "border border-line text-dim hover:bg-surface-2 hover:text-ink",
      )}
    >
      {pending ? <Spinner size={13} /> : null}
      {children}
    </button>
  );
}
