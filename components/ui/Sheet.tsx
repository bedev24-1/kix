"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Panneau modal : feuille qui remonte du bas sur téléphone, carte centrée
 * au-delà de 640 px. Ferme à l'Échap et au clic sur le fond.
 *
 * La feuille est déposée dans `document.body`, jamais rendue sur place.
 * Le conteneur des pages porte `.stagger`, dont l'animation d'entrée laisse
 * un `transform` posé — et un élément transformé ouvre un contexte
 * d'empilement : le `z-50` de la feuille ne valait alors que dans la page, si
 * bien que la barre de navigation, pourtant en `z-30` mais posée à la racine,
 * passait par-dessus et cachait le bas du formulaire. Sortir la feuille de
 * l'arbre de la page est le seul remède : régler les z-index les uns contre
 * les autres ne répare pas un contexte d'empilement, il le déplace.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const surLeClient = useSurLeClient();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !surLeClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end pt-[env(safe-area-inset-top)] justify-center sm:items-center">
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "sheet-in relative max-h-[90dvh] w-full overflow-y-auto rounded-t-panel border border-line bg-bg-2 px-5 pt-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))]",
          "sm:max-w-[26rem] sm:rounded-panel sm:px-6 sm:pb-6",
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[19px]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Vrai une fois le navigateur aux commandes.
 *
 * `createPortal` a besoin d'un `document` : le rendu serveur n'en a pas. On
 * le demande à `useSyncExternalStore` plutôt qu'à un effet — un effet qui
 * appelle `setState` rejoue un rendu pour rien, et React le signale.
 */
const jamais = () => () => {};
const useSurLeClient = () =>
  useSyncExternalStore(
    jamais,
    () => true,
    () => false,
  );
