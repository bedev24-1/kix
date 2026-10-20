"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { demanderCertification } from "@/lib/actions-profils";
import { MOTIFS } from "@/lib/certification";

/** Le badge certifié : ce qu'il dit, et la demande pour l'obtenir. */
export function DemandeCertification({ certifie, demande }: { certifie: string | null; demande: string | null }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [ouvert, setOuvert] = useState(false);
  const [pending, start] = useTransition();
  const [motif, setMotif] = useState<string>("arbitre_officiel");
  const [texte, setTexte] = useState("");

  return (
    <Card shape="panel" className="flex items-center gap-3.5 p-4">
      <BadgeCertifie motif={certifie ?? "arbitre_officiel"} taille={30} className={certifie ? "" : "opacity-40 grayscale"} />
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[14px] font-semibold">{certifie ? "Compte certifié" : "Badge certifié"}</span>
        <span className="text-[11.5px] text-muted">
          {certifie
            ? MOTIFS[certifie as keyof typeof MOTIFS]
            : demande === "demande"
              ? "Ta demande est en cours d'examen."
              : demande === "refuse"
                ? "Demande non retenue. Tu peux en refaire une."
                : "Arbitres officiels, gérants, coachs, pros vérifiés, diffuseurs. Gratuit, accordé par l'administration."}
        </span>
      </span>
      {!certifie && demande !== "demande" ? (
        <button onClick={() => setOuvert(true)} className="press shrink-0 rounded-full border border-[#0866FF]/60 px-3.5 py-2 text-[12px] text-[#4b8dff]">
          Demander
        </button>
      ) : null}

      <Sheet open={ouvert} onClose={() => setOuvert(false)} title="Demander le badge certifié">
        <form
          action={() =>
            start(async () => {
              const res = await demanderCertification(motif, texte);
              if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
              setOuvert(false);
              notify("Demande envoyée", { detail: "L'administration va l'examiner.", tone: "jade" });
              router.refresh();
            })
          }
          className="flex flex-col gap-3.5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[10px]">Je demande en tant que</span>
            <select value={motif} onChange={(e) => setMotif(e.target.value)} className="h-11 rounded-full border border-line bg-surface px-4 text-[13.5px] text-ink">
              {Object.entries(MOTIFS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[10px]">Pourquoi ?</span>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={4}
              required
              placeholder="Ta salle, tes titres, ton expérience d'arbitre, ta chaîne de diffusion…"
              className="rounded-panel border border-line bg-surface px-4 py-3 text-[13.5px] text-ink"
            />
          </label>
          <button disabled={pending} className="press h-12 rounded-full bg-[#0866FF] text-[14px] font-semibold text-white disabled:opacity-60">
            Envoyer ma demande
          </button>
        </form>
      </Sheet>
    </Card>
  );
}
