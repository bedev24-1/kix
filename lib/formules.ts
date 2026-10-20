/**
 * Les formules de tournoi prêtes à l'emploi.
 *
 * Un gérant qui ouvre le formulaire pour la première fois doit répondre à
 * quinze questions — taille du tableau, joueurs par poule, qualifiés, parties
 * gagnantes, partage de la dotation — avant même d'avoir nommé son tournoi.
 * La plupart du temps, il veut l'une des quatre compétitions qu'on organise
 * vraiment ici. Une formule les pose d'un geste ; tout reste modifiable
 * ensuite, champ par champ.
 *
 * Ce qui n'est jamais imposé : le titre et le droit d'inscription. L'un
 * appartient à l'organisateur, l'autre à sa salle et à son quartier.
 */

export type Formule = {
  cle: string;
  nom: string;
  pitch: string;
  /** Les valeurs posées dans le formulaire, par nom de champ. */
  champs: Record<string, string>;
  /** Trois repères affichés sur la carte, pour choisir sans lire le détail. */
  reperes: string[];
};

export const FORMULES: Formule[] = [
  {
    cle: "quartier",
    nom: "Sèche du quartier",
    pitch: "Une soirée, huit joueurs, une partie par tour. Celui qui met la noire passe.",
    reperes: ["8 joueurs", "Partie sèche", "Entrée libre au public"],
    champs: {
      discipline: "8-ball",
      format: "direct",
      size: "8",
      groupSize: "4",
      qualifiers: "2",
      mode: "seche",
      raceTo: "1",
      prizePool: "30000",
      prizeSplit: "70 % au vainqueur, 30 % au finaliste",
      hours: "19h → 23h",
      ticketPrice: "0",
      ticketCapacity: "60",
      rules:
        "8-ball en parties sèches, rayés ou pleins. Le premier qui met la noire, son camp rentré, gagne le tour. Casse alternée, bille en main sur faute. Retard de plus de dix minutes : tour perdu.",
    },
  },
  {
    cle: "open",
    nom: "Open de salle",
    pitch: "Le format d'un samedi complet : des poules pour que chacun joue, puis un tableau.",
    reperes: ["16 joueurs", "Poules puis tableau", "Course à 4 parties"],
    champs: {
      discipline: "8-ball",
      format: "poules",
      size: "16",
      groupSize: "4",
      qualifiers: "2",
      mode: "course",
      raceTo: "4",
      prizePool: "150000",
      prizeSplit: "60 % au vainqueur, 25 % au finaliste, 15 % partagés entre les demi-finalistes",
      hours: "14h → 23h",
      ticketPrice: "1000",
      ticketCapacity: "120",
      rules:
        "8-ball, rayés ou pleins : chaque partie se gagne à la noire. Poules de quatre, tous contre tous, course à 4 parties ; les deux premiers passent en tableau. Classement aux victoires, puis à la différence de parties, puis à la confrontation directe. Course à 5 en demi-finale, 6 en finale.",
    },
  },
  {
    cle: "nuit",
    nom: "Nuit 9-ball",
    pitch: "Rapide et spectaculaire, pour une salle pleine en fin de semaine.",
    reperes: ["16 joueurs", "Élimination directe", "Course à 5 parties"],
    champs: {
      discipline: "9-ball",
      format: "direct",
      size: "16",
      groupSize: "4",
      qualifiers: "2",
      mode: "course",
      raceTo: "5",
      prizePool: "220000",
      prizeSplit: "50 % au vainqueur, 30 % au finaliste, 20 % partagés entre les demi-finalistes",
      hours: "18h → 02h",
      ticketPrice: "2000",
      ticketCapacity: "150",
      rules:
        "9-ball, casse gagnante conservée. Course à 5 parties au premier tour, 6 en demi-finale, 7 en finale. Le 9 sur la casse compte pour une partie.",
    },
  },
  {
    cle: "grand",
    nom: "Grand tournoi",
    pitch: "Deux jours, trente-deux joueurs, une dotation qui se remarque.",
    reperes: ["32 joueurs", "Poules puis tableau", "Course à 6 parties"],
    champs: {
      discipline: "8-ball",
      format: "poules",
      size: "32",
      groupSize: "4",
      qualifiers: "2",
      mode: "course",
      raceTo: "6",
      prizePool: "500000",
      prizeSplit: "50 % au vainqueur, 25 % au finaliste, 15 % aux demi-finalistes, 10 % aux quarts",
      hours: "12h → 23h",
      ticketPrice: "3000",
      ticketCapacity: "250",
      rules:
        "8-ball, rayés ou pleins : chaque partie se gagne à la noire. Poules de quatre le premier jour, tableau de trente-deux le second. Course à 6 parties, 7 en demi-finale, 8 en finale. Arbitre à la table à partir des quarts.",
    },
  },
];

/** Les champs qu'une formule ne touche jamais. */
export const CHAMPS_LIBRES = ["title", "entryFee", "startsAt", "endsAt", "closesAt", "venueId", "image"];
