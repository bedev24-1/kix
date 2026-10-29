import Link from "next/link";
import { BoltIcon, ChartIcon, MapIcon, TargetIcon, TicketIcon, TrophyIcon, UserIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const ACCES = [
  { href: "/app/salles", label: "Salles", Icon: MapIcon },
  { href: "/app/events", label: "Soirées", Icon: TicketIcon },
  { href: "/app/live", label: "Scores", Icon: TargetIcon },
  { href: "/app/tournois", label: "Tournois", Icon: TrophyIcon },
  { href: "/app/classement", label: "Classement", Icon: ChartIcon },
  { href: "/app/cours", label: "Cours", Icon: TargetIcon },
  { href: "/app/abonnement", label: "Abonnement", Icon: BoltIcon },
  { href: "/app/amis", label: "Mes amis", Icon: UserIcon },
];

/**
 * Ce que la barre du bas ne peut pas porter : huit accès en un seul bloc,
 * les cases jointives séparées d'un simple trait, sans marge.
 */
export function Acces() {
  return (
    <nav aria-label="Accès rapides" className="grid grid-cols-4 overflow-hidden rounded-[20px] border border-line bg-surface">
      {ACCES.map(({ href, label, Icon }, i) => (
        <Link
          key={href + label}
          href={href}
          className={cn(
            "press flex h-[54px] flex-col items-center justify-center gap-[5px] border-line text-[10.5px] text-dim transition-colors hover:bg-ink/4 lg:h-20 lg:text-[12px]",
            i % 4 !== 3 && "border-r",
            i < 4 && "border-b",
          )}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
