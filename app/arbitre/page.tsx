import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { LiveDot } from "@/components/live/LiveDot";
import { ChevronRightIcon, PinIcon, TargetIcon } from "@/components/icons";
import { getScorableMatches } from "@/lib/live";
import { requireUser } from "@/lib/session";
import { jeuCourt } from "@/lib/regles";

export const metadata = { title: "Feuille de match" };

export default async function ArbitrePage() {
  const user = await requireUser();
  const matches = await getScorableMatches(user);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px]">Les matchs que tu peux marquer</h1>
        <p className="text-[13px] leading-6 text-muted">
          {user.role === "manager" || user.role === "referee"
            ? "Toutes les rencontres de ta salle."
            : "Les rencontres pour lesquelles on t'a confié la feuille."}
        </p>
      </div>

      {matches.length === 0 ? (
        <Card tone="dashed" shape="panel" className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <span className="grid h-13 w-13 place-items-center rounded-full bg-surface-2 text-muted">
            <TargetIcon size={22} />
          </span>
          <p className="text-[13px] text-muted">
            Rien à arbitrer pour le moment. Un gérant peut te confier une feuille en t&apos;envoyant un lien
            d&apos;invitation.
          </p>
        </Card>
      ) : (
        <div className="stagger flex flex-col gap-2.5">
          {matches.map(({ match, a, b, venue, table }) => (
            <Link
              key={match.id}
              href={`/arbitre/${match.id}`}
              className="glass lift flex items-center gap-3.5 rounded-card p-4 transition hover:bg-surface-2"
            >
              <span className="flex min-w-0 grow flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  {match.status === "live" ? (
                    <LiveDot />
                  ) : (
                    <span className="label-caps text-[10px] text-muted">{match.label}</span>
                  )}
                </span>
                <span className="truncate text-[15px] font-semibold">
                  {a.name} <span className="text-muted">vs</span> {b.name}
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                  <PinIcon size={12} />
                  {venue.name}
                  {table ? ` · table ${table}` : ""} · {jeuCourt(match.target)}
                </span>
              </span>
              <span className="shrink-0 text-[22px] font-bold tabular-nums">
                {match.scoreA} – {match.scoreB}
              </span>
              <ChevronRightIcon size={16} className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
