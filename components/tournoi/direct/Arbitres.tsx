import { Visage } from "@/components/tournoi/direct/Visage";
import type { ArbitreVue } from "@/lib/tournoi-direct";

/** Les arbitres du tournoi, classés comme une poule : duels tenus, à venir. */
export function Arbitres({ arbitres }: { arbitres: ArbitreVue[] }) {
  if (arbitres.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-panel border border-line bg-surface">
      <header className="bg-linear-to-r from-[#3a2a05] to-[#8a6a12] px-3.5 py-2.5 text-white">
        <h3 className="text-[14px] font-bold tracking-[0.04em] uppercase">Les arbitres</h3>
      </header>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[10px] tracking-[0.06em] text-muted uppercase">
            <th className="w-7 py-1.5 pl-3 text-left font-medium">#</th>
            <th className="py-1.5 text-left font-medium">Arbitre</th>
            <th className="w-14 text-center font-medium">Arbitrés</th>
            <th className="w-14 text-center font-medium">À venir</th>
            <th className="w-12 pr-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {arbitres.map((a, i) => (
            <tr key={a.id} className="border-t border-line">
              <td className="py-2 pl-3 tabular-nums">{i + 1}</td>
              <td className="max-w-0 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Visage nom={a.nom} avatar={a.avatar} taille={24} />
                  <span className="truncate font-semibold">{a.nom}</span>
                </span>
              </td>
              <td className="text-center tabular-nums">{a.termines}</td>
              <td className="text-center tabular-nums text-dim">{a.aVenir}</td>
              <td className="pr-3 text-right font-bold tabular-nums">{a.duels}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
