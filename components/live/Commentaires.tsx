"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Photo } from "@/components/ui/Photo";
import { useSnackbar } from "@/components/ui/Snackbar";
import { ArrowRightIcon, XIcon } from "@/components/icons";
import { useLive } from "@/lib/useLive";
import { commenterDirect, masquerCommentaire } from "@/lib/actions-commentaires";
import { cn } from "@/lib/cn";
import type { Commentaire } from "@/lib/commentaires";

const MAX = 280;

const heure = (t: number) =>
  new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }).format(t);

/**
 * Les commentaires du direct, en temps réel.
 *
 * Le fil arrive par le même mécanisme que le score (SSE) ; on écrit en bas,
 * comme dans une messagerie. Le message de celui qui tient la caméra ou de la
 * salle porte une étiquette d'or. Le diffuseur, le gérant et l'administration
 * peuvent masquer un message.
 */
export function Commentaires({
  streamId,
  initial,
  ouvert,
  moderateur,
  moi,
}: {
  streamId: string;
  initial: Commentaire[];
  /** Le direct tourne : on peut écrire. Sinon le fil reste lisible, fermé. */
  ouvert: boolean;
  moderateur: boolean;
  moi: string;
}) {
  const { data } = useLive<Commentaire[]>(`/api/direct/${streamId}/commentaires`, initial);
  const [texte, setTexte] = useState("");
  const [envoi, demarrer] = useTransition();
  const [caches, setCaches] = useState<string[]>([]);
  const fil = useRef<HTMLDivElement>(null);
  const enBas = useRef(true);
  const { notify } = useSnackbar();

  const visibles = data.filter((c) => !caches.includes(c.id));

  // Le fil suit les nouveaux messages, sauf si on est remonté lire plus haut.
  useEffect(() => {
    const el = fil.current;
    if (el && enBas.current) el.scrollTop = el.scrollHeight;
  }, [visibles.length]);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const t = texte.trim();
    if (!t || envoi) return;
    demarrer(async () => {
      const r = await commenterDirect(streamId, t);
      if (r.ok) {
        setTexte("");
        enBas.current = true;
      } else notify("Message non envoyé", { detail: r.error, tone: "warn" });
    });
  }

  function masquer(id: string) {
    setCaches((c) => [...c, id]);
    void masquerCommentaire(id).then((r) => {
      if (!r.ok) {
        setCaches((c) => c.filter((x) => x !== id));
        notify("Impossible de masquer", { detail: r.error, tone: "warn" });
      }
    });
  }

  return (
    <section aria-label="Commentaires du direct" className="flex flex-col overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[14px] font-bold">Commentaires</h2>
        <span className="text-[11.5px] text-muted">
          {visibles.length ? `${visibles.length} message${visibles.length > 1 ? "s" : ""}` : "Sois le premier à écrire"}
        </span>
      </div>

      <div
        ref={fil}
        onScroll={(e) => {
          const el = e.currentTarget;
          enBas.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="flex h-72 flex-col gap-2.5 overflow-y-auto px-4 py-3 lg:h-96"
      >
        {visibles.length === 0 ? (
          <p className="m-auto text-center text-[12.5px] text-muted">
            {ouvert ? "Encourage les joueurs, commente les coups." : "Aucun commentaire sur ce direct."}
          </p>
        ) : (
          visibles.map((c) => (
            <div key={c.id} className="group flex items-start gap-2.5">
              {c.auteur.avatar ? (
                <Photo src={c.auteur.avatar} alt="" width={28} height={28} className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold">
                  {c.auteur.nom.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 grow">
                <span className="flex items-baseline gap-1.5">
                  <span className={cn("truncate text-[12.5px] font-bold", c.auteur.id === moi && "text-gold-text")}>{c.auteur.nom}</span>
                  {c.equipe ? (
                    <span className="rounded-full border border-gold/50 px-1.5 text-[8.5px] font-bold tracking-[0.08em] text-gold-text uppercase">Direct</span>
                  ) : null}
                  <span className="shrink-0 text-[10.5px] text-faint">{heure(c.at)}</span>
                </span>
                <span className="block text-[13px] leading-[1.4] break-words text-dim">{c.texte}</span>
              </span>
              {moderateur ? (
                <button
                  type="button"
                  onClick={() => masquer(c.id)}
                  aria-label="Masquer ce message"
                  className="press grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint opacity-60 hover:bg-surface-2 hover:text-warn group-hover:opacity-100"
                >
                  <XIcon size={12} />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {ouvert ? (
        <form
          onSubmit={envoyer}
          className="group m-3 mt-0 flex h-11 items-center rounded-full border border-ink/12 bg-ink/5 pr-1 pl-4 transition-colors has-[input:not(:placeholder-shown)]:border-gold/55"
        >
          <label className="grow">
            <span className="sr-only">Ton commentaire</span>
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value.slice(0, MAX))}
              placeholder="Écris un commentaire…"
              maxLength={MAX}
              className="h-full w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/50"
            />
          </label>
          {texte.length > MAX - 40 ? <span className="mr-2 text-[10.5px] text-muted">{MAX - texte.length}</span> : null}
          <button
            disabled={envoi || !texte.trim()}
            aria-label="Envoyer"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 text-ink transition-colors group-has-[input:not(:placeholder-shown)]:bg-gold group-has-[input:not(:placeholder-shown)]:text-gold-ink disabled:opacity-50"
          >
            <ArrowRightIcon size={15} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line px-4 py-3 text-[12px] text-muted">Le direct est terminé : les commentaires sont fermés.</p>
      )}
    </section>
  );
}
