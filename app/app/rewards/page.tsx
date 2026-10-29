import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { BadgeCertifie } from "@/components/ui/BadgeCertifie";
import { ScreenHeader } from "@/components/mb/AppHeader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ConvertButton } from "@/components/mb/ConvertButton";
import { CarteProfil } from "@/components/joueur/CarteProfil";
import { ProfilsSpeciaux } from "@/components/joueur/ProfilsSpeciaux";
import { DemandeCertification } from "@/components/joueur/DemandeCertification";
import { mesProfils } from "@/lib/profils-db";
import { enVigueur } from "@/lib/profils";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import {
  BoltIcon,
  CartIcon,
  ChartIcon,
  ClockIcon,
  TableIcon,
  TargetIcon,
  TicketIcon,
  TrophyIcon,
} from "@/components/icons";
import { getLeaderboard, getRank } from "@/lib/queries";
import { estMembre, joursRestants } from "@/lib/membres";
import { niveauDe, peutDiffuser, peutEnseigner } from "@/lib/niveaux";
import { requireUser } from "@/lib/session";
import { signOut } from "@/lib/actions";
import { levelFor, POINTS_PER_FREE_TOKEN } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { group } from "@/lib/format";

export const metadata = { title: "Master Rank" };

export default async function RewardsPage() {
  const user = await requireUser();
  const profils = await mesProfils(user.id);
  const { nombreDeSuivis } = await import("@/lib/suivis");
  const [leaderboard, rank, suivis] = await Promise.all([
    getLeaderboard(6),
    getRank(user.id),
    nombreDeSuivis(user.id),
  ]);
  const { current, target } = levelFor(user.points);
  const progress = Math.min(100, Math.round((user.points / target) * 100));
  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3).filter((p) => p.id !== user.id);
  const membre = estMembre(user);
  const restants = joursRestants(user);

  return (
    <>
      {/* Le commutateur clair/sombre vivait dans la ligne du haut de l'accueil ;
          elle porte désormais les jetons. Il rejoint le profil. */}
      <ScreenHeader
        title="Master Rank"
        subtitle="Chaque partie scannée compte des points, chaque tournoi te classe."
        action={<ThemeToggle className="lg:hidden" />}
      />

      <CarteProfil
        nom={user.name}
        certifie={user.certifie}
        avatar={user.avatar}
        code={user.code}
        sexe={user.sexe}
        niveau={niveauDe(user.points)}
        nomNiveau={current.name}
        membre={membre}
        joursRestants={restants}
        pro={enVigueur(profils.pro)}
        arbitre={enVigueur(profils.arbitre)}
      />
      <DemandeCertification certifie={user.certifie} demande={profils.certification?.status ?? null} />
      <ProfilsSpeciaux
        phone={user.phone}
        etats={{
          pro: profils.pro ? { status: profils.pro.status, actifJusqu: profils.pro.actifJusqu?.toISOString() ?? null, enVigueur: enVigueur(profils.pro) } : null,
          arbitre: profils.arbitre
            ? { status: profils.arbitre.status, actifJusqu: profils.arbitre.actifJusqu?.toISOString() ?? null, enVigueur: enVigueur(profils.arbitre) }
            : null,
        }}
      />

      <div className="grid gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex flex-col gap-3.5 lg:gap-5">
      <Card tone="jade" shape="panel" className="flex flex-col gap-3.5 p-5">
        <div className="flex items-center gap-3.5">
          <span className="grid h-13 w-13 place-items-center rounded-full border border-jade/45 bg-bg-2 text-jade-text">
            <TrophyIcon size={26} />
          </span>
          <div className="flex grow flex-col gap-0.5">
            <span className="text-[11px] tracking-[0.1em] text-jade-text uppercase">Niveau {current.level}</span>
            <span className="text-[22px] font-bold tracking-[-0.03em]">{current.name}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xl font-bold">{group(user.points)}</span>
            <span className="text-[11px] text-muted">points</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded-full bg-bg-2">
            <div
              style={{ width: `${progress}%` }}
              className="h-full rounded-full bg-linear-to-r from-jade to-gold transition-[width] duration-500"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-dim">
            <span>{group(Math.max(0, target - user.points))} XP avant le niveau suivant</span>
            <span className="text-muted">#{rank} à Douala</span>
          </div>
        </div>
      </Card>

      <Card tone="gold" className="flex items-center gap-3.5 px-4 py-3.5">
        <div className="flex grow flex-col gap-0.5">
          <span className="text-sm font-semibold">Convertir mes points</span>
          <span className="text-xs text-muted">
            {POINTS_PER_FREE_TOKEN} pts = 1 jeton · {Math.floor(user.points / POINTS_PER_FREE_TOKEN)} dispo
          </span>
        </div>
        <ConvertButton points={user.points} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Chip tone="neutral" className="text-[11px]">
          <BoltIcon size={13} className="text-gold-text" />
          Série de 5 soirs
        </Chip>
        <Chip tone="neutral" className="text-[11px]">
          <ClockIcon size={13} className="text-jade-text" />
          Noctambule
        </Chip>
        <Chip tone="neutral" className="text-[11px]">
          + 6 badges
        </Chip>
      </div>
      </div>

      <div className="flex flex-col gap-3.5 lg:gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base">Classement · Douala</h2>
          <Chip tone="neutral" className="px-2.5 py-1.5 text-[11px]">
            Ce mois
          </Chip>
        </div>

        <div className="flex items-end gap-2.5">
          {[podium[1], podium[0], podium[2]].filter(Boolean).map((player, i) => {
            const first = i === 1;
            return (
              <div
                key={player.id}
                className={cn(
                  "flex grow flex-col items-center gap-2 rounded-card px-2 pb-3",
                  first ? "glass-gold border-[1.5px] border-gold/50 pt-5" : "glass pt-4",
                )}
              >
                {player.avatar ? (
                  <Photo
                    src={player.avatar}
                    alt={player.name}
                    width={first ? 52 : 44}
                    height={first ? 52 : 44}
                    className={cn("rounded-full object-cover", first ? "h-13 w-13 border-2 border-gold" : "h-11 w-11")}
                  />
                ) : (
                  <span
                    className={cn(
                      "grid place-items-center rounded-full bg-surface-2 text-[13px] font-semibold",
                      first ? "h-13 w-13" : "h-11 w-11",
                    )}
                  >
                    {player.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className={cn("font-semibold", first ? "text-[13px]" : "text-xs")}>
                  {player.name.split(" ")[0]}
                </span>
                <span className={cn("font-bold", first ? "text-lg text-gold-text" : "text-[15px] text-dim")}>
                  {i === 1 ? 1 : i === 0 ? 2 : 3}
                </span>
                <span className="text-[10px] text-muted">{group(player.points)} pts</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {rest.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3 rounded-none bg-surface px-3.5 py-2.5">
              <span className="w-6 text-sm font-bold text-muted">{String(i + 4).padStart(2, "0")}</span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[11px] font-semibold text-dim">
                {player.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex grow items-center gap-1 text-[13px]">
                {player.name} <BadgeCertifie motif={player.certifie} />
              </span>
              <span className="text-xs text-muted">{group(player.points)} pts</span>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-none border-[1.5px] border-gold/45 bg-gold/12 px-3.5 py-2.5">
            <span className="w-6 text-sm font-bold text-gold-text">{rank}</span>
            {user.avatar ? (
              <Photo
                src={user.avatar}
                alt={user.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : null}
            <span className="grow text-[13px] font-semibold">Toi · {user.name}</span>
            <span className="text-xs text-gold-text">{group(user.points)} pts</span>
          </div>
        </div>
      </div>

      </div>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        <h2 className="text-base">Raccourcis</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Shortcut href="/app/defis" icon={<TargetIcon size={18} />} label="Mes défis" />
          {/* « Mes diffuseurs » n'apparaît qu'une fois qu'on suit quelqu'un :
              un raccourci vers une page vide n'est qu'un chemin de plus. */}
          {suivis > 0 ? (
            <Shortcut href="/app/diffuseurs" icon={<BoltIcon size={18} />} label="Mes diffuseurs" />
          ) : null}
          <Shortcut href="/app/reservations" icon={<TableIcon size={18} />} label="Mes réservations" />
          <Shortcut href="/app/commandes" icon={<CartIcon size={18} />} label="Mes commandes" />
          <Shortcut href="/app/billets" icon={<TicketIcon size={18} />} label="Mes billets" />
          <Shortcut href="/app/notifications" icon={<ClockIcon size={18} />} label="Notifications" />

          {/* Les espaces de gestion ne se montrent qu'à qui peut y entrer.
              « Espace gérant » s'affichait à tout le monde : un client qui
              cliquait était renvoyé sur un refus, pour avoir suivi un lien
              qu'on lui avait mis sous les yeux. */}
          {/* Enseigner s'ouvre au niveau, pas au rôle : le raccourci apparaît
              quand le joueur y a droit, ou qu'il donne déjà des cours. */}
          {peutDiffuser(user.points) || user.role !== "client" ? (
            <Shortcut href="/app/diffuser" icon={<BoltIcon size={18} />} label="Mes directs" />
          ) : null}
          {peutEnseigner(user.points) || user.role !== "client" ? (
            <Shortcut href="/app/prof" icon={<TrophyIcon size={18} />} label="Mes cours" />
          ) : null}
          {user.role === "manager" || user.role === "admin" ? (
            <Shortcut href="/gerant" icon={<TargetIcon size={18} />} label="Espace gérant" />
          ) : null}
          {user.role === "seller" ? (
            <Shortcut href="/vendeur" icon={<CartIcon size={18} />} label="Espace vendeur" />
          ) : null}
          {user.role === "admin" ? (
            <Shortcut href="/admin" icon={<ChartIcon size={18} />} label="Administration" />
          ) : null}
        </div>
      </div>

      <form action={signOut}>
        <button className="w-full rounded-full border border-dashed border-line px-4 py-3 text-xs text-muted transition hover:text-dim lg:w-auto lg:px-6">
          Se déconnecter · {user.name}
        </button>
      </form>
    </>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="glass flex items-center gap-2.5 rounded-card px-3.5 py-3 transition hover:bg-surface-2">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-gold-text">{icon}</span>
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  );
}
