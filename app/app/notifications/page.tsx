import Link from "next/link";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { ActiverNotifications } from "@/components/mb/Notifications";
import { cleWebPushFirebase, configFirebase } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { BellIcon, CartIcon, CoinIcon, TicketIcon, TrophyIcon } from "@/components/icons";
import { markNotificationsRead } from "@/lib/actions";
import { getNotifications } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/cn";

export const metadata = { title: "Notifications" };

const icons: Record<string, React.ReactNode> = {
  token: <CoinIcon size={18} />,
  order: <CartIcon size={18} />,
  event: <TicketIcon size={18} />,
  reward: <TrophyIcon size={18} />,
  system: <BellIcon size={18} />,
  annonce: <BellIcon size={18} />,
};

function ago(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `il y a ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const list = await getNotifications(user.id);
  const unread = list.filter((n) => !n.read).length;
  // La clé publique VAPID n'est pas un secret : c'est elle que le navigateur
  // envoie au service de push pour reconnaître nos envois.
  const cleVapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  return (
    <>
      <ScreenHeader
        title="Notifications"
        subtitle="Recharges, commandes, billets et récompenses."
        action={
          unread > 0 ? (
            <form action={markNotificationsRead}>
              <button className="text-xs whitespace-nowrap text-gold-text">Tout lire</button>
            </form>
          ) : null
        }
      />

      <ActiverNotifications
        cleVapid={cleVapid}
        firebase={configFirebase()}
        cleWebPushFirebase={cleWebPushFirebase()}
      />

      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
            <BellIcon size={24} />
          </span>
          <span className="text-[15px] font-semibold">Rien de neuf</span>
          <span className="text-[13px] text-muted">Tes recharges, commandes et billets arrivent ici.</span>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      {list.map((notification) => {
        const body = (
          <div
            className={cn(
              "lift flex gap-3 rounded-card px-4 py-3.5",
              notification.read ? "glass" : "glass-gold",
            )}
          >
            <span
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                notification.read ? "bg-surface-2 text-muted" : "bg-gold text-gold-ink",
              )}
            >
              {icons[notification.kind] ?? icons.system}
            </span>
            <div className="flex min-w-0 grow flex-col gap-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[14px] font-semibold">{notification.title}</span>
                {notification.read ? null : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />}
              </span>
              <span className="text-[12px] leading-5 text-dim">{notification.body}</span>
              <span className="text-[11px] text-muted">{ago(notification.createdAt)}</span>
            </div>
          </div>
        );

        return notification.href ? (
          <Link key={notification.id} href={notification.href}>
            {body}
          </Link>
        ) : (
          <div key={notification.id}>{body}</div>
        );
      })}
      </div>
    </>
  );
}
