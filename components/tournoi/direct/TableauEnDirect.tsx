import Link from "next/link";
import { eq, or, sql } from "drizzle-orm";
import { db, tournaments, type Tournament } from "@/db";
import { Actualisation } from "@/components/tournoi/direct/Actualisation";
import { Arbre, type Section } from "@/components/tournoi/direct/Arbre";
import { Arbitres } from "@/components/tournoi/direct/Arbitres";
import { Groupes } from "@/components/tournoi/direct/Groupes";
import { Visage } from "@/components/tournoi/direct/Visage";
import { tableauEnDirect, type DuelVue } from "@/lib/tournoi-direct";
import { nomDuTour } from "@/lib/bracket";
import { CATEGORIES } from "@/lib/tournois";
import { cn } from "@/lib/cn";

/**
 * Le tournoi en direct, tel que la salle le suit : un onglet par tableau
 * (hommes, dames…), l'arbre final, les groupes, les arbitres. Il se met à
 * jour tout seul pendant que les scores tombent.
 */
export async function TableauEnDirect({
  t,
  base,
  lien,
  brouillon = false,
}: {
  t: Tournament;
  base: string;
  /** La console : le tirage préparé se montre à l'organisateur avant le lancement. */
  brouillon?: boolean;
  /** Où mène l'onglet d'un tableau frère ; par défaut `${base}/${slug}`. */
  lien?: (o: { id: string; slug: string }) => string;
}) {
  const principalId = t.parentId ?? t.id;
  const freres = await db
    .select({
      id: tournaments.id,
      slug: tournaments.slug,
      category: tournaments.category,
      parentId: tournaments.parentId,
      // Le nombre de joueurs retenus : la taille du tableau, elle, devient
      // celle de la phase finale au tirage (64 inscrits → 32 qualifiés).
      joueurs: sql<number>`(select count(*)::int from mb.tournament_players p where p.tournament_id = mb.tournaments.id and p.status = 'accepte')`,
    })
    .from(tournaments)
    .where(or(eq(tournaments.id, principalId), eq(tournaments.parentId, principalId)));
  const onglets = freres.sort((a, b) => (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0));

  // Avant le lancement, le tirage n'est qu'un brouillon de l'organisateur :
  // ni les joueurs ni le public ne le voient.
  const lance = t.status === "encours" || t.status === "termine";
  const direct = await tableauEnDirect(t.id);
  if (!lance && !brouillon) {
    direct.poules = [];
    direct.arbre = [];
    direct.perdants = [];
    direct.finales = [];
  }
  const rien = direct.poules.length === 0 && direct.arbre.length === 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Le tableau</h2>
        {rien ? null : <Actualisation ids={[t.id]} signature={direct.signature} />}
      </div>

      {onglets.length > 1 ? (
        <nav className="flex gap-1.5 overflow-x-auto">
          {onglets.map((o) => (
            <Link
              key={o.id}
              href={lien ? lien(o) : `${base}/${o.slug}`}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold",
                o.id === t.id ? "border-gold bg-gold text-gold-ink" : "border-line text-dim",
              )}
            >
              {CATEGORIES[o.category] ?? o.category} · {o.joueurs}
            </Link>
          ))}
        </nav>
      ) : null}

      {rien ? (
        <p className="rounded-panel border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">
          Le tirage n&apos;a pas encore eu lieu. Les poules et l&apos;arbre apparaîtront ici, en direct.
        </p>
      ) : null}

      {t.status === "encours" && direct.enLice.length ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] tracking-[0.08em] text-muted uppercase">
            Encore en lice · {direct.enLice.length}
          </span>
          <div className="flex flex-wrap gap-1">
            {direct.enLice.slice(0, 24).map((v) => (
              <Visage key={v.id} nom={v.nom} avatar={v.avatar} taille={28} className="border border-line" />
            ))}
            {direct.enLice.length > 24 ? (
              <span className="grid h-7 place-items-center rounded-full bg-surface-2 px-2 text-[10.5px] text-dim">
                +{direct.enLice.length - 24}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {direct.arbre.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold">
            Phase finale{direct.perdants.length ? " · double élimination" : ""}
          </h3>
          <Arbre sections={sectionsDeLArbre(direct)} />
        </div>
      ) : null}

      {direct.poules.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-[14px] font-semibold">Phase de groupes</h3>
          <Groupes poules={direct.poules} finies={direct.poulesFinies} qualifies={t.qualifiers} />
        </div>
      ) : null}

      <Arbitres arbitres={direct.arbitres} />
    </section>
  );
}

/** Les arbres à dessiner : principal, perdants, grande finale. */
function sectionsDeLArbre(d: Awaited<ReturnType<typeof tableauEnDirect>>): Section[] {
  const parTour = (duels: DuelVue[], nom: (r: number) => string) =>
    [...new Set(duels.map((x) => x.round))]
      .sort((a, b) => a - b)
      .map((r) => ({ titre: nom(r), duels: duels.filter((x) => x.round === r) }))
      // Un tour fait tout entier d'exemptions ne se dessine pas (Challonge non plus).
      .filter((c) => c.duels.some((x) => x.status !== "exempt"));
  const double = d.perdants.length > 0 || d.finales.length > 0;
  const sections: Section[] = [
    { titre: double ? "Tableau principal" : undefined, colonnes: parTour(d.arbre, (r) => nomDuTour(r, d.tours)) },
  ];
  if (d.perdants.length) {
    const derniers = Math.max(...d.perdants.map((x) => x.round));
    sections.push({ titre: "Tableau des perdants", colonnes: parTour(d.perdants, (r) => (r === derniers ? "Finale des perdants" : `Tour ${r}`)) });
  }
  // La revanche n'apparaît que si elle se joue.
  const finales = d.finales.filter((x) => x.round === 1 || x.a || x.b);
  if (finales.length) sections.push({ titre: "Grande finale", colonnes: finales.map((x) => ({ titre: x.round === 1 ? "Grande finale" : "Revanche", duels: [x] })) });
  return sections;
}
