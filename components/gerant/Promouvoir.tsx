"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { demanderPromotion, payerPromotion } from "@/lib/actions-promo";
import { fcfa } from "@/lib/format";
import { cn } from "@/lib/cn";

export type TarifVue = { formule: string; nom: string; prix: number; jours: number };
export type PromoVue = { id: string; formule: string; status: string; prix: number; debut: string | null; fin: string | null; motif: string };

const DETAILS: Record<string, string> = {
  sponsorise: "Mention « Sponsorisé » et place en tête de la liste des événements.",
  une: "La grande vitrine de l'accueil, de l'app et du site.",
  popup: "Un pop-up avec ton affiche, une fois par jour par joueur.",
  notification: "Une notification à tous les joueurs, et un rappel la veille d'un tournoi.",
  pack: "À la une + sponsorisé + pop-up + notification.",
};

const ETATS: Record<string, string> = {
  demande: "En attente de validation",
  valide: "Validée · à payer",
  payee: "Programmée",
  refusee: "Refusée",
};

/**
 * Promouvoir son événement : choisir une formule et une date, attendre la
 * validation de l'administration, puis payer. La promotion entre alors dans
 * la file de la vitrine, au premier créneau libre.
 */
export function Promouvoir({ eventId, tarifs, promos, phone }: { eventId: string; tarifs: TarifVue[]; promos: PromoVue[]; phone: string }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [choix, setChoix] = useState(tarifs[0]?.formule ?? "");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();
  const [aPayer, setAPayer] = useState<PromoVue | null>(null);
  const jour = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "");

  return (
    <Card shape="panel" className="flex flex-col gap-3.5 p-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold">Promouvoir cet événement</h2>
        <p className="text-[12px] text-muted">L&apos;administration valide le visuel, tu paies, et la promotion passe au premier créneau libre.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {tarifs.map((t) => (
          <button
            key={t.formule}
            onClick={() => setChoix(t.formule)}
            className={cn(
              "press flex flex-col items-start gap-1 rounded-panel border p-3 text-left transition",
              choix === t.formule ? "border-gold bg-gold/10" : "border-line",
            )}
          >
            <span className="flex w-full items-baseline justify-between gap-2">
              <span className="text-[13.5px] font-semibold">{t.nom}</span>
              <span className="text-[13px] font-bold text-gold-text">{fcfa(t.prix)}</span>
            </span>
            <span className="text-[11.5px] text-muted">
              {t.jours} jour{t.jours > 1 ? "s" : ""} · {DETAILS[t.formule] ?? ""}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] tracking-[0.08em] text-muted uppercase">À partir du</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-full border border-line bg-surface px-4 text-[13px] text-ink" />
        </label>
        <button
          disabled={pending || !choix}
          onClick={() =>
            start(async () => {
              const res = await demanderPromotion(eventId, choix, date);
              if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
              notify("Demande envoyée", { detail: "L'administration va la valider.", tone: "jade" });
              router.refresh();
            })
          }
          className="press h-11 rounded-full bg-gold px-5 text-[13px] font-semibold text-gold-ink disabled:opacity-50"
        >
          Demander la promotion
        </button>
      </div>

      {promos.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-panel border border-line">
          {promos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-[12.5px]">
              <span className="min-w-0 grow">
                <span className="font-semibold">{tarifs.find((t) => t.formule === p.formule)?.nom ?? p.formule}</span>
                <span className="text-muted"> · {fcfa(p.prix)}</span>
                <span className="block text-[11.5px] text-muted">
                  {p.status === "payee" ? `Du ${jour(p.debut)} au ${jour(p.fin)}` : ETATS[p.status] ?? p.status}
                  {p.status === "refusee" && p.motif ? ` : ${p.motif}` : ""}
                </span>
              </span>
              {p.status === "valide" ? (
                <button onClick={() => setAPayer(p)} className="press h-9 rounded-full bg-gold px-4 text-[12px] font-semibold text-gold-ink">
                  Payer {fcfa(p.prix)}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Sheet open={aPayer !== null} onClose={() => setAPayer(null)} title="Payer la promotion">
        {aPayer ? (
          <MomoCheckout
            amount={aPayer.prix}
            defaultPhone={phone}
            start={async (numero: string, method: Method) => {
              const res = await payerPromotion(aPayer.id, method, numero);
              if (!res.ok) return res;
              return { ok: true as const, reference: res.reference, instruction: res.instruction };
            }}
            onPaid={() => {
              notify("Promotion programmée", { detail: "Elle passe au premier créneau libre.", tone: "jade" });
              setAPayer(null);
              router.refresh();
            }}
            label={`Payer · ${fcfa(aPayer.prix)}`}
          />
        ) : null}
      </Sheet>
    </Card>
  );
}
