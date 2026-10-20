import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ArrowRightIcon, TrophyIcon } from "@/components/icons";
import { getClassement, getPalmares } from "@/lib/tournaments";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classement des joueurs" };

/**
 * Le classement.
 *
 * Les points viennent des parties arbitrées et des tournois ; les titres, eux,
 * ne viennent que des tournois. Les deux colonnes se lisent ensemble : à
 * points égaux, celui qui a soulevé un trophée n'est pas le même joueur.
 */
export default async function ClassementPage() {
  const user = await requireUser();
  const [rangs, palmares] = await Promise.all([getClassement(100), getPalmares(6)]);

  const moi = rangs.findIndex((r) => r.id === user.id);
  const podium = rangs.slice(0, 3);

  return (
    <>
      <ScreenHeader
        title="Classement des joueurs"
        subtitle="Les points de tournoi et de table, tous confondus."
        action={
          <Link href="/app/amis" className="press text-[12px] text-gold-text">
            Mes amis
          </Link>
        }
      />

      {podium.length === 3 ? (
        <div className="flex items-end gap-2.5">
          {[podium[1], podium[0], podium[2]].map((joueur, i) => {
            const premier = i === 1;
            const rang = i === 1 ? 1 : i === 0 ? 2 : 3;
            return (
              <Link
                key={joueur.id}
                href={`/app/joueurs/${joueur.id}`}
                className={cn(
                  "press flex grow flex-col items-center gap-2 rounded-card px-2 pb-3",
                  premier ? "glass-gold border-[1.5px] border-gold/50 pt-5" : "glass pt-4",
                )}
              >
                {joueur.avatar ? (
                  <Photo
                    src={joueur.avatar}
                    alt={joueur.name}
                    width={premier ? 52 : 44}
                    height={premier ? 52 : 44}
                    className={cn("rounded-full object-cover", premier ? "h-13 w-13 border-2 border-gold" : "h-11 w-11")}
                  />
                ) : (
                  <span
                    className={cn(
                      "grid place-items-center rounded-full bg-surface-2 text-[13px] font-semibold",
                      premier ? "h-13 w-13" : "h-11 w-11",
                    )}
                  >
                    {joueur.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="flex max-w-full items-center gap-1 text-[12.5px] font-semibold">
                  <span className="truncate">{joueur.name}</span>
                  <BadgeCertifie motif={joueur.certifie} taille={12} />
                </span>
                <span className="text-[11px] text-muted tabular-nums">{joueur.points} pts</span>
                <span className={cn("text-[11px]", premier ? "text-gold-text" : "text-faint")}>#{rang}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {moi >= 0 ? (
        <Card tone="gold" shape="panel" className="flex items-center gap-3.5 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-bold text-gold-ink tabular-nums">
            {moi + 1}
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-[14px] font-semibold">Ta place</span>
            <span className="text-[12px] text-muted tabular-nums">
              {rangs[moi].points} points · {Number(rangs[moi].titres)} titre
              {Number(rangs[moi].titres) > 1 ? "s" : ""} · {Number(rangs[moi].tableaux)} tableau
              {Number(rangs[moi].tableaux) > 1 ? "x" : ""}
            </span>
          </span>
        </Card>
      ) : null}

      {palmares.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Palmarès</h2>
          <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:gap-3">
            {palmares.map(({ tournament, venue, champion }) => (
              <Link key={tournament.id} href={`/app/tournois/${tournament.slug}`} className="press block">
                <Card shape="panel" className="flex items-center gap-3 p-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-text">
                    <TrophyIcon size={18} />
                  </span>
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-[13.5px] font-semibold">{tournament.title}</span>
                    <span className="truncate text-[11.5px] text-muted">
                      {champion?.name ?? "Vainqueur à confirmer"}
                      {venue ? ` · ${venue.name}` : ""}
                    </span>
                  </span>
                  <ArrowRightIcon size={15} className="shrink-0 text-muted" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Tous les joueurs</h2>
        <div className="flex flex-col gap-1.5">
          {rangs.map((joueur, i) => (
            <Link key={joueur.id} href={`/app/joueurs/${joueur.id}`} className="press block">
            <Card
              shape="panel"
              tone={joueur.id === user.id ? "gold" : "glass"}
              className="flex items-center gap-3 px-3.5 py-2.5"
            >
              <span className="w-7 shrink-0 text-[12.5px] text-faint tabular-nums">{i + 1}</span>
              {joueur.avatar ? (
                <Photo
                  src={joueur.avatar}
                  alt={joueur.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold">
                  {joueur.name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="flex min-w-0 grow items-center gap-1 text-[13.5px]">
                <span className="truncate">{joueur.name}</span>
                <BadgeCertifie motif={joueur.certifie} />
              </span>
              {Number(joueur.titres) > 0 ? (
                <Chip tone="neutral" className="shrink-0 text-[10.5px]">
                  {Number(joueur.titres)} titre{Number(joueur.titres) > 1 ? "s" : ""}
                </Chip>
              ) : null}
              <span className="shrink-0 text-[13px] font-semibold text-gold-text tabular-nums">
                {joueur.points}
              </span>
            </Card>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
