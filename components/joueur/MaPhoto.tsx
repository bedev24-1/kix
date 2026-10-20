"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Photo } from "@/components/ui/Photo";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { ChampImage } from "@/components/joueur/ChampImage";
import { changerMaPhoto } from "@/lib/actions";

/**
 * Sa photo, choisie par soi.
 *
 * Elle s'affiche partout — au classement, sur sa fiche, à côté de son score
 * en direct — et pourtant personne ne pouvait la changer. Le même champ que
 * pour la photo d'une bande : on dépose depuis le téléphone, ou on colle une
 * adresse.
 */
export function MaPhoto({ nom, avatar, compact = false }: { nom: string; avatar: string | null; compact?: boolean }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [ouvert, setOuvert] = useState(false);
  const [pending, start] = useTransition();
  const [erreur, setErreur] = useState<string>();

  // Compact : la seule photo, touchable, pour la carte de profil.
  const declencheur = compact ? (
    <button
      onClick={() => setOuvert(true)}
      aria-label={avatar ? "Changer ma photo" : "Ajouter une photo"}
      className="press relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold/50 bg-surface-2 text-[16px] font-semibold text-dim"
    >
      {avatar ? <Photo src={avatar} alt={nom} fill sizes="64px" className="object-cover" /> : nom.slice(0, 2).toUpperCase()}
      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[8.5px] font-semibold text-white uppercase">
        {avatar ? "Changer" : "Photo"}
      </span>
    </button>
  ) : null;

  return (
    <>
      {compact ? declencheur : (
      <Card shape="panel" className="flex items-center gap-3.5 p-4">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-[15px] font-semibold text-dim">
          {avatar ? (
            <Photo src={avatar} alt={nom} fill sizes="56px" className="object-cover" />
          ) : (
            nom.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold">{nom}</span>
          <span className="text-[11.5px] text-muted">
            {avatar ? "Ta photo apparaît au classement et sur ta fiche." : "Ajoute une photo : on te reconnaîtra."}
          </span>
        </span>
        <button
          onClick={() => setOuvert(true)}
          className="press shrink-0 rounded-full border border-line px-3.5 py-2 text-[12px] text-dim transition hover:text-ink"
        >
          {avatar ? "Changer" : "Ajouter"}
        </button>
      </Card>
      )}

      <Sheet open={ouvert} onClose={() => setOuvert(false)} title="Ma photo de profil">
        <form
          action={(fd) =>
            start(async () => {
              setErreur(undefined);
              const res = await changerMaPhoto(fd);
              if (!res.ok) {
                setErreur(res.error);
                return;
              }
              setOuvert(false);
              notify(res.avatar ? "Photo mise à jour" : "Photo retirée", { tone: "jade" });
              router.refresh();
            })
          }
          className="flex flex-col gap-3.5"
        >
          {erreur ? (
            <p role="alert" className="shake rounded-panel border border-warn/45 bg-warn/10 px-3.5 py-2.5 text-[12px] text-warn">
              {erreur}
            </p>
          ) : null}

          <ChampImage name="avatar" defaultValue={avatar ?? ""} dossier="avatars" label="Ta photo" />

          <p className="text-[11.5px] text-muted">
            Laisse le champ vide pour revenir à tes initiales. JPEG, PNG, WebP, AVIF ou GIF — 5 Mo maximum.
          </p>

          <button
            disabled={pending}
            className="press flex h-12 items-center justify-center gap-2 rounded-full bg-gold text-[14px] font-semibold text-gold-ink disabled:opacity-60"
          >
            {pending ? <Spinner size={16} /> : null}
            Enregistrer
          </button>
        </form>
      </Sheet>
    </>
  );
}
