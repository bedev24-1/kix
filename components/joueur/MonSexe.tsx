"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { useSnackbar } from "@/components/ui/Snackbar";
import { changerMonSexe } from "@/lib/actions";
import { cn } from "@/lib/cn";

/** Homme ou femme : ce qui ouvre les tableaux hommes, dames et mixtes. */
export function MonSexe({ sexe }: { sexe: string | null }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();

  const choisir = (valeur: string) =>
    start(async () => {
      const res = await changerMonSexe(valeur);
      if (!res.ok) notify("Impossible", { detail: res.error, tone: "warn" });
      else router.refresh();
    });

  return (
    <Card shape="panel" className="flex flex-col gap-2.5 p-4">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-semibold">Je suis</span>
        <span className="text-[11.5px] text-muted">
          {sexe ? "Pour les tableaux hommes, dames et mixtes." : "À indiquer pour t'inscrire aux tableaux hommes, dames et mixtes."}
        </span>
      </span>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["homme", "Un homme"],
          ["femme", "Une femme"],
        ].map(([valeur, libelle]) => (
          <button
            key={valeur}
            disabled={pending}
            onClick={() => choisir(valeur)}
            aria-pressed={sexe === valeur}
            className={cn(
              "press h-11 rounded-full border text-[13px] transition disabled:opacity-60",
              sexe === valeur ? "border-gold bg-gold/15 font-semibold text-ink" : "border-line text-dim",
            )}
          >
            {libelle}
          </button>
        ))}
      </div>
    </Card>
  );
}
