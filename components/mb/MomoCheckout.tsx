"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ArrowRightIcon, CheckIcon, ClockIcon, LockIcon } from "@/components/icons";
import { moyensDePaiement, pollPayment } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { fcfa } from "@/lib/format";
import { displayPhone, isValidPhone, normalizePhone, operateurDuNumero } from "@/lib/phone";

export type Method = "om" | "momo";

export type StartPayment = (
  phone: string,
  method: Method,
) => Promise<{ ok: true; reference: string; instruction?: string } | { ok: false; error: string }>;

type Stage = "idle" | "starting" | "waiting" | "failed";

const NOMS: Record<Method, string> = { om: "Orange Money", momo: "MTN MoMo" };

/** Intervalle d'interrogation : le webhook arrive en général avant. */
const POLL_MS = 2000;

/**
 * Le paiement Mobile Money, de la saisie du numéro à la confirmation.
 *
 * L'opérateur pousse une demande sur le téléphone du client ; on attend ensuite
 * son verdict, qui arrive par webhook. Cet écran interroge aussi le serveur
 * toutes les deux secondes : si la notification se perd, le client n'est pas
 * bloqué pour autant.
 */
export function MomoCheckout({
  amount,
  defaultPhone,
  start,
  onPaid,
  label,
  hint,
  disabled,
}: {
  amount: number;
  defaultPhone: string;
  start: StartPayment;
  onPaid: () => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const [method, setMethod] = useState<Method>("momo");
  const [phone, setPhone] = useState(displayPhone(defaultPhone));
  const [stage, setStage] = useState<Stage>("idle");
  const [instruction, setInstruction] = useState<string>();
  const [error, setError] = useState<string>();
  const [elapsed, setElapsed] = useState(0);
  const reference = useRef<string | null>(null);

  // Les moyens ouverts chez l'encaisseur (null tant qu'on ne sait pas). Le
  // serveur refuse de toute façon un moyen fermé : ceci évite d'y arriver.
  const [ouvertes, setOuvertes] = useState<Method[] | null>(null);
  useEffect(() => {
    let vivant = true;
    moyensDePaiement()
      .then((m) => {
        if (!vivant) return;
        setOuvertes(m);
        setMethod((actuel) => (m.includes(actuel) || !m.length ? actuel : m[0]));
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);
  const ouvert = (m: Method) => !ouvertes || ouvertes.includes(m);

  const clean = normalizePhone(phone);
  const operateur = operateurDuNumero(clean);
  // Un numéro Orange quand Orange est fermé : aucun moyen ne peut le débiter.
  const numeroFerme = operateur !== null && !ouvert(operateur);
  const ready = isValidPhone(clean) && !numeroFerme && ouvert(method) && !disabled;

  function saisir(valeur: string) {
    setPhone(valeur);
    setError(undefined);
    // Le préfixe dit l'opérateur : on le choisit pour le client.
    const op = operateurDuNumero(normalizePhone(valeur));
    if (op && ouvert(op)) setMethod(op);
  }

  async function pay() {
    if (!ready) {
      setError(
        numeroFerme
          ? `${NOMS[operateur!]} est indisponible pour le moment. Utilise un numéro ${NOMS[ouvertes?.[0] ?? "momo"]}.`
          : !ouvert(method)
            ? `${NOMS[method]} est indisponible pour le moment.`
            : "Entre un numéro Mobile Money valide.",
      );
      return;
    }
    setStage("starting");
    setError(undefined);

    const result = await start(clean, method);
    if (!result.ok) {
      setStage("failed");
      setError(result.error);
      return;
    }
    reference.current = result.reference;
    setInstruction(result.instruction);
    setElapsed(0);
    setStage("waiting");
  }

  // Attente : compte à rebours + interrogation du serveur.
  useEffect(() => {
    if (stage !== "waiting" || !reference.current) return;
    const ref = reference.current;
    let alive = true;

    const tick = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    const poll = window.setInterval(async () => {
      const state = await pollPayment(ref);
      if (!alive || !state || state.status === "pending") return;

      if (state.status === "paid") {
        setStage("idle");
        onPaid();
        return;
      }
      setStage("failed");
      setError(
        state.failureReason ??
          (state.status === "expired"
            ? "Aucune validation reçue. La demande a expiré."
            : "Le paiement a été refusé."),
      );
    }, POLL_MS);

    return () => {
      alive = false;
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [stage, onPaid]);

  if (stage === "waiting") {
    return (
      <Card tone="gold" shape="panel" className="flex flex-col items-center gap-5 px-5 py-9 text-center">
        <span className="relative grid h-16 w-16 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold/25" />
          <Spinner size={34} className="text-gold-text" />
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="text-[20px]">Valide sur ton téléphone</h2>
          <p className="text-[13px] leading-6 text-dim">
            {instruction ?? "Une demande de paiement vient de partir sur ton téléphone."}
          </p>
          <p className="text-[13px] text-muted">
            {fcfa(amount)} · {method === "om" ? "Orange Money" : "MTN MoMo"} · +237 {displayPhone(clean)}
          </p>
        </div>

        <span className="flex items-center gap-1.5 text-[11px] tracking-[0.1em] text-dim uppercase">
          <ClockIcon size={13} />
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")} écoulées
        </span>

        <button
          type="button"
          onClick={() => setStage("idle")}
          className="text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Revenir en arrière
        </button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5">
        <h2 className="text-base">Paiement Mobile Money</h2>
        <div className="flex gap-2.5">
          <MethodTile
            active={method === "om"}
            onClick={() => setMethod("om")}
            code="OM"
            name="Orange Money"
            prefixe="6 9x xx xx xx"
            indisponible={!ouvert("om")}
          />
          <MethodTile
            active={method === "momo"}
            onClick={() => setMethod("momo")}
            code="MoMo"
            name="MTN MoMo"
            prefixe="6 7x xx xx xx"
            indisponible={!ouvert("momo")}
          />
        </div>
        <label className="glass flex h-13 items-center gap-3 rounded-full px-4">
          <span className="text-sm text-muted">+237</span>
          <span className="h-6 w-px bg-line" />
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => saisir(e.target.value)}
            aria-label="Numéro Mobile Money"
            className="w-full grow bg-transparent text-[15px] tracking-[0.04em] outline-none placeholder:text-faint"
          />
          {isValidPhone(clean) && !numeroFerme ? <CheckIcon size={17} className="text-gold-text" /> : null}
        </label>
        {numeroFerme ? (
          <p className="text-[12px] leading-5 text-warn">
            Ce numéro est {NOMS[operateur!]}, indisponible pour le moment. Utilise un numéro{" "}
            {NOMS[ouvertes?.find((m) => m !== operateur) ?? "momo"]}.
          </p>
        ) : null}
      </div>

      <Card tone="dashed" shape="square" className="flex items-center justify-between px-4 py-3.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">Total à payer</span>
          <span className="text-[11px] text-muted">{hint ?? "Frais de service inclus"}</span>
        </span>
        <span className="text-[22px] font-bold tracking-[-0.03em]">{fcfa(amount)}</span>
      </Card>

      {error ? (
        <p role="alert" className="shake rounded-none border border-warn/45 bg-warn/10 px-3.5 py-3 text-[12.5px] text-warn">
          {error}
        </p>
      ) : null}

      <div className="mt-1 flex flex-col gap-2.5">
        <Button size="lg" onClick={pay} loading={stage === "starting"} disabled={disabled || numeroFerme} className="w-full">
          {stage === "starting" ? "Demande envoyée…" : (label ?? `Payer ${fcfa(amount)}`)}
          {stage === "starting" ? null : <ArrowRightIcon size={18} />}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <LockIcon size={12} />
          Confirme la demande Mobile Money sur ton téléphone
        </p>
      </div>
    </div>
  );
}

export function MethodTile({
  active,
  onClick,
  code,
  name,
  prefixe,
  indisponible,
}: {
  active: boolean;
  onClick: () => void;
  code: string;
  name: string;
  prefixe: string;
  indisponible?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={indisponible}
      aria-disabled={indisponible}
      className={cn(
        "press flex grow items-center gap-2.5 rounded-card px-3.5 py-3 text-left transition",
        indisponible
          ? "glass cursor-not-allowed opacity-50"
          : active
            ? "border-[1.5px] border-gold/55 bg-gold/10"
            : "glass hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
          active ? "bg-gold/20 text-gold-text" : "bg-surface-2 text-ink",
        )}
      >
        {code}
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium">{name}</span>
        <span className={cn("text-[11px]", active ? "text-gold-text" : "text-muted")}>
          {indisponible ? "Indisponible" : active ? "Sélectionné" : prefixe}
        </span>
      </span>
    </button>
  );
}
