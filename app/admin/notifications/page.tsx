import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PageHead, Table, Td } from "@/components/admin/AdminUI";
import { NouvelleNotification, RetirerNotification } from "@/components/admin/NotificationsAdmin";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

/** Écrire une notification, l'envoyer, et voir combien l'ont lue. */
export default async function AdminNotifications() {
  await requireRole("admin");

  const [comptes, envois] = await Promise.all([
    db.execute<{ role: string; n: number }>(sql`select role, count(*)::int as n from mb.users group by role`),
    // Un envoi = les annonces de même titre écrites dans la même minute.
    db.execute<{ title: string; body: string; href: string | null; le: Date; n: number; lues: number }>(sql`
      select title, body, href, min(created_at) as le, count(*)::int as n, count(*) filter (where read)::int as lues
        from mb.notifications
       where kind = 'annonce'
       group by title, body, href, date_trunc('minute', created_at)
       order by le desc
       limit 50`),
  ]);

  const effectifs: Record<string, number> = { tous: 0 };
  for (const c of comptes) {
    effectifs[c.role] = c.n;
    effectifs.tous += c.n;
  }
  const quand = (d: Date) =>
    new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" });

  return (
    <>
      <PageHead title="Notifications" subtitle="Écris une notification et envoie-la à tout le monde, à un public ou à un seul numéro." />
      <section className="flex flex-col gap-3 border border-line p-4">
        <h2 className="text-[14px] font-semibold">Nouvelle notification</h2>
        <NouvelleNotification effectifs={effectifs} />
      </section>

      <Table head={["Notification", "Envoyée", "Destinataires", "Lue", ""]}>
        {envois.map((e) => (
          <tr key={`${e.title}-${new Date(e.le).toISOString()}`}>
            <Td>
              <span className="flex flex-col">
                <span className="font-semibold">{e.title}</span>
                {e.body ? <span className="max-w-sm truncate text-[11px] text-muted">{e.body}</span> : null}
                {e.href ? <span className="max-w-sm truncate text-[11px] text-gold-text">{e.href}</span> : null}
              </span>
            </Td>
            <Td className="text-[12px] text-muted">{quand(e.le)}</Td>
            <Td>{e.n}</Td>
            <Td>
              {e.lues}
              <span className="text-[11px] text-muted"> ({e.n ? Math.round((e.lues / e.n) * 100) : 0} %)</span>
            </Td>
            <Td>
              <RetirerNotification titre={e.title} envoyeeLe={new Date(e.le).toISOString()} />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
