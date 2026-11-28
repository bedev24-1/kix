"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CAMERA_LABEL, QrCamera, type CameraState } from "@/components/mb/QrCamera";
import { Card } from "@/components/ui/Card";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, QrIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/Spinner";
import { scanCode } from "@/lib/actions";
import { cn } from "@/lib/cn";

type Feedback = { ok: boolean; title: string; detail: string; seq: number } | null;

/**
 * Les laissez-passer déjà relayés, pour cet onglet.
 *
 * Hors de React à dessein : après un débit, `router.refresh()` remonte la
 * console et une mémoire tenue par `useRef` repartait vide. Le client n'ayant
 * pas encore rangé son téléphone, le même QR était relu et « Refusé — code
 * déjà utilisé » s'affichait par-dessus le succès. Un laissez-passer ne sert
 * qu'une fois : l'oublier n'a aucun intérêt.
 */
const dejaLus = new Set<string>();

/** Console de scan : QR au-dessus, code de secours à 4 chiffres en dessous. */
/**
 * `samplePass` est un laissez-passer signé, identique à celui que le téléphone
 * du client affiche en QR : le bouton de démonstration emprunte donc le même
 * chemin de vérification qu'une vraie lecture au comptoir.
 */
export function ScanConsole({ samplePass }: { samplePass?: string }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [camera, setCamera] = useState<CameraState>("demarrage");
  const seq = useRef(0);

  function validate(raw: string, method: "qr" | "code") {
    startTransition(async () => {
      const result = await scanCode(raw, method);
      if (!result.ok) {
        setFeedback({ ok: false, title: "Refusé", detail: result.error, seq: ++seq.current });
        notify("Code refusé", { detail: result.error, tone: "warn" });
        return;
      }
      if (result.kind === "token") {
        setFeedback({
          ok: true,
          title: "Jeton débité",
          detail: `${result.client} · ${result.venue} · il lui reste ${result.remaining} jetons`,
          seq: ++seq.current,
        });
        notify("Jeton débité", { detail: result.client });
      } else {
        setFeedback({ ok: true, title: "Pass validé", detail: `${result.client} · ${result.event}`, seq: ++seq.current });
        notify("Pass validé", { detail: result.event, tone: "jade" });
      }
      setCode("");
      router.refresh();
    });
  }

  return (
    <Card shape="panel" className="flex min-h-0 flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px]">Scanner un QR</h2>
        <span
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px]",
            camera === "active"
              ? "border-gold/30 bg-gold/12 text-gold-text"
              : camera === "demarrage"
                ? "border-line bg-surface-2 text-muted"
                : "border-warn/40 bg-warn/12 text-warn",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              camera === "active" ? "bg-gold" : camera === "demarrage" ? "bg-muted" : "bg-warn",
            )}
          />
          {CAMERA_LABEL[camera]}
        </span>
      </div>

      <div
        key={feedback ? `frame-${feedback.seq}` : "frame"}
        className={cn(
          "relative min-h-56 grow overflow-hidden rounded-panel border bg-black",
          feedback?.ok ? "flash border-gold/60" : feedback ? "shake border-warn/60" : "border-line",
        )}
      >
        {/* `paused` tient la caméra muette tant qu'une validation est en vol. */}
        <QrCamera
          onCode={(valeur) => {
            if (dejaLus.has(valeur)) return;
            dejaLus.add(valeur);
            validate(valeur, "qr");
          }}
          paused={pending}
          onState={setCamera}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(217,180,80,0.10),rgba(8,8,10,0.55)_75%)]" />
        <svg
          width="188"
          height="188"
          viewBox="0 0 176 176"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -mt-24 -ml-24"
        >
          <path d="M4 46V16a12 12 0 0 1 12-12h30" stroke="#D9B450" strokeWidth="4" strokeLinecap="round" />
          <path d="M130 4h30a12 12 0 0 1 12 12v30" stroke="#D9B450" strokeWidth="4" strokeLinecap="round" />
          <path d="M172 130v30a12 12 0 0 1-12 12h-30" stroke="#D9B450" strokeWidth="4" strokeLinecap="round" />
          <path d="M46 172H16a12 12 0 0 1-12-12v-30" stroke="#D9B450" strokeWidth="4" strokeLinecap="round" />
        </svg>
        {camera === "active" ? (
          <div className="scan-line pointer-events-none absolute top-1/2 left-1/2 -ml-22 h-0.5 w-44 bg-linear-to-r from-transparent via-gold to-transparent shadow-[0_0_16px_rgba(217,180,80,0.8)]" />
        ) : null}
        {camera === "active" ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-[13px] text-white/75">
            Le jeton est débité dès que le code est lu
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="text-[13px] whitespace-nowrap text-muted">Code secours</span>
        <div className="relative flex grow gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "grid h-13 grow place-items-center rounded-none border bg-bg-2 text-[21px] font-bold",
                code.length === i ? "border-[1.5px] border-gold text-gold-text" : "border-line text-ink",
              )}
            >
              {code[i] ?? "–"}
            </span>
          ))}
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
              setFeedback(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && validate(code, "code")}
            inputMode="numeric"
            autoComplete="off"
            aria-label="Code de secours à 4 chiffres"
            className="absolute inset-0 w-full cursor-pointer bg-transparent text-transparent caret-transparent outline-none"
          />
        </div>
        <button
          onClick={() => validate(code, "code")}
          disabled={pending}
          className="press flex h-13 items-center justify-center gap-2 rounded-full bg-gold px-6 text-sm font-semibold text-gold-ink transition hover:brightness-105 disabled:opacity-50"
        >
          {pending ? <Spinner size={16} /> : null}
          {pending ? "Lecture…" : "Valider"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            samplePass
              ? validate(samplePass, "qr")
              : setFeedback({ ok: false, title: "Refusé", detail: "Aucun jeton actif à scanner", seq: ++seq.current })
          }
          disabled={pending}
          data-pass={samplePass}
          className="glass press flex h-11 items-center gap-2 rounded-full px-4 text-[13px] text-dim transition hover:bg-surface-2 hover:text-ink"
        >
          <QrIcon size={16} />
          Simuler un scan
        </button>
        {feedback ? (
          <span
            key={feedback.seq}
            className={cn(
              "pop flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[13px]",
              feedback.ok
                ? "border border-gold/40 bg-gold/12 text-gold-text"
                : "border border-warn/40 bg-warn/12 text-warn",
            )}
          >
            {feedback.ok ? <CheckIcon size={14} /> : null}
            <span className="font-semibold">{feedback.title}</span>
            <span className="text-muted">{feedback.detail}</span>
          </span>
        ) : null}
      </div>
    </Card>
  );
}
