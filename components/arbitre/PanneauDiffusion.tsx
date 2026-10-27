"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GoLive } from "@/components/live/GoLive";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { creerDirectDuMatch, detacherDirect, lierDirect, reglerBarreVideo, reglerPartenaire } from "@/lib/actions-diffusion";
import { cn } from "@/lib/cn";

export type DiffusionVue = {
  /** Créer ou lier un direct depuis cette feuille. */
  peut: boolean;
  direct: {
    id: string;
    titre: string;
    status: string;
    viewers: number;
    sponsor: string;
    barreVideo: boolean;
    /** L'utilisateur en est l'auteur (ou le gérant) : coordonnées et réglages. */
    gerable: boolean;
    ingest: { server: string; key: string; whip: string } | null;
  } | null;
  candidats: { id: string; titre: string; status: string }[];
  /** L'adresse de la barre à coller dans OBS (« Source navigateur »). */
  incrustation: string;
};

/**
 * Le direct de ce match, depuis la feuille : la barre de score de la vidéo
 * est alimentée par ce que l'arbitre saisit ici.
 */
export function PanneauDiffusion({ matchId, vue }: { matchId: string; vue: DiffusionVue }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [choix, setChoix] = useState("");
  const [partenaire, setPartenaire] = useState(vue.direct?.sponsor ?? "");
  const [filmer, setFilmer] = useState(false);
  const [voirCle, setVoirCle] = useState(false);

  const faire = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return notify("Impossible", { detail: r.error, tone: "warn" });
      notify(ok, { tone: "jade" });
      router.refresh();
    });

  const copier = async (texte: string, quoi: string) => {
    try {
      await navigator.clipboard.writeText(texte);
      notify(`${quoi} copié`);
    } catch {
      notify(`${quoi} affiché`, { detail: "Copie-le depuis l'écran" });
    }
  };

  const d = vue.direct;
  const statut = d ? (d.status === "live" ? "En direct" : d.status === "ended" ? "Terminé" : "En attente du flux") : null;

  return (
    <div className="flex flex-col gap-3">
      {d ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{d.titre}</span>
              <span className={cn("flex items-center gap-1.5 text-[11.5px]", d.status === "live" ? "text-[#ff8a8d]" : "text-muted")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", d.status === "live" ? "live-dot bg-[#e5484d]" : "bg-muted")} />
                {statut}
                {d.status === "live" ? ` · ${d.viewers} spectateur${d.viewers > 1 ? "s" : ""}` : ""}
              </span>
            </span>
            <Link href={`/direct/${d.id}`} className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[11.5px] text-dim">
              Voir →
            </Link>
          </div>

          {d.gerable && d.ingest ? (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3">
              <span className="text-[10.5px] tracking-[0.12em] text-muted uppercase">Envoyer la vidéo</span>
              <button type="button" onClick={() => setFilmer(true)} className="press h-10 rounded-full bg-gold text-[12.5px] font-semibold text-gold-ink">
                Filmer avec ce téléphone
              </button>
              <Ligne label="Serveur (OBS)" valeur={d.ingest.server} onCopier={() => copier(d.ingest!.server, "Serveur")} />
              <Ligne
                label="Clé de stream"
                valeur={voirCle ? d.ingest.key : "•••••••••••••••"}
                onCopier={() => copier(d.ingest!.key, "Clé")}
                action={
                  <button type="button" onClick={() => setVoirCle((v) => !v)} className="text-[11px] text-muted">
                    {voirCle ? "Masquer" : "Afficher"}
                  </button>
                }
              />
              <p className="text-[11px] text-muted">Dans OBS : Intervalle d&apos;images clés à 1 s, pour un direct sans retard.</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 rounded-card border border-line p-3">
            <span className="text-[10.5px] tracking-[0.12em] text-muted uppercase">Barre de score pour OBS</span>
            <Ligne label="Source navigateur · 1920 × 1080" valeur={vue.incrustation} onCopier={() => copier(vue.incrustation, "Adresse")} />
            <a href={`${vue.incrustation}?fond=table`} target="_blank" rel="noreferrer" className="text-[11.5px] text-gold-text">
              Aperçu de la barre →
            </a>
            {d.gerable ? (
              <label className="flex items-start gap-2 text-[11.5px] text-dim">
                <input
                  type="checkbox"
                  checked={d.barreVideo}
                  disabled={pending}
                  onChange={(e) => faire(() => reglerBarreVideo(d.id, e.target.checked), e.target.checked ? "Barre incrustée par OBS" : "Barre ajoutée par l'app")}
                  className="mt-0.5 accent-[#e0b43a]"
                />
                La barre est déjà incrustée dans la vidéo par OBS : l&apos;app n&apos;en ajoute pas une seconde.
              </label>
            ) : null}
          </div>

          {d.gerable ? (
            <div className="flex items-end gap-2">
              <label className="flex min-w-0 grow flex-col gap-1">
                <span className="text-[10.5px] tracking-[0.12em] text-muted uppercase">Présenté par</span>
                <input
                  value={partenaire}
                  onChange={(e) => setPartenaire(e.target.value)}
                  placeholder="Partenaire (optionnel)"
                  maxLength={40}
                  className="h-10 rounded-card border border-line bg-transparent px-3 text-[13px]"
                />
              </label>
              <button
                type="button"
                disabled={pending || partenaire === d.sponsor}
                onClick={() => faire(() => reglerPartenaire(d.id, partenaire), "Partenaire affiché")}
                className="press h-10 rounded-full border border-line px-3.5 text-[12px] disabled:opacity-40"
              >
                OK
              </button>
            </div>
          ) : null}

          {d.gerable ? (
            <button type="button" disabled={pending} onClick={() => faire(() => detacherDirect(matchId), "Direct détaché")} className="press self-start text-[11.5px] text-muted underline-offset-4 hover:underline">
              Détacher ce direct du match
            </button>
          ) : null}
        </>
      ) : vue.peut ? (
        <>
          <p className="text-[12px] text-muted">
            Aucun direct sur ce match. Ouvre-le : la barre de score de la vidéo suivra ta feuille, coup par coup.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => faire(() => creerDirectDuMatch(matchId), "Direct créé")}
            className="press flex h-11 items-center justify-center gap-2 rounded-full bg-gold text-[13px] font-semibold text-gold-ink disabled:opacity-50"
          >
            {pending ? <Spinner size={14} /> : null}
            Créer le direct de ce match
          </button>
          {vue.candidats.length ? (
            <div className="flex gap-2">
              <select value={choix} onChange={(e) => setChoix(e.target.value)} className="h-10 min-w-0 grow rounded-card border border-line bg-surface px-2 text-[12.5px]">
                <option value="">Ou lier un direct déjà ouvert…</option>
                {vue.candidats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titre}
                    {c.status === "live" ? " · en direct" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !choix}
                onClick={() => faire(() => lierDirect(matchId, choix), "Direct lié au match")}
                className="press h-10 rounded-full border border-line px-3.5 text-[12px] disabled:opacity-40"
              >
                Lier
              </button>
            </div>
          ) : null}
          <Ligne label="Barre de score pour OBS (pas la vidéo)" valeur={vue.incrustation} onCopier={() => copier(vue.incrustation, "Adresse")} />
        </>
      ) : (
        <>
          <p className="text-[12px] text-muted">
            Aucun direct sur ce match. Pour le filmer, le gérant de la salle l&apos;ouvre — ou toi, dès le niveau Cogneur.
          </p>
          <Ligne label="Barre de score pour OBS (pas la vidéo)" valeur={vue.incrustation} onCopier={() => copier(vue.incrustation, "Adresse")} />
        </>
      )}

      <Sheet open={filmer} onClose={() => setFilmer(false)} title="Filmer le match">
        {d?.ingest && filmer ? <GoLive whip={d.ingest.whip} streamKey={d.ingest.key} title={d.titre} /> : null}
      </Sheet>
    </div>
  );
}

function Ligne({ label, valeur, onCopier, action }: { label: string; valeur: string; onCopier: () => void; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[10.5px] text-muted">
        {label}
        {action}
      </span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 grow truncate rounded-card bg-surface-2 px-2.5 py-2 text-[11.5px]">{valeur}</code>
        <button type="button" onClick={onCopier} className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px]">
          Copier
        </button>
      </div>
    </div>
  );
}
