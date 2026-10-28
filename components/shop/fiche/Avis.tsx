"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, StarIcon } from "@/components/icons";
import { useSnackbar } from "@/components/ui/Snackbar";
import { noterArticle } from "@/lib/actions-avis";
import { cn } from "@/lib/cn";
import type { ResumeAvis } from "@/lib/avis";

export function Etoiles({ note, taille = 12, className }: { note: number; taille?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[#e0b43a]", className)} aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={taille} plein={note >= i - 0.25} strokeWidth={1.6} />
      ))}
    </span>
  );
}

const ilYa = (iso: string) => {
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 7) return `il y a ${j} jours`;
  if (j < 14) return "la semaine dernière";
  if (j < 31) return `il y a ${Math.floor(j / 7)} semaines`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

/** La note moyenne, la répartition des étoiles, puis les avis. */
export function SectionAvis({
  productId,
  resume,
  peutNoter,
  monAvis,
}: {
  productId: string;
  resume: ResumeAvis;
  peutNoter: boolean;
  monAvis: { note: number; texte: string } | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {resume.total > 0 ? (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start">
            <span className="text-[42px] leading-none font-extrabold">{resume.moyenne.toLocaleString("fr-FR")}</span>
            <Etoiles note={resume.moyenne} className="mt-1.5" />
            <span className="mt-1 text-[11px] text-[#6a706c]">{resume.total} avis</span>
          </div>
          <div className="flex grow flex-col gap-1">
            {resume.repartition.map((nb, i) => (
              <div key={i} className="flex items-center gap-2 text-[10.5px] text-[#6a706c]">
                <span className="w-2">{5 - i}</span>
                <span className="relative h-1.5 grow overflow-hidden rounded-full bg-[#e2dccf]">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[#e0b43a]" style={{ width: `${resume.total ? (nb / resume.total) * 100 : 0}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-[#6a706c]">Pas encore d&apos;avis. {peutNoter ? "Sois le premier à donner le tien." : "Les acheteurs pourront le noter ici."}</p>
      )}

      {peutNoter ? <FormulaireAvis productId={productId} monAvis={monAvis} /> : null}

      {resume.liste.map((a) => (
        <article key={a.id} className="rounded-2xl bg-white p-3.5">
          <div className="flex items-center gap-2.5">
            {a.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0e1512] text-[12px] font-bold text-[#e0b43a]">{a.nom.slice(0, 1)}</span>
            )}
            <span className="min-w-0 grow">
              <span className="block truncate text-[13px] font-bold">{a.nom}</span>
              <span className="block text-[10.5px] text-[#8a8f8b]">
                {ilYa(a.date)}
                {a.variante ? ` · ${a.variante}` : ""}
              </span>
            </span>
            <Etoiles note={a.note} taille={11} />
          </div>
          {a.texte ? <p className="mt-2 text-[12.5px] leading-5 text-[#3d4440]">{a.texte}</p> : null}
          <span className="mt-1.5 flex items-center gap-1 text-[10.5px] text-[#2f8f5b]">
            <CheckIcon size={11} /> Achat vérifié
          </span>
        </article>
      ))}
    </div>
  );
}

function FormulaireAvis({ productId, monAvis }: { productId: string; monAvis: { note: number; texte: string } | null }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [note, setNote] = useState(monAvis?.note ?? 0);
  const [texte, setTexte] = useState(monAvis?.texte ?? "");
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2.5 rounded-2xl border border-[#e2dccf] p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await noterArticle(productId, note, texte);
          if (!r.ok) return notify("Avis non enregistré", { detail: r.error, tone: "warn" });
          notify(monAvis ? "Avis mis à jour" : "Merci pour ton avis", { tone: "jade" });
          router.refresh();
        });
      }}
    >
      <span className="text-[12.5px] font-bold">{monAvis ? "Ton avis" : "Tu l'as acheté : donne ton avis"}</span>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Ta note">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={note === i}
            aria-label={`${i} étoile${i > 1 ? "s" : ""}`}
            onClick={() => setNote(i)}
            className={cn("press", note >= i ? "text-[#e0b43a]" : "text-[#c9c2b2]")}
          >
            <StarIcon size={26} plein={note >= i} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        maxLength={600}
        rows={2}
        placeholder="Ce que tu en as pensé (facultatif)"
        className="rounded-xl border border-[#e2dccf] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#b9893b]"
      />
      <button
        type="submit"
        disabled={pending || note === 0}
        className="press h-10 self-start rounded-full bg-[#0e1512] px-5 text-[12.5px] font-bold text-[#e0b43a] disabled:opacity-40"
      >
        {monAvis ? "Mettre à jour" : "Publier mon avis"}
      </button>
    </form>
  );
}
