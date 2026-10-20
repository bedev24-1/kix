import { QrCode } from "@/components/mb/QrCode";
import { Card } from "@/components/ui/Card";
import { BoutonsPartage } from "@/components/tournoi/BoutonsPartage";
import { qrShape } from "@/lib/qr";
import { urlPublique } from "@/lib/url-publique";


/**
 * Le partage d'un tournoi : deux portes, deux QR.
 *
 * Le joueur et le spectateur n'entrent pas par le même endroit — l'un dépose
 * sa candidature, l'autre prend sa place en salle. Un seul lien les aurait
 * envoyés tous deux sur la page du tableau, et le public cherchait la
 * billetterie. On imprime les QR sur l'affiche, on colle les liens dans le
 * statut WhatsApp.
 */
export async function PartageTournoi({
  titre,
  slug,
  eventSlug,
  imprimable = false,
}: {
  titre: string;
  slug: string;
  /** L'événement jumeau, s'il existe : c'est lui qui vend les places. */
  eventSlug?: string | null;
  /** Organisateur : le QR se télécharge en image, pour l'affiche. */
  imprimable?: boolean;
}) {
  const base = await urlPublique();
  const portes = [
    {
      quoi: "Joueurs",
      aide: "Candidature et droit d'inscription",
      url: `${base}/t/${slug}`,
      message: `${titre} — inscris-toi comme joueur :`,
    },
    ...(eventSlug
      ? [
          {
            quoi: "Spectateurs",
            aide: "Billet en ligne ou à l'entrée",
            url: `${base}/e/${eventSlug}`,
            message: `${titre} — prends ta place en salle :`,
          },
        ]
      : []),
  ];

  return (
    <Card shape="panel" className="flex min-w-0 flex-col gap-3 p-4">
      <h2 className="text-[15px] font-semibold">Partager le tournoi</h2>
      {/* `minmax(0,1fr)` : sans lui, une colonne de grille prend la largeur de
          son contenu, et le lien entier poussait la carte hors de l'écran. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {portes.map((p) => (
          <div
            key={p.quoi}
            className="flex min-w-0 flex-col items-start gap-3 rounded-panel border border-line p-3 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3.5"
          >
            <div className="shrink-0 rounded-card bg-white p-1.5">
              <QrCode shape={qrShape(p.url)} size={96} />
            </div>
            <div className="flex w-full min-w-0 grow flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">{p.quoi}</span>
              <span className="text-[11.5px] text-muted">{p.aide}</span>
              <span className="truncate text-[11px] text-faint">{p.url}</span>
              <BoutonsPartage url={p.url} message={p.message} imprimable={imprimable} nomFichier={`qr-${p.quoi.toLowerCase()}-${slug}`} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Le partage d'une soirée seule : un QR, celui de la billetterie. */
export async function PartageEvenement({
  titre,
  slug,
  imprimable = false,
}: {
  titre: string;
  slug: string;
  imprimable?: boolean;
}) {
  const url = `${await urlPublique()}/e/${slug}`;
  return (
    <Card
      shape="panel"
      className="flex min-w-0 flex-col items-start gap-3 p-3.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:gap-3.5"
    >
      <div className="shrink-0 rounded-card bg-white p-1.5">
        <QrCode shape={qrShape(url)} size={96} />
      </div>
      <div className="flex w-full min-w-0 grow flex-col gap-1.5">
        <span className="text-[13.5px] font-semibold">Partager la soirée</span>
        <span className="text-[11.5px] text-muted">Billet en ligne ou à l&apos;entrée</span>
        <span className="truncate text-[11px] text-faint">{url}</span>
        <BoutonsPartage url={url} message={`${titre} — prends ta place :`} imprimable={imprimable} nomFichier={`qr-${slug}`} />
      </div>
    </Card>
  );
}
