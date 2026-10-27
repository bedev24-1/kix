"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { BoltIcon, CheckIcon, PinIcon } from "@/components/icons";
import { inviterPresents, jePars, jeSuisLa } from "@/lib/actions-salles";
import { INVITES_MAX } from "@/lib/salles-geo";
import { cn } from "@/lib/cn";

/** « Je suis là » / « Je pars » — la position du téléphone confirme qu'on est sur place. */
export function BoutonPresence({ venueId, present }: { venueId: string; present: boolean }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string>();

  const signaler = () => {
    setErreur(undefined);
    const envoyer = (lat: number | null, lng: number | null) =>
      start(async () => {
        const r = await jeSuisLa(venueId, lat, lng);
        if (!r.ok) return setErreur(r.error);
        notify("Tu es signalé présent pour 3 heures", { tone: "jade" });
        router.refresh();
      });
    if (!navigator.geolocation) return envoyer(null, null);
    navigator.geolocation.getCurrentPosition(
      (p) => envoyer(p.coords.latitude, p.coords.longitude),
      () => envoyer(null, null),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const partir = () =>
    start(async () => {
      await jePars();
      notify("Bonne route !", { tone: "jade" });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={present ? partir : signaler}
        disabled={pending}
        className={cn(
          "press flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition disabled:opacity-50",
          present ? "border border-line text-dim" : "bg-jade text-white hover:brightness-105",
        )}
      >
        {present ? <CheckIcon size={17} /> : <PinIcon size={17} />}
        {pending ? "Un instant…" : present ? "Je suis là · je pars" : "Je suis dans cette salle"}
      </button>
      {erreur ? <p className="text-center text-[12px] text-warn">{erreur}</p> : null}
    </div>
  );
}

export type PresentChoix = { id: string; name: string; detail: string };

/** Inviter quelques joueurs présents à faire une partie. */
export function InviterPresents({ venueId, salle, joueurs }: { venueId: string; salle: string; joueurs: PresentChoix[] }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [ouvert, setOuvert] = useState(false);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState<string>();
  const [pending, start] = useTransition();

  if (joueurs.length === 0) return null;
  const basculer = (id: string) =>
    setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= INVITES_MAX ? c : [...c, id]));

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold text-sm font-semibold text-gold-ink transition hover:brightness-105"
      >
        <BoltIcon size={17} /> Inviter à jouer
      </button>
      <Sheet open={ouvert} onClose={() => setOuvert(false)} title={`Une partie au ${salle} ?`}>
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] text-muted">Jusqu&apos;à {INVITES_MAX} joueurs présents. Ils reçoivent une notification et répondent d&apos;un geste.</p>
          <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {joueurs.map((j) => (
              <label key={j.id} className={cn("press flex items-center gap-3 rounded-card border px-3 py-2.5", choisis.includes(j.id) ? "border-gold/60 bg-gold/10" : "border-line")}>
                <input type="checkbox" checked={choisis.includes(j.id)} onChange={() => basculer(j.id)} className="accent-[var(--color-gold,#d4a017)]" />
                <span className="flex grow flex-col">
                  <span className="text-[13.5px] font-semibold">{j.name}</span>
                  <span className="text-[11.5px] text-muted">{j.detail}</span>
                </span>
              </label>
            ))}
          </div>
          <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={200}
            placeholder={`On fait une partie au ${salle} ?`}
            className="h-11 rounded-card border border-line bg-transparent px-3 text-[13px]" />
          {erreur ? <p className="text-[12px] text-warn">{erreur}</p> : null}
          <button
            disabled={pending || choisis.length === 0}
            onClick={() =>
              start(async () => {
                setErreur(undefined);
                const r = await inviterPresents(venueId, choisis, message);
                if (!r.ok) return setErreur(r.error);
                setOuvert(false);
                setChoisis([]);
                notify(r.envoyees > 1 ? `${r.envoyees} invitations envoyées` : "Invitation envoyée", { tone: "jade" });
                router.refresh();
              })
            }
            className="press h-12 rounded-full bg-gold text-sm font-semibold text-gold-ink disabled:opacity-45"
          >
            {pending ? "Envoi…" : choisis.length ? `Inviter ${choisis.length} joueur${choisis.length > 1 ? "s" : ""}` : "Choisis des joueurs"}
          </button>
        </div>
      </Sheet>
    </>
  );
}
