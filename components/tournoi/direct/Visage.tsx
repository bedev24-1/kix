import { Photo } from "@/components/ui/Photo";
import { cn } from "@/lib/cn";

/** Une photo de profil ronde, ou l'initiale quand il n'y en a pas. */
export function Visage({ nom, avatar, taille = 26, className }: { nom: string; avatar: string | null; taille?: number; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 font-semibold text-dim", className)}
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.42) }}
    >
      {avatar ? <Photo src={avatar} alt="" fill sizes={`${taille}px`} className="object-cover" /> : (nom.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Le badge des joueurs pro, à côté de leur nom. */
export function BadgePro() {
  return (
    <span className="shrink-0 rounded-sm bg-gold px-1 text-[8.5px] leading-[14px] font-bold tracking-[0.06em] text-gold-ink">PRO</span>
  );
}
