import Link from "next/link";
import { BellIcon, ChevronLeftIcon } from "@/components/icons";
import type { User } from "@/db";

export function AppHeader({
  user,
  unread = 0,
  city = "Douala",
  area = "Akwa",
  title,
  subtitle,
}: {
  user: User;
  unread?: number;
  city?: string;
  area?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <>
      {/* Format bureau seulement : la barre latérale porte déjà l'identité et le
          solde. Sur téléphone, l'accueil a sa propre ligne du haut
          (components/mb/accueil/EnTete). */}
      <header className="hidden items-end justify-between gap-4 border-b border-line pb-5 lg:flex">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px]">{title ?? `Bonsoir ${user.name.split(" ")[0]}`}</h1>
          <p className="text-[13px] text-muted">{subtitle ?? `${city} · ${area} · les tables ouvrent à 17 h`}</p>
        </div>
        <Link
          href="/app/notifications"
          className="glass flex h-11 items-center gap-2.5 rounded-full px-4 text-[13px] text-dim transition hover:text-ink"
        >
          <BellIcon size={17} />
          {unread > 0 ? `${unread} notifications` : "Notifications"}
        </Link>
      </header>
    </>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  back = "/app",
  action,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 lg:items-end lg:border-b lg:border-line lg:pb-5">
      <Link
        href={back}
        aria-label="Retour"
        className="glass grid h-11 w-11 shrink-0 place-items-center rounded-full lg:hidden"
      >
        <ChevronLeftIcon size={18} />
      </Link>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="truncate text-[17px] lg:text-[28px]">{title}</h1>
        {subtitle ? <p className="hidden text-[13px] text-muted lg:block">{subtitle}</p> : null}
      </div>
      <div className="flex h-11 min-w-11 shrink-0 items-center justify-end">{action}</div>
    </header>
  );
}
