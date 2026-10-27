import { notFound } from "next/navigation";
import { DossierCandidat } from "@/components/tournoi/Dossier";
import { getTournamentById } from "@/lib/tournaments";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dossier du candidat" };

export default async function AdminDossier({ params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id, playerId } = await params;
  await requireRole("admin");
  const tournoi = await getTournamentById(id);
  if (!tournoi) notFound();
  return <DossierCandidat tournoi={tournoi} playerId={playerId} base={`/admin/tournois/${id}`} />;
}
