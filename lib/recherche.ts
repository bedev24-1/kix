import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, events, products, tournaments, venues } from "@/db";
import { chercherJoueurs } from "@/lib/joueurs";
import { soireeTerminee } from "@/lib/soirees";

/**
 * La recherche de l'accueil.
 *
 * La barre affichait « Salle, tournoi, puff… » et ne cherchait rien : c'était
 * une image de barre de recherche. Elle cherche maintenant pour de bon, dans
 * les cinq choses qu'on cherche vraiment ici — une salle où jouer ce soir,
 * une soirée, un tournoi, un article, un joueur.
 *
 * Tout se fait en une requête par famille, sur les colonnes qu'un client a en
 * tête : le nom, le quartier, l'accroche. Pas d'index plein texte pour le
 * moment — quelques centaines de lignes par salle ne le justifient pas, et
 * `ilike` reste lisible par celui qui reprendra ce fichier.
 */

export type Trouvaille = {
  id: string;
  titre: string;
  detail: string;
  href: string;
  image: string | null;
};

export type Resultats = {
  terme: string;
  salles: Trouvaille[];
  soirees: Trouvaille[];
  tournois: Trouvaille[];
  articles: Trouvaille[];
  joueurs: Trouvaille[];
  total: number;
};

const VIDE = (terme: string): Resultats => ({
  terme,
  salles: [],
  soirees: [],
  tournois: [],
  articles: [],
  joueurs: [],
  total: 0,
});

export async function chercherPartout(terme: string, moi: string): Promise<Resultats> {
  const propre = terme.trim();
  if (propre.length < 2) return VIDE(propre);
  const motif = `%${propre.replace(/[%_]/g, "")}%`;

  const [salles, soirees, tournois, articles, joueurs] = await Promise.all([
    db
      .select()
      .from(venues)
      .where(and(eq(venues.active, true), sql`(${venues.name} ilike ${motif} or ${venues.area} ilike ${motif})`))
      .orderBy(venues.name)
      .limit(6),
    db
      .select()
      .from(events)
      .where(
        and(
          eq(events.active, true),
          sql`(${events.title} ilike ${motif} or ${events.subtitle} ilike ${motif} or ${events.tags} ilike ${motif})`,
        ),
      )
      .orderBy(sql`${events.endedAt} is not null`, events.createdAt)
      .limit(6),
    db
      .select()
      .from(tournaments)
      .where(and(sql`${tournaments.status} <> 'brouillon'`, sql`${tournaments.title} ilike ${motif}`))
      .orderBy(desc(tournaments.createdAt))
      .limit(6),
    db
      .select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          sql`(${products.name} ilike ${motif} or ${products.detail} ilike ${motif})`,
        ),
      )
      .orderBy(products.name)
      .limit(6),
    chercherJoueurs(propre, moi, 6),
  ]);

  const res: Resultats = {
    terme: propre,
    salles: salles.map((v) => ({
      id: v.id,
      titre: v.name,
      detail: `${v.area} · ${v.tables} tables`,
      href: `/app/salles/${v.slug}`,
      image: v.image,
    })),
    soirees: soirees.map((e) => ({
      id: e.id,
      titre: e.title,
      detail: soireeTerminee(e.endedAt) ? `${e.day} · terminé` : `${e.day} · ${e.hours}`,
      href: `/app/events/${e.slug}`,
      image: e.image,
    })),
    tournois: tournois.map((t) => ({
      id: t.id,
      titre: t.title,
      detail: `${t.discipline} · ${t.size} joueurs`,
      href: `/app/tournois/${t.slug}`,
      image: t.image,
    })),
    articles: articles.map((p) => ({
      id: p.id,
      titre: p.name,
      detail: `${p.price.toLocaleString("fr-FR")} F · ${p.detail || p.category}`,
      href: `/app/shop/${p.slug}`,
      image: p.image,
    })),
    joueurs: joueurs.map((j) => ({
      id: j.id,
      titre: j.name,
      detail: `${j.points} points · code ${j.code}`,
      href: `/app/joueurs/${j.id}`,
      image: j.avatar,
    })),
    total: 0,
  };

  res.total = res.salles.length + res.soirees.length + res.tournois.length + res.articles.length + res.joueurs.length;
  return res;
}
