"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Le direct : toutes les quinze secondes, on demande au serveur l'empreinte
 * du tableau ; si un score, un joueur ou un arbitre a bougé, la page se
 * redessine. Rien n'est rechargé tant que rien ne change.
 */
export function Actualisation({ ids, signature }: { ids: string[]; signature: string }) {
  const router = useRouter();
  const derniere = useRef(signature);
  const [maj, setMaj] = useState<string | null>(null);

  useEffect(() => {
    derniere.current = signature;
  }, [signature]);

  useEffect(() => {
    const tic = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/tournois/signature?ids=${ids.join(",")}`, { cache: "no-store" });
        const { signature: s } = (await r.json()) as { signature?: string };
        if (s && s !== derniere.current) {
          derniere.current = s;
          setMaj(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
          router.refresh();
        }
      } catch {
        /* hors ligne : on réessaie au prochain tour */
      }
    }, 15_000);
    return () => clearInterval(tic);
  }, [ids, router]);

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-jade" />
      </span>
      En direct{maj ? ` · mis à jour à ${maj}` : ""}
    </span>
  );
}
