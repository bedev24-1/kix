"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, TrophyIcon } from "@/components/icons";
import {
  ajouterArbitreTournoi,
  deciderCandidat,
  demarrerTournoi,
  designerDuel,
  echangerPlaces,
  encaisserAuGuichet,
  lancerTableau,
  retirerArbitreTournoi,
  noterDuel,
  ouvrirFeuilleDuel,
  ouvrirLeTableauFinal,
  placerSurPlaceLibre,
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
  prepare = false,
}: {
  id: string;
  status: string;
  /** Les joueurs retenus, réglés ou non : tous ont leur place au tirage. */
  acceptes: number;
  format?: string;
  poulesFinies?: boolean;
  tableauOuvert?: boolean;
  /** Le tirage est préparé (arbre ou poules construits) mais pas lancé. */
  prepare?: boolean;
}) {
  const { faire, pending } = useGeste();
  const fige = status === "encours" || status === "termine";
  const enPoules = format === "poules";
  const objet = enPoules ? "les poules" : "l'arbre";

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

      {/* Le tirage se prépare dès un joueur retenu, réglé ou non, pendant
          que les candidatures continuent : chaque nouveau retenu prend la
          première place libre. Deux façons : par classement (têtes de série,
          favoris éloignés) ou au sort. Le lancement fige tout. */}
      {(status === "inscriptions" || status === "complet") && acceptes >= 1 ? (
        <>
          <Bouton
            accent={!prepare}
            pending={pending}
            onClick={() =>
              faire(
                () => lancerTableau(id, "hasard"),
                prepare ? "Tirage refait au sort" : `${enPoules ? "Poules préparées" : "Arbre préparé"} au sort`,
                "Brouillon : les joueurs ne sont prévenus qu'au lancement.",
              )
            }
          >
            <TrophyIcon size={15} />
            {prepare ? "Refaire au sort" : enPoules ? "Préparer les poules au sort" : "Préparer l'arbre au sort"}
          </Bouton>
          <Bouton
            pending={pending}
            onClick={() =>
              faire(
                () => lancerTableau(id, "classement"),
                prepare ? "Tirage refait par classement" : `${enPoules ? "Poules préparées" : "Arbre préparé"} par classement`,
                "Têtes de série selon le classement. Brouillon jusqu'au lancement.",
              )
            }
          >
            {prepare ? "Refaire par classement" : "Par classement"}
          </Bouton>
          {prepare && acceptes < 2 ? (
            <span className="text-[12px] text-muted">Le lancement attend un 2ᵉ joueur retenu.</span>
          ) : null}
          {prepare && acceptes >= 2 ? (
            <Bouton
              accent
              pending={pending}
              onClick={() => {
                if (!window.confirm(`Lancer le tournoi ? ${objet[0].toUpperCase() + objet.slice(1)} se fige${enPoules ? "nt" : ""}, les places libres deviennent des exemptions et les ${acceptes} joueurs sont prévenus.`)) return;
                faire(() => demarrerTournoi(id), "Tournoi lancé", "Les joueurs sont prévenus de leur place.");
              }}
            >
              Lancer le tournoi · {acceptes} joueur{acceptes > 1 ? "s" : ""}
            </Bouton>
          ) : null}
        </>
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

/** Placer à la main : deux joueurs, et ils échangent leur place (poule ou case de l'arbre). */
export function Placement({
  tournamentId,
  joueurs,
  libres = [],
}: {
  tournamentId: string;
  joueurs: { id: string; nom: string; place: string }[];
  /** Tirage préparé : les places encore libres (« rang:5 », « poule:3 »). */
  libres?: { valeur: string; libelle: string }[];
}) {
  const { faire, pending } = useGeste();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const options = [...joueurs].sort((x, y) => x.place.localeCompare(y.place, "fr", { numeric: true }) || x.nom.localeCompare(y.nom));
  const choix = (valeur: string, poser: (v: string) => void, libelle: string, avecLibres = false) => (
    <label className="flex min-w-0 grow flex-col gap-1">
      <span className="text-[10.5px] tracking-[0.1em] text-muted uppercase">{libelle}</span>
      <select
        value={valeur}
        onChange={(e) => poser(e.target.value)}
        className="h-11 min-w-0 rounded-none border border-line bg-surface px-2 text-[13px] text-ink"
      >
        <option value="">Choisir…</option>
        {options.map((j) => (
          <option key={j.id} value={j.id}>
            {j.place} · {j.nom}
          </option>
        ))}
        {avecLibres && libres.length ? (
          <optgroup label="Places libres">
            {libres.map((l) => (
              <option key={l.valeur} value={l.valeur}>
                {l.libelle}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
      {choix(a, setA, "Joueur")}
      {choix(b, setB, libres.length ? "Échange avec, ou place libre" : "Échange avec", true)}
      <Bouton
        accent
        pending={pending}
        onClick={() => {
          const [genre, n] = b.split(":");
          if (genre === "rang" || genre === "poule") {
            faire(
              () => placerSurPlaceLibre(tournamentId, a, genre === "rang" ? { rang: Number(n) } : { poule: Number(n) }),
              "Joueur placé",
              "Sa place précédente est libérée.",
            );
            return;
          }
          faire(() => echangerPlaces(tournamentId, a, b), "Places échangées", "Les duels suivent les joueurs.");
        }}
      >
        {b.startsWith("rang:") || b.startsWith("poule:") ? "Placer" : "Échanger"}
      </Bouton>
    </div>
  );
}

/**
 * Les arbitres du tournoi, choisis parmi les profils arbitres actifs de
 * Master Break — validés et abonnés, ou accordés par l'administration.
 */
export function GestionArbitres({
  tournamentId,
  arbitres,
  disponibles,
}: {
  tournamentId: string;
  arbitres: { id: string; nom: string }[];
  disponibles: { id: string; nom: string; phone: string }[];
}) {
  const { faire, pending } = useGeste();
  const [choix, setChoix] = useState("");
  const restants = disponibles.filter((d) => !arbitres.some((a) => a.id === d.id));
  return (
    <div className="flex flex-col gap-2.5">
      {disponibles.length === 0 ? (
        <p className="text-[12px] text-muted">
          Aucun arbitre actif sur Master Break. L&apos;administration en accorde dans Profils, ou valide les demandes.
        </p>
      ) : (
        <div className="flex gap-2">
          <select
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
            className="h-11 min-w-0 grow rounded-none border border-line bg-surface px-3 text-[13px] text-ink"
          >
            <option value="">Choisir un arbitre…</option>
            {restants.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom} · {d.phone}
              </option>
            ))}
          </select>
          <Bouton
            accent
            pending={pending}
            onClick={() => faire(() => ajouterArbitreTournoi(tournamentId, choix), "Arbitre annoncé", "Il est prévenu.")}
          >
            Ajouter
          </Bouton>
        </div>
      )}
      {arbitres.length ? (
        <div className="flex flex-wrap gap-1.5">
          {arbitres.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 rounded-full border border-line py-1 pr-1 pl-3 text-[12px]">
              {a.nom}
              <button
                aria-label={`Retirer ${a.nom}`}
                onClick={() => faire(() => retirerArbitreTournoi(tournamentId, a.id), "Arbitre retiré")}
                className="grid h-6 w-6 place-items-center rounded-full text-muted hover:text-warn"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted">Aucun arbitre annoncé pour l&apos;instant.</p>
      )}
    </div>
  );
}

/** L'arbitre et la table d'un duel. */
export function DesignationDuel({
  duelId,
  arbitres,
  arbitreId,
  table,
}: {
  duelId: string;
  arbitres: { id: string; nom: string }[];
  arbitreId: string | null;
  table: string;
}) {
  const { faire, pending } = useGeste();
  const [qui, setQui] = useState(arbitreId ?? "");
  const [ou, setOu] = useState(table);
  const change = qui !== (arbitreId ?? "") || ou !== table;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={qui}
        onChange={(e) => setQui(e.target.value)}
        className="h-9 min-w-0 grow rounded-none border border-line bg-surface px-2 text-[12px] text-ink"
      >
        <option value="">Sans arbitre</option>
        {arbitres.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nom}
          </option>
        ))}
      </select>
      <input
        value={ou}
        onChange={(e) => setOu(e.target.value)}
        placeholder="Table"
        className="h-9 w-20 rounded-none border border-line bg-surface px-2 text-[12px] text-ink"
      />
      {change ? (
        <Bouton pending={pending} onClick={() => faire(() => designerDuel(duelId, qui || null, ou), "Duel mis à jour")}>
          OK
        </Bouton>
      ) : null}
    </div>
  );
}

/**
 * La feuille 8-ball d'un duel : l'arbitre suit la partie coup par coup (et
 * alimente la barre du direct) ; à la fin, le score remonte seul au tableau.
 */
export function BoutonFeuille({ duelId, matchId }: { duelId: string; matchId: string | null }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (matchId) {
            router.push(`/arbitre/${matchId}`);
            return;
          }
          const r = await ouvrirFeuilleDuel(duelId);
          if (!r.ok) {
            notify("Impossible", { detail: r.error, tone: "warn" });
            return;
          }
          router.push(`/arbitre/${r.matchId}`);
        })
      }
      className="press flex h-10 items-center justify-center gap-2 rounded-full bg-gold px-4 text-[12.5px] font-semibold text-gold-ink disabled:opacity-60"
    >
      {pending ? <Spinner size={14} /> : null}
      {matchId ? "Reprendre la feuille 8-ball →" : "Arbitrer coup par coup (feuille 8-ball) →"}
    </button>
  );
}
