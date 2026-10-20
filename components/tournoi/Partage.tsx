import { QrCode } from "@/components/mb/QrCode";
import { Card } from "@/components/ui/Card";
import { BoutonsPartage } from "@/components/tournoi/BoutonsPartage";
import { qrShape } from "@/lib/qr";

/** L'adresse publique de l'application, sans barre finale. */
function racine(): string {
  return (process.env.MB_PUBLIC_URL?.trim() || "https://masterbreak.vps.buyticle.com").replace(/\/+$/, "");
}

/**
 * Le partage d'un tournoi : deux portes, deux QR.
 *
 * Le joueur et le spectateur n'entrent pas par le même endroit — l'un dépose
 * sa candidature, l'autre prend sa place en salle. Un seul lien les aurait
 * envoyés tous deux sur la page du tableau, et le public cherchait la
 * billetterie. On imprime les QR sur l'affiche, on colle les liens dans le
 * statut WhatsApp.
 */
export function PartageTournoi({
  titre,
  slug,
  eventSlug,
}: {
  titre: string;
  slug: string;
  /** L'événement jumeau, s'il existe : c'est lui qui vend les places. */
  eventSlug?: string | null;
}) {
  const base = racine();
  const portes = [
    {
      quoi: "Joueurs",
      aide: "Candidature et droit d'inscription",
      url: `${base}/rejoindre?vers=/app/tournois/${slug}`,
      message: `${titre} — inscris-toi comme joueur :`,
    },
    ...(eventSlug
      ? [
          {
            quoi: "Spectateurs",
            aide: "Billet en ligne ou à l'entrée",
            url: `${base}/rejoindre?vers=/app/events/${eventSlug}`,
            message: `${titre} — prends ta place en salle :`,
          },
        ]
      : []),
  ];

  return (
    <Card shape="panel" className="flex flex-col gap-3 p-4">
      <h2 className="text-[15px] font-semibold">Partager le tournoi</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {portes.map((p) => (
          <div key={p.quoi} className="flex items-center gap-3.5 rounded-panel border border-line p-3">
            <div className="shrink-0 rounded-card bg-white p-1.5">
              <QrCode shape={qrShape(p.url)} size={96} />
            </div>
            <div className="flex min-w-0 grow flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">{p.quoi}</span>
              <span className="text-[11.5px] text-muted">{p.aide}</span>
              <span className="truncate text-[11px] text-faint">{p.url}</span>
              <BoutonsPartage url={p.url} message={p.message} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
