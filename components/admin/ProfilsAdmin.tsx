"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";
import { accorderProfil, certifierCompte, certifierSalle, deciderCertification, deciderProfil, retirerCertification, retirerProfil } from "@/lib/actions-profils";

/** Accorder un profil sans paiement : par numéro, pour une durée ou sans limite. */
export function AccorderProfil() {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [cle, setCle] = useState(0);
  return (
    <form
      key={cle}
      action={(fd) =>
        start(async () => {
          const res = await accorderProfil(fd);
          if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
          notify("Profil accordé", { detail: res.nom, tone: "jade" });
          setCle((c) => c + 1);
          router.refresh();
        })
      }
      className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Numéro du compte</span>
        <input name="phone" required inputMode="tel" placeholder="6 77 45 12 08" className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Profil</span>
        <select name="type" className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink">
          <option value="arbitre">Arbitre</option>
          <option value="pro">Joueur pro</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Durée</span>
        <select name="mois" defaultValue="1" className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink">
          <option value="1">1 mois</option>
          <option value="3">3 mois</option>
          <option value="6">6 mois</option>
          <option value="12">12 mois</option>
          <option value="0">Sans limite</option>
        </select>
      </label>
      <button disabled={pending} className="press flex h-11 items-center justify-center gap-2 rounded-full bg-gold px-5 text-[13px] font-semibold text-gold-ink disabled:opacity-60">
        {pending ? <Spinner size={14} /> : null}
        Accorder
      </button>
    </form>
  );
}

/** Les gestes sur une ligne : valider, activer, refuser, retirer. */
export function DecisionsProfil({ id, status, certification = false }: { id: string; status: string; certification?: boolean }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const faire = (action: () => Promise<{ ok: boolean; error?: string }>, succes: string) =>
    start(async () => {
      const res = await action();
      if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
      notify(succes, { tone: "jade" });
      router.refresh();
    });
  const bouton = "rounded-full border border-line px-3 py-1.5 text-[11px] disabled:opacity-50";
  if (certification) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <button disabled={pending} className={`${bouton} border-[#0866FF]/60 text-[#4b8dff]`} onClick={() => faire(() => deciderCertification(id, true), "Compte certifié")}>
          Certifier
        </button>
        <button disabled={pending} className={`${bouton} text-warn`} onClick={() => faire(() => deciderCertification(id, false), "Demande refusée")}>
          Refuser
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "demande" ? (
        <>
          <button disabled={pending} className={`${bouton} border-gold/50 text-gold-text`} onClick={() => faire(() => deciderProfil(id, "valide"), "Validé : il peut payer")}>
            Valider (à payer)
          </button>
          <button disabled={pending} className={bouton} onClick={() => faire(() => deciderProfil(id, "actif"), "Activé un mois, offert")}>
            Activer gratuitement
          </button>
          <button disabled={pending} className={`${bouton} text-warn`} onClick={() => faire(() => deciderProfil(id, "refuse"), "Demande refusée")}>
            Refuser
          </button>
        </>
      ) : status !== "retire" && status !== "refuse" ? (
        <button disabled={pending} className={`${bouton} text-warn`} onClick={() => faire(() => retirerProfil(id), "Profil retiré")}>
          Retirer
        </button>
      ) : null}
    </div>
  );
}

/** Certifier un compte : numéro + motif. */
export function CertifierCompte({ motifs }: { motifs: [string, string][] }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [cle, setCle] = useState(0);
  return (
    <form
      key={cle}
      action={(fd) =>
        start(async () => {
          const res = await certifierCompte(fd);
          if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
          notify("Compte certifié", { detail: res.nom, tone: "jade" });
          setCle((c) => c + 1);
          router.refresh();
        })
      }
      className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Numéro du compte</span>
        <input name="phone" required inputMode="tel" placeholder="6 77 45 12 08" className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] tracking-[0.1em] text-muted uppercase">Motif</span>
        <select name="motif" className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink">
          {motifs.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} className="press flex h-11 items-center justify-center gap-2 rounded-full bg-[#0866FF] px-5 text-[13px] font-semibold text-white disabled:opacity-60">
        {pending ? <Spinner size={14} /> : null}
        Certifier
      </button>
    </form>
  );
}

/** Retirer une certification, ou basculer celle d'une salle. */
export function BasculeCertification({ cible, id, actif }: { cible: "compte" | "salle"; id: string; actif: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (cible === "compte") await retirerCertification(id);
          else await certifierSalle(id, !actif);
          router.refresh();
        })
      }
      className={`rounded-full border px-3 py-1.5 text-[11px] disabled:opacity-50 ${actif ? "border-line text-warn" : "border-[#0866FF]/60 text-[#4b8dff]"}`}
    >
      {cible === "compte" ? "Retirer" : actif ? "Retirer la certification" : "Certifier la salle"}
    </button>
  );
}
