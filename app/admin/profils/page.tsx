import { PageHead, Pill, Table, Td } from "@/components/admin/AdminUI";
import { AccorderProfil, BasculeCertification, CertifierCompte, DecisionsProfil } from "@/components/admin/ProfilsAdmin";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { MOTIFS } from "@/lib/certification";
import { db, users, venues } from "@/db";
import { isNotNull } from "drizzle-orm";
import { profilsPourAdmin } from "@/lib/profils-db";
import { enVigueur, PROFILS, type TypeProfil } from "@/lib/profils";
import { displayPhone } from "@/lib/phone";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profils & certification" };

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
  const [lignes, certifies, salles] = await Promise.all([
    profilsPourAdmin(),
    db.select().from(users).where(isNotNull(users.certifie)).orderBy(users.name),
    db.select().from(venues).orderBy(venues.name),
  ]);
  const demandes = lignes.filter((l) => l.profil.status === "demande");
  const autres = lignes.filter((l) => l.profil.status !== "demande" && l.profil.type !== "certification");
  const nomDe = (p: { type: string; motif: string | null }) =>
    p.type === "certification" ? `Certification · ${MOTIFS[p.motif as keyof typeof MOTIFS] ?? "?"}` : (PROFILS[p.type as TypeProfil]?.nom ?? p.type);
  const jour = (d: Date | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Sans limite");

  return (
    <>
      <PageHead
        title="Profils & certification"
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
              <Td>{nomDe(profil)}</Td>
              <Td className="max-w-xs text-[12px] text-dim">{profil.motivation || "—"}</Td>
              <Td className="text-muted">{jour(profil.createdAt)}</Td>
              <Td>
                <DecisionsProfil id={profil.id} status={profil.status} certification={profil.type === "certification"} />
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <p className="text-[13px] text-muted">Aucune demande en attente.</p>
      )}

      <section className="flex flex-col gap-3 border border-[#0866FF]/40 p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <BadgeCertifie motif="arbitre_officiel" taille={18} /> Certification
        </h2>
        <p className="text-[12px] text-muted">
          Le badge bleu, accordé par l&apos;administration seule : arbitres officiels, gérants de salles partenaires,
          coachs reconnus, joueurs pro vérifiés, diffuseurs officiels. Il ne s&apos;achète pas.
        </p>
        <CertifierCompte motifs={Object.entries(MOTIFS)} />
        {certifies.length ? (
          <Table head={["Compte", "Motif", "Depuis", ""]}>
            {certifies.map((u) => (
              <tr key={u.id}>
                <Td>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {u.name} <BadgeCertifie motif={u.certifie} />
                  </span>
                  <span className="text-[11px] text-muted">{displayPhone(u.phone)}</span>
                </Td>
                <Td>{MOTIFS[u.certifie as keyof typeof MOTIFS] ?? u.certifie}</Td>
                <Td className="text-muted">{jour(u.certifieLe)}</Td>
                <Td>
                  <BasculeCertification cible="compte" id={u.id} actif />
                </Td>
              </tr>
            ))}
          </Table>
        ) : null}
        <h3 className="pt-2 text-[13px] font-semibold">Salles partenaires</h3>
        <Table head={["Salle", "Ville", ""]}>
          {salles.map((v) => (
            <tr key={v.id}>
              <Td>
                <span className="flex items-center gap-1.5 font-semibold">
                  {v.name} {v.certifiee ? <BadgeCertifie motif="gerant" /> : null}
                </span>
              </Td>
              <Td className="text-muted">{v.city}</Td>
              <Td>
                <BasculeCertification cible="salle" id={v.id} actif={v.certifiee} />
              </Td>
            </tr>
          ))}
        </Table>
      </section>

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
