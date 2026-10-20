import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { BoltIcon, ChevronRightIcon, TrophyIcon } from "@/components/icons";
import { MaPhoto } from "@/components/joueur/MaPhoto";
import { MonSexe } from "@/components/joueur/MonSexe";
import { cn } from "@/lib/cn";

/**
 * Le profil en un seul bloc : la photo, le nom et les badges, le code à
 * dicter, puis ce qu'on règle de soi — sexe, niveau, abonnement. Cinq cartes
 * empilées disaient la même chose en prenant tout l'écran.
 */
export function CarteProfil({
  nom,
  avatar,
  code,
  sexe,
  niveau,
  nomNiveau,
  membre,
  joursRestants,
  pro,
  arbitre,
}: {
  nom: string;
  avatar: string | null;
  code: string;
  sexe: string | null;
  niveau: number;
  nomNiveau: string;
  membre: boolean;
  joursRestants: number;
  pro: boolean;
  arbitre: boolean;
}) {
  const badges = [
    { quoi: `Niv. ${niveau} · ${nomNiveau}`, ton: "neutre" },
    pro ? { quoi: "PRO", ton: "or" } : null,
    arbitre ? { quoi: "Arbitre", ton: "or" } : null,
    membre ? { quoi: "Abonné", ton: "jade" } : null,
  ].filter((b): b is { quoi: string; ton: string } => b !== null);

  return (
    <Card shape="panel" className="flex flex-col divide-y divide-line overflow-hidden p-0">
      <div className="flex items-center gap-3.5 p-4">
        <MaPhoto nom={nom} avatar={avatar} compact />
        <div className="flex min-w-0 grow flex-col gap-1.5">
          <span className="truncate text-[17px] font-semibold">{nom}</span>
          <span className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b.quoi}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em]",
                  b.ton === "or" && "border-gold/50 bg-gold/15 text-gold-text",
                  b.ton === "jade" && "border-jade/45 bg-jade/12 text-jade-text",
                  b.ton === "neutre" && "border-line text-dim",
                )}
              >
                {b.quoi}
              </span>
            ))}
          </span>
        </div>
        {/* Le code se dicte à la table pour se faire ajouter : il reste en vue. */}
        <Link href="/app/amis" className="press flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-[10px] text-muted">Code joueur</span>
          <span className="text-[17px] leading-none font-bold tracking-[0.16em] text-gold-text tabular-nums">{code}</span>
          <span className="text-[10.5px] text-gold-text">Mes amis →</span>
        </Link>
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        <span className="text-[11px] tracking-[0.08em] text-muted uppercase">
          Je suis{sexe ? "" : " · à indiquer pour les tableaux hommes, dames et mixtes"}
        </span>
        <MonSexe sexe={sexe} compact />
      </div>

      <Ligne href="/app/niveaux" icone={<TrophyIcon size={16} />} titre={`Niveau ${niveau} · ${nomNiveau}`} detail="Ce que ton classement ouvre" />
      <Ligne
        href="/app/abonnement"
        icone={<BoltIcon size={16} />}
        titre={membre ? "Abonné Master Break" : "Abonnement Master Break"}
        detail={membre ? `${joursRestants} jour${joursRestants > 1 ? "s" : ""} restant${joursRestants > 1 ? "s" : ""}` : "Tous les directs, sans billet à l'unité"}
        accent={membre}
      />
    </Card>
  );
}

function Ligne({ href, icone, titre, detail, accent }: { href: string; icone: React.ReactNode; titre: string; detail: string; accent?: boolean }) {
  return (
    <Link href={href} className="press flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2/50">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", accent ? "bg-gold text-gold-ink" : "bg-surface-2 text-gold-text")}>
        {icone}
      </span>
      <span className="flex min-w-0 grow flex-col">
        <span className="truncate text-[13.5px] font-semibold">{titre}</span>
        <span className="truncate text-[11.5px] text-muted">{detail}</span>
      </span>
      <ChevronRightIcon size={15} className="shrink-0 text-muted" />
    </Link>
  );
}
