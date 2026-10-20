import { PageHead, Pill, Table, Td } from "@/components/admin/AdminUI";
import { AccorderProfil, DecisionsProfil } from "@/components/admin/ProfilsAdmin";
import { profilsPourAdmin } from "@/lib/profils-db";
import { enVigueur, PROFILS, type TypeProfil } from "@/lib/profils";
import { displayPhone } from "@/lib/phone";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profils pro & arbitres" };

const ETATS: Record<string, string> = {
  demande: "Demande à examiner",
  valide: "Validé · à payer",
  actif: "Actif",
  refuse: "Refusé",
  retire: "Retiré",
};

/**
 * Les profils spéciaux : les demandes d'arbitre à examiner d'abord, puis tous
 * les profils. L'administration peut aussi accorder un profil sans paiement.
 */
export default async function AdminProfils() {
  await requireRole("admin");
  const lignes = await profilsPourAdmin();
  const demandes = lignes.filter((l) => l.profil.status === "demande");
  const autres = lignes.filter((l) => l.profil.status !== "demande");
  const jour = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Sans limite");

  return (
    <>
      <PageHead
        title="Profils pro & arbitres"
        subtitle={`Joueur pro : ${PROFILS.pro.prix.toLocaleString("fr-FR")} F / mois · Arbitre : ${PROFILS.arbitre.prix.toLocaleString("fr-FR")} F / mois, après validation.`}
      />

      <section className="flex flex-col gap-3 border border-line p-4">
        <h2 className="text-[14px] font-semibold">Accorder ou prolonger un profil, sans paiement</h2>
        <AccorderProfil />
      </section>

      <h2 className="text-[15px] font-semibold">Demandes à examiner · {demandes.length}</h2>
      {demandes.length ? (
        <Table head={["Compte", "Profil", "Motivation", "Reçue le", ""]}>
          {demandes.map(({ profil, user }) => (
            <tr key={profil.id}>
              <Td>
                <span className="flex flex-col">
                  <span className="font-semibold">{user.name}</span>
                  <span className="text-[11px] text-muted">{displayPhone(user.phone)}</span>
                </span>
              </Td>
              <Td>{PROFILS[profil.type as TypeProfil]?.nom ?? profil.type}</Td>
              <Td className="max-w-xs text-[12px] text-dim">{profil.motivation || "—"}</Td>
              <Td className="text-muted">{jour(profil.createdAt)}</Td>
              <Td>
                <DecisionsProfil id={profil.id} status={profil.status} />
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <p className="text-[13px] text-muted">Aucune demande en attente.</p>
      )}

      <h2 className="text-[15px] font-semibold">Tous les profils</h2>
      <Table head={["Compte", "Profil", "État", "Jusqu'au", "Origine", ""]}>
        {autres.map(({ profil, user }) => (
          <tr key={profil.id}>
            <Td>
              <span className="flex flex-col">
                <span className="font-semibold">{user.name}</span>
                <span className="text-[11px] text-muted">{displayPhone(user.phone)}</span>
              </span>
            </Td>
            <Td>{PROFILS[profil.type as TypeProfil]?.nom ?? profil.type}</Td>
            <Td>
              <Pill tone={enVigueur(profil) ? "gold" : "neutral"}>
                {profil.status === "actif" && !enVigueur(profil) ? "Échu" : (ETATS[profil.status] ?? profil.status)}
              </Pill>
            </Td>
            <Td className="text-muted">{profil.status === "actif" ? jour(profil.actifJusqu) : "—"}</Td>
            <Td className="text-muted">{profil.source === "admin" ? "Accordé" : "Abonnement"}</Td>
            <Td>
              <DecisionsProfil id={profil.id} status={profil.status} />
            </Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
