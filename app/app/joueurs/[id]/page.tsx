import Link from "next/link";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { notFound } from "next/navigation";
import { Photo } from "@/components/ui/Photo";
import { BoutonAmi } from "@/components/joueur/BoutonAmi";
import { Defier } from "@/components/joueur/Defier";
import { InviterDansGroupe } from "@/components/joueur/InviterDansGroupe";
import { Suivre } from "@/components/live/Suivre";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon, PinIcon, TargetIcon, TicketIcon, TrophyIcon } from "@/components/icons";
import {
  badgesDe,
  derniersMatchs,
  getJoueur,
  lienAvec,
  soireesDuJoueur,
  tournoisDuJoueur,
} from "@/lib/joueurs";
import { CANDIDATURES } from "@/lib/tournois";
import { levelFor } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = await getJoueur(id);
  return { title: j ? j.user.name : "Joueur" };
}

const jour = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function ProfilJoueur({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [moi, palmares] = await Promise.all([requireUser(), getJoueur(id)]);
  if (!palmares) notFound();

  const { mesGroupes } = await import("@/lib/bande");
  const { defiEnCours } = await import("@/lib/defis");
  const { getBalance, getVenues } = await import("@/lib/queries");
  const { estDiffuseur, jeSuis, nombreDAbonnes } = await import("@/lib/suivis");
  const [matchs, tournois, soirees, lien, bandes, defi, jetons, salles, diffuseur, suivi, abonnes] =
    await Promise.all([
      derniersMatchs(id),
      tournoisDuJoueur(id),
      soireesDuJoueur(id),
      lienAvec(moi.id, id),
      mesGroupes(moi.id),
      defiEnCours(moi.id, id),
      getBalance(moi.id),
      getVenues(),
      estDiffuseur(id),
      jeSuis(moi.id, id),
      nombreDAbonnes(id),
    ]);

  const badges = badgesDe(palmares);
  const obtenus = badges.filter((b) => b.obtenu);
  const { current } = levelFor(palmares.user.points);
  const ratio = palmares.matchs > 0 ? Math.round((palmares.victoires / palmares.matchs) * 100) : 0;
  const cestMoi = moi.id === id;

  return (
    <>
      <div className="flex items-center gap-3 lg:hidden">
        <Link
          href="/app/classement"
          aria-label="Retour"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted"
        >
          <ChevronLeftIcon size={17} />
        </Link>
        <span className="text-[13px] text-muted">Profil de joueur</span>
      </div>

      <Card tone="gold" shape="panel" className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-4">
          {palmares.user.avatar ? (
            <Photo
              src={palmares.user.avatar}
              alt={palmares.user.name}
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full border-2 border-gold object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-2 text-[18px] font-bold">
              {palmares.user.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="flex min-w-0 grow flex-col gap-1">
            <h1 className="flex min-w-0 items-center gap-1.5 text-[22px] leading-tight">
              <span className="truncate">{palmares.user.name}</span>
              <BadgeCertifie motif={palmares.user.certifie} taille={20} />
            </h1>
            <p className="text-[12px] text-muted">
              {current.name} · {palmares.user.points} points · joueur depuis {jour(palmares.user.createdAt)}
            </p>
            {/* Le code se donne de vive voix : on le montre là où on le
                cherche, et en gros sur son propre profil. */}
            <p className="flex items-center gap-1.5 text-[12px]">
              <span className="text-muted">Code joueur</span>
              <span className="font-semibold tracking-[0.18em] tabular-nums text-gold-text">
                {palmares.user.code}
              </span>
            </p>
          </div>
        </div>

        {!cestMoi ? (
          <div className="flex flex-col gap-2">
            {/* Le défi d'abord : c'est ce qu'on vient chercher sur la fiche
                d'un joueur qu'on a repéré au classement. */}
            <Defier
              joueurId={id}
              nom={palmares.user.name}
              salles={salles.map((v) => ({ id: v.id, name: v.name }))}
              jetons={jetons}
              defiEnCours={Boolean(defi)}
            />
            <BoutonAmi autreId={id} nom={palmares.user.name} etat={lien.etat} lienId={lien.id} />
            {/* Suivre ne s'affiche que sur la fiche de quelqu'un qui filme :
                ailleurs, le bouton n'aurait rien à annoncer. */}
            {diffuseur ? (
              <Suivre hostId={id} nom={palmares.user.name} suivi={suivi} abonnes={abonnes} />
            ) : null}
            {/* On recrute au classement : l'amitié n'est pas un préalable pour
                proposer à quelqu'un de rejoindre sa bande. */}
            <InviterDansGroupe
              joueurId={id}
              nom={palmares.user.name}
              groupes={bandes
                .filter((b) => b.role === "chef" || b.role === "membre")
                .map((b) => ({ id: b.crew.id, name: b.crew.name }))}
            />
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Fait valeur={`#${palmares.rang}`} quoi="au classement" />
        <Fait valeur={String(palmares.victoires)} quoi={palmares.victoires > 1 ? "victoires" : "victoire"} />
        <Fait valeur={`${ratio} %`} quoi="de matchs gagnés" />
        <Fait valeur={String(palmares.titres)} quoi={palmares.titres > 1 ? "titres" : "titre"} />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Fait valeur={String(palmares.matchs)} quoi="matchs joués" />
        <Fait valeur={String(palmares.manches)} quoi="parties gagnées" />
        <Fait valeur={String(palmares.tableaux)} quoi="tournois disputés" />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Badges</h2>
          <span className="text-[12px] text-muted">
            {obtenus.length} sur {badges.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Chip
              key={b.cle}
              tone={b.obtenu ? "solid" : "neutral"}
              className={cn("text-[11px]", !b.obtenu && "opacity-45")}
              title={b.detail}
            >
              {b.nom}
            </Chip>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-semibold">Derniers matchs</h2>
        {matchs.length === 0 ? (
          <Card tone="dashed" shape="panel" className="px-5 py-8 text-center text-[13px] text-muted">
            Aucun match joué pour l&apos;instant.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {matchs.map((m) => (
              <Card key={m.id} shape="panel" className="flex items-center gap-3 px-3.5 py-3">
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    m.gagne ? "bg-gold text-gold-ink" : "bg-surface-2 text-muted",
                  )}
                >
                  {m.gagne ? "V" : "D"}
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <Link href={`/app/joueurs/${m.adversaire.id}`} className="truncate text-[13.5px] font-semibold">
                    contre {m.adversaire.name}
                  </Link>
                  <span className="truncate text-[11.5px] text-muted">
                    {m.kind}
                    {m.venue ? ` · ${m.venue}` : ""} · {jour(m.quand)}
                  </span>
                </span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                  {m.pour} — {m.contre}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      {tournois.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Tournois</h2>
          <div className="flex flex-col gap-2">
            {tournois.map(({ player, tournament, venue }) => (
              <Link key={player.id} href={`/app/tournois/${tournament.slug}`} className="press block">
                <Card shape="panel" className="flex items-center gap-3 px-3.5 py-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-gold-text">
                    <TrophyIcon size={15} />
                  </span>
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-[13.5px] font-semibold">{tournament.title}</span>
                    <span className="truncate text-[11.5px] text-muted">
                      {CANDIDATURES[player.status] ?? player.status}
                      {player.seed ? ` · tête de série n°${player.seed}` : ""}
                      {venue ? ` · ${venue.name}` : ""}
                    </span>
                  </span>
                  {tournament.winnerId === id ? (
                    <Chip tone="solid" className="shrink-0 text-[10.5px]">
                      Vainqueur
                    </Chip>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {soirees.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold">Soirées</h2>
          <div className="flex flex-col gap-2">
            {soirees.map(({ event, ticket }) => (
              <Card key={ticket.id} shape="panel" className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                  <TicketIcon size={15} />
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[13.5px] font-semibold">{event.title}</span>
                  <span className="flex items-center gap-1.5 truncate text-[11.5px] text-muted">
                    <PinIcon size={11} />
                    {event.day}
                  </span>
                </span>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {cestMoi ? (
        <Link href="/app/rewards" className="press flex items-center justify-center gap-2 text-[12.5px] text-gold-text">
          <TargetIcon size={14} /> C&apos;est ton profil · voir ton espace
        </Link>
      ) : null}
    </>
  );
}

function Fait({ valeur, quoi }: { valeur: string; quoi: string }) {
  return (
    <Card shape="panel" className="flex flex-col gap-0.5 px-3 py-3">
      <span className="text-[18px] leading-tight font-bold tracking-[-0.02em] tabular-nums">{valeur}</span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
