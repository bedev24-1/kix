import type { Cote, Groupe } from "@/lib/huit";

/** Les types de la Barre Master Break, partagés entre serveur et navigateur. */
export type JoueurBarre = { id: string; nom: string; avatar: string | null };

export type EtatBarre = {
  id: string;
  status: string;
  scoreA: number;
  scoreB: number;
  target: number;
  turnId: string | null;
  winnerId: string | null;
  a: JoueurBarre;
  b: JoueurBarre;
  /** La manche de 8-ball, quand l'arbitre la suit coup par coup. */
  huit: {
    manche: number;
    casseur: Cote;
    main: Cote;
    phase: "casse" | "jeu";
    groupes: { A: Groupe | null; B: Groupe | null };
    empochees: number[];
    restantes: { A: number; B: number };
    surLaNoire: { A: boolean; B: boolean };
    billeEnMain: boolean;
    dernier: string;
  } | null;
  /** Le chrono de coup : `fin` (instant serveur) quand il tourne, sinon `reste`. */
  chrono: { duree: number; fin: number | null; reste: number | null; ext: { A: boolean; B: boolean } } | null;
  /** Quand l'objet a été construit, pour caler l'horloge du navigateur sur celle du serveur. */
  maintenant: number;
  contexte: { titre: string | null; tour: string | null; salle: string; table: string | null; label: string };
  sponsor: string;
  direct: boolean;
  /** La vidéo porte déjà la barre (incrustée par OBS) : le lecteur n'en ajoute pas. */
  barreVideo: boolean;
  /** Ce qui s'affiche en bandeau : « Sur la noire · X », « Bille en main · X »… */
  annonce: string | null;
  moments: { id: string; at: string; texte: string; kind: string; cote: Cote | null }[];
};

