import { TrophyIcon } from "@/components/icons";
import { Card } from "@/components/ui/Card";
import type { Cagnotte } from "@/lib/cagnottes";
import { f } from "@/lib/format";

/** Les cagnottes d'un tournoi, une ligne chacune : quoi, pour qui, combien. */
export function Cagnottes({ cagnottes, partage }: { cagnottes: Cagnotte[]; partage?: string }) {
  if (cagnottes.length === 0 && !partage) return null;
  return (
    <Card shape="panel" className="flex flex-col gap-3 p-4">
      <span className="label-caps text-[10px]">Récompenses</span>
      {cagnottes.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line">
          {cagnottes.map((c, i) => (
            <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-text">
                <TrophyIcon size={16} />
              </span>
              <span className="flex min-w-0 grow flex-col">
                <span className="truncate text-[14px] font-semibold">{c.nom || "Cagnotte"}</span>
                {c.pour ? <span className="text-[12px] text-muted">{c.pour}</span> : null}
              </span>
              {c.montant > 0 ? (
                <span className="shrink-0 text-[15px] font-bold text-gold-text">{f(c.montant)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {partage ? <p className="text-[13px] leading-6 text-dim">{partage}</p> : null}
    </Card>
  );
}
