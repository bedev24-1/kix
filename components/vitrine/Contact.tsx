"use client";

import { useActionState } from "react";
import { contacterOrganisateur, type EtatContact } from "@/lib/actions-vitrine";
import { GRAIN, type Palette } from "@/components/vitrine/styles";

const CHAMPS = [
  { name: "nom", label: "Nom*", type: "text", requis: true },
  { name: "telephone", label: "Téléphone*", type: "tel", requis: true },
  { name: "ville", label: "Ville / quartier", type: "text", requis: false },
] as const;

/** « Nous contacter » : privatiser une table, organiser une soirée, un tournoi. */
export function Contact({ slug, couleurs }: { slug: string; couleurs: Palette }) {
  const [etat, envoyer, enCours] = useActionState<EtatContact, FormData>(contacterOrganisateur, null);

  return (
    <section id="contact" className="relative overflow-hidden px-5 pt-14 pb-28 sm:px-10">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{
          background: `radial-gradient(60% 90% at 30% 100%, ${couleurs.a} 0%, transparent 70%), radial-gradient(60% 90% at 75% 100%, ${couleurs.b} 0%, transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      <div className="relative mx-auto grid max-w-4xl gap-8 sm:grid-cols-[1fr_1.3fr]">
        <h2 className="font-mono text-[18px] tracking-[0.12em] text-white uppercase">Contact :</h2>

        <form action={envoyer} className="flex flex-col gap-4">
          <input type="hidden" name="slug" value={slug} />
          {/* Le piège à robots : invisible pour un humain. */}
          <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          {CHAMPS.map((c) => (
            <label key={c.name} className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.12em] text-white/80 uppercase">{c.label}</span>
              <input
                name={c.name}
                type={c.type}
                required={c.requis}
                className="h-8 border-b border-white/40 bg-transparent font-mono text-[13px] text-white outline-none focus:border-white"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.12em] text-white/80 uppercase">Message*</span>
            <textarea
              name="message"
              required
              rows={3}
              className="border-b border-white/40 bg-transparent font-mono text-[13px] text-white outline-none focus:border-white"
            />
          </label>
          {etat ? (
            <p className="font-mono text-[12px]" style={{ color: etat.ok ? "#b9ffcf" : "#ffd0e3" }}>
              {etat.message}
            </p>
          ) : null}
          <button
            disabled={enCours}
            className="press flex h-8 w-fit items-center gap-2 self-end rounded-full bg-white/15 px-4 font-mono text-[11.5px] text-white backdrop-blur disabled:opacity-50"
          >
            → {enCours ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </div>
    </section>
  );
}
