import Link from "next/link";
import { Visage } from "@/components/tournoi/direct/Visage";
import type { GroupeVue } from "@/lib/tournoi-direct";
import { cn } from "@/lib/cn";

/**
 * Les poules, comme les groupes de la Ligue des champions : une carte par
 * groupe, le classement en points, la forme des derniers duels, et les
 * qualifiés marqués d'une barre. Une fois les poules finies, ceux qui ne
 * sortent pas s'effacent.
 */
export function Groupes({ poules, finies, qualifies }: { poules: GroupeVue[]; finies: boolean; qualifies: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-1 rounded-full bg-jade" /> Qualifiés ({qualifies} par groupe)
        </span>
        <span>Pts : 3 par victoire · +/− : manches</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {poules.map((p) => (
          <section key={p.numero} className="overflow-hidden rounded-panel border border-line bg-surface">
            <header className="flex items-center justify-between bg-linear-to-r from-[#0b1d5a] to-[#1c3faa] px-3.5 py-2.5 text-white">
              <h3 className="text-[14px] font-bold tracking-[0.04em] uppercase">Groupe {p.nom}</h3>
              <span className="text-[10.5px] text-white/75">
                {p.joues}/{p.total} duels
              </span>
            </header>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] tracking-[0.06em] text-muted uppercase">
                  <th className="w-7 py-1.5 pl-3 text-left font-medium">#</th>
                  <th className="py-1.5 text-left font-medium">Joueur</th>
                  <th className="w-6 text-center font-medium">J</th>
                  <th className="w-6 text-center font-medium">V</th>
                  <th className="w-6 text-center font-medium">D</th>
                  <th className="w-8 text-center font-medium">+/−</th>
                  <th className="w-9 pr-3 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {p.lignes.map((l) => {
                  const sorti = finies && !l.qualifie;
                  return (
                    <tr key={l.id} className={cn("border-t border-line", sorti && "opacity-40")}>
                      <td className="relative py-2 pl-3 tabular-nums">
                        {l.qualifie ? <span className="absolute top-1 bottom-1 left-0 w-1 rounded-r bg-jade" /> : null}
                        {l.rang}
                      </td>
                      <td className="max-w-0 py-2">
                        <Link href={`/app/joueurs/${l.userId}`} className="flex min-w-0 items-center gap-2">
                          <Visage nom={l.nom} avatar={l.avatar} taille={24} />
                          <span className="flex min-w-0 flex-col">
                            <span className={cn("truncate font-semibold", l.qualifie && "text-ink")}>{l.nom}</span>
                            {l.forme.length ? (
                              <span className="flex gap-0.5 pt-0.5">
                                {l.forme.map((r, i) => (
                                  <span
                                    key={i}
                                    className={cn("h-1.5 w-1.5 rounded-full", r === "V" ? "bg-jade" : "bg-warn")}
                                    title={r === "V" ? "Victoire" : "Défaite"}
                                  />
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </td>
                      <td className="text-center tabular-nums text-dim">{l.joues}</td>
                      <td className="text-center tabular-nums text-dim">{l.victoires}</td>
                      <td className="text-center tabular-nums text-dim">{l.defaites}</td>
                      <td className="text-center tabular-nums text-dim">
                        {l.difference > 0 ? `+${l.difference}` : l.difference}
                      </td>
                      <td className="pr-3 text-right font-bold tabular-nums">{l.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ProchainsDuels duels={p.duels.filter((d) => d.status !== "termine" && d.a && d.b).slice(0, 3)} />
          </section>
        ))}
      </div>
    </div>
  );
}

/** Les duels à venir d'un groupe : qui contre qui, à quelle table, sous quel arbitre. */
function ProchainsDuels({ duels }: { duels: GroupeVue["duels"] }) {
  if (duels.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 border-t border-line bg-bg/40 px-3 py-2">
      {duels.map((d) => (
        <li key={d.id} className="flex items-center gap-2 text-[11px] text-muted">
          <span className="min-w-0 grow truncate">
            <span className="text-dim">{d.a?.nom}</span> – <span className="text-dim">{d.b?.nom}</span>
          </span>
          {d.table ? <span className="shrink-0">Table {d.table}</span> : null}
          {d.arbitre ? <span className="shrink-0 text-gold-text">Arb. {d.arbitre.nom}</span> : null}
        </li>
      ))}
    </ul>
  );
}
