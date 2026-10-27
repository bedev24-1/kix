import { notFound, redirect } from "next/navigation";
import { DossierCandidat } from "@/components/tournoi/Dossier";
import { getTournamentById } from "@/lib/tournaments";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dossier du candidat" };

export default async function GerantDossier({ params }: { params: Promise<{ id: string; playerId: string }> }) {
  const { id, playerId } = await params;
  const manager = await requireRole("manager", "admin");
  const tournoi = await getTournamentById(id);
  if (!tournoi) notFound();
  if (manager.role === "manager" && tournoi.venueId !== manager.venueId) redirect("/gerant?refus=1");
  return <DossierCandidat tournoi={tournoi} playerId={playerId} base={`/gerant/tournois/${id}`} />;
}
