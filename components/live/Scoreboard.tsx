"use client";

import { Photo } from "@/components/ui/Photo";
import { LiveDot } from "@/components/live/LiveDot";
import { cn } from "@/lib/cn";
import { jeuCourt } from "@/lib/regles";

export type Side = { id: string; name: string; avatar?: string | null };

/**
 * Le tableau d'affichage. Trois tailles : dans une liste, en tête de fiche, et
 * en plein écran sur la télé de la salle — même composant, mêmes couleurs.
 */
export function Scoreboard({
  a,
  b,
  scoreA,
  scoreB,
  target,
  turnId,
  status,
  winnerId,
  size = "page",
  connected,
  label,
  className,
}: {
  a: Side;
  b: Side;
  scoreA: number;
  scoreB: number;
  target: number;
  turnId?: string | null;
  status: string;
  winnerId?: string | null;
  size?: "page" | "tv";
  connected?: boolean;
  label?: string;
  className?: string;
}) {
  const tv = size === "tv";
  const live = status === "live";

  return (
    <div className={cn("flex flex-col items-center gap-4", tv && "gap-8", className)}>
      <div className="flex items-center gap-3">
        {live ? <LiveDot connected={connected ?? true} className={cn(tv && "px-4 py-2 text-[13px]")} /> : null}
        {label ? (
          <span className={cn("label-caps text-[10.5px] text-muted", tv && "text-[15px]")}>{label}</span>
        ) : null}
      </div>

      {/* Au-delà du téléphone, on garde les deux joueurs près du score plutôt
          que collés aux bords : c'est la ligne qu'on lit d'un coup d'œil. */}
      <div
        className={cn(
          "mx-auto grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3",
          // En plein écran on prend toute la largeur : les noms ont besoin de
          // place, et le score reste au centre quoi qu'il arrive.
          tv ? "gap-[4vw]" : "max-w-xl",
        )}
      >
        <Player side={a} tone="gold" tv={tv} active={turnId === a.id} won={winnerId === a.id} />

        <div className="flex flex-col items-center gap-1">
          {/* En plein écran, la taille suit l'écran : la même page est lisible
              sur un téléviseur de salle comme sur un projecteur. */}
          <div
            className={cn(
              "flex items-baseline gap-2 font-bold leading-none tracking-[-0.04em]",
              tv ? "gap-4 text-[clamp(64px,10vw,190px)]" : "text-[44px]",
            )}
          >
            <span className={cn(scoreA >= scoreB ? "text-gold-text" : "text-ink")}>{scoreA}</span>
            <span className={cn("text-muted", tv ? "text-[0.42em]" : "text-[26px]")}>–</span>
            <span className={cn(scoreB >= scoreA ? "text-jade-text" : "text-ink")}>{scoreB}</span>
          </div>
          <span
            className={cn(
              "label-caps whitespace-nowrap text-muted",
              tv ? "text-[clamp(12px,1.4vw,22px)]" : "text-[10px]",
            )}
          >
            {status === "done" ? "terminé" : jeuCourt(target)}
          </span>
        </div>

        <Player side={b} tone="jade" tv={tv} active={turnId === b.id} won={winnerId === b.id} align="right" />
      </div>
    </div>
  );
}

function Player({
  side,
  tone,
  tv,
  active,
  won,
  align = "left",
}: {
  side: Side;
  tone: "gold" | "jade";
  tv: boolean;
  active: boolean;
  won: boolean;
  align?: "left" | "right";
}) {
  const size = tv ? 192 : 52;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3",
        // Sur un petit téléphone, la photo passe au-dessus du nom : sinon le nom
        // n'a plus la place et vient chevaucher le score.
        tv ? "gap-5" : "max-sm:flex-col max-sm:gap-1.5 max-sm:text-center",
        align === "right" && (tv ? "flex-row-reverse text-right" : "sm:flex-row-reverse sm:text-right"),
      )}
    >
      <span className="relative shrink-0">
        {side.avatar ? (
          <Photo
            src={side.avatar}
            alt={side.name}
            width={size}
            height={size}
            className={cn(
              "rounded-full object-cover ring-2",
              tone === "gold" ? "ring-gold/60" : "ring-jade/60",
              tv ? "h-[clamp(64px,8vw,150px)] w-[clamp(64px,8vw,150px)]" : "h-13 w-13",
            )}
          />
        ) : (
          <span
            className={cn(
              "grid place-items-center rounded-full bg-surface-2 font-semibold ring-2",
              tone === "gold" ? "ring-gold/60" : "ring-jade/60",
              tv ? "h-[clamp(64px,8vw,150px)] w-[clamp(64px,8vw,150px)] text-[clamp(20px,2.4vw,44px)]" : "h-13 w-13 text-[15px]",
            )}
          >
            {side.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {/* La main à la table : un point qui respire du côté du joueur. */}
        {active ? (
          <span
            className={cn(
              "live-dot absolute -right-0.5 -bottom-0.5 rounded-full",
              tone === "gold" ? "bg-gold text-gold" : "bg-jade text-jade",
              tv ? "h-5 w-5" : "h-3 w-3",
            )}
          />
        ) : null}
      </span>

      <span className={cn("flex min-w-0 max-w-full flex-col gap-0.5", !tv && "max-sm:items-center", align === "right" && "sm:items-end", align === "right" && tv && "items-end")}>
        <span className={cn("truncate font-semibold", tv ? "text-[clamp(20px,3vw,52px)]" : "text-[15px]")}>
          {side.name}
        </span>
        <span
          className={cn(
            "text-[11px]",
            tv && "text-[clamp(13px,1.3vw,24px)]",
            won ? (tone === "gold" ? "text-gold-text" : "text-jade-text") : "text-muted",
          )}
        >
          {won ? "Vainqueur" : active ? "à la table" : " "}
        </span>
      </span>
    </div>
  );
}
