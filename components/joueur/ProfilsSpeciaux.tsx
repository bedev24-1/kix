"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon } from "@/components/icons";
import { demanderProfil, payerProfil } from "@/lib/actions-profils";
import { PROFILS, type TypeProfil } from "@/lib/profils";
import { fcfa } from "@/lib/format";

export type EtatProfil = { status: string; actifJusqu: string | null; enVigueur: boolean } | null;

/**
 * Les profils spéciaux, vus par le joueur : joueur pro, arbitre. Ce qu'ils
 * coûtent, où il en est, et le bouton qui correspond à son étape.
 */
export function ProfilsSpeciaux({ phone, etats }: { phone: string; etats: Record<TypeProfil, EtatProfil> }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [payer, setPayer] = useState<TypeProfil | null>(null);
  const [pending, start] = useTransition();

  const demander = (type: TypeProfil) =>
    start(async () => {
      const motivation = window.prompt("Pourquoi veux-tu arbitrer ? (expérience, salle, disponibilités)") ?? "";
      const res = await demanderProfil(type, motivation);
      if (!res.ok) notify("Impossible", { detail: res.error, tone: "warn" });
      else {
        notify("Demande envoyée", { detail: "L'administration va l'examiner.", tone: "jade" });
        router.refresh();
      }
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold">Profils spéciaux</h2>
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
        {(Object.keys(PROFILS) as TypeProfil[]).map((type) => {
          const r = PROFILS[type];
          const e = etats[type];
          const jusqu = e?.actifJusqu ? new Date(e.actifJusqu).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
          const statut = e?.enVigueur
            ? jusqu ? `Actif jusqu'au ${jusqu}` : "Actif, sans limite"
            : e?.status === "demande" ? "Demande en cours d'examen"
            : e?.status === "valide" ? "Demande validée : il reste à payer"
            : e?.status === "refuse" ? "Demande refusée"
            : e?.status === "actif" ? "Abonnement échu"
            : null;
          // L'arbitre passe par la validation ; ensuite, comme le pro, il paie.
          const peutPayer = !r.validation || e?.status === "valide" || e?.status === "actif";
          return (
            <Card key={type} shape="panel" tone={e?.enVigueur ? "gold" : "glass"} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{r.nom}</span>
                  <span className="text-[12px] text-muted">{fcfa(r.prix)} / mois</span>
                </span>
                {e?.enVigueur ? <Chip tone="solid" className="text-[10px] uppercase">Actif</Chip> : null}
              </div>
              <ul className="flex flex-col gap-1.5">
                {r.avantages.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-[12.5px] text-dim">
                    <CheckIcon size={14} className="mt-0.5 shrink-0 text-gold-text" />
                    {a}
                  </li>
                ))}
              </ul>
              {statut ? <p className="text-[12px] text-gold-text">{statut}</p> : null}
              {e?.enVigueur && !e.actifJusqu ? null : peutPayer ? (
                <button
                  onClick={() => setPayer(type)}
                  className="press mt-auto h-11 rounded-full bg-gold text-[13px] font-semibold text-gold-ink"
                >
                  {e?.enVigueur ? "Prolonger d'un mois" : `Activer · ${fcfa(r.prix)}`}
                </button>
              ) : e?.status === "demande" ? null : (
                <button
                  disabled={pending}
                  onClick={() => demander(type)}
                  className="press mt-auto h-11 rounded-full border border-line text-[13px] font-semibold disabled:opacity-50"
                >
                  Demander à devenir {r.nom.toLowerCase()}
                </button>
              )}
            </Card>
          );
        })}
      </div>

      <Sheet open={payer !== null} onClose={() => setPayer(null)} title={payer ? PROFILS[payer].nom : ""}>
        {payer ? (
          <MomoCheckout
            amount={PROFILS[payer].prix}
            defaultPhone={phone}
            start={async (numero: string, method: Method) => {
              const res = await payerProfil(payer, method, numero);
              if (!res.ok) return res;
              return { ok: true as const, reference: res.reference, instruction: res.instruction };
            }}
            onPaid={() => {
              notify(`${PROFILS[payer].nom} actif`, { detail: "Un mois de plus sur ton profil.", tone: "jade" });
              setPayer(null);
              router.refresh();
            }}
            hint="30 jours · aucun renouvellement automatique"
            label={`Payer · ${fcfa(PROFILS[payer].prix)}`}
          />
        ) : null}
      </Sheet>
    </section>
  );
}
