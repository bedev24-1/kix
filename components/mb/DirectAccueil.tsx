"use client";

import Link from "next/link";
import { useLive } from "@/lib/useLive";
import { DirectsEnCours } from "@/components/mb/accueil/DirectsEnCours";
import { Card } from "@/components/ui/Card";
import { ArrowRightIcon, BoltIcon } from "@/components/icons";
import type { Encours } from "@/lib/stream";

/**
 * La bande « en direct » de l'accueil.
 *
 * La section des matchs filmés existait sans que rien ne l'annonce : elle
 * n'était ni dans la barre du bas ni sur l'accueil, et un client n'avait
 * aucune raison de la découvrir. Elle se montre maintenant d'elle-même, et
 * elle se met à jour toute seule — une salle qui allume sa caméra apparaît
 * ici sans que personne ne recharge quoi que ce soit.
 */
export function DirectAccueil({ initial, vide }: { initial: Encours; /** Ce qui s'affiche quand aucune caméra ne tourne. */ vide?: React.ReactNode }) {
  const { data } = useLive<Encours>("/api/direct/encours", initial);

  // Rien à l'antenne : l'accueil fournit son propre bloc (rappel + rediffusions).
  if (data.total === 0 && vide) return <>{vide}</>;

  // Rien à l'antenne : on invite, sans mentir sur ce qui s'y passe.
  if (data.total === 0) {
    return (
      <Link href="/direct" className="press block">
        <Card tone="dashed" shape="panel" className="flex items-center gap-3.5 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
            <BoltIcon size={19} />
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="text-[14px] font-semibold">Les tables filmées</span>
            <span className="text-[12px] text-muted">
              Personne ne diffuse à cette heure. Reviens ce soir.
            </span>
          </span>
          <ArrowRightIcon size={16} className="shrink-0 text-muted" />
        </Card>
      </Link>
    );
  }

  return <DirectsEnCours directs={data.directs} />;
}
