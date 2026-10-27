import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTournament, duree } from "@/lib/tournaments";
import { tableauEnDirect, type DuelVue, type GroupeVue, type Visage } from "@/lib/tournoi-direct";
import { nomDuTour } from "@/lib/bracket";
import { CATEGORIES, DISCIPLINES, FORMATS } from "@/lib/tournois";
import { urlPublique } from "@/lib/url-publique";
import { getCurrentUser } from "@/lib/session";

/**
 * L'image du tableau, à partager : le logo, le titre, l'essentiel du
 * tournoi, puis l'arbre complet tel qu'il est dans l'app — tableau des
 * perdants et poules compris —, et le champion une fois le titre décerné.
 *
 * Un PNG haute définition, dessiné par le serveur : il s'envoie sur WhatsApp
 * comme une photo, sans capture d'écran recadrée à la main.
 */

export const dynamic = "force-dynamic";

const C = {
  fond: "#071a13",
  carte: "#10261d",
  ligne: "#24402f",
  encre: "#f4efe2",
  muet: "#9fb0a6",
  pale: "#6f8378",
  or: "#e0b43a",
  orFonce: "#8a6a12",
  jade: "#3ccf9a",
};

const LARGEUR_COL = 250;
const ECART_COL = 34;
const HAUTEUR_DUEL = 66;
const PAS_DUEL = 80;
const MARGE = 48;

const lire = (p: string) => readFile(path.join(process.cwd(), "public", p));
const tampon = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

async function enDataUri(source: string | null, origine: string): Promise<string | null> {
  if (!source) return null;
  try {
    let octets: Buffer;
    let type = "";
    if (source.startsWith("/") && !source.startsWith("//") && !source.startsWith("/api/")) {
      octets = await lire(source.split("?")[0].slice(1));
      type = source.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";
    } else {
      const url = source.startsWith("/") ? `${origine}${source}` : source;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return null;
      type = r.headers.get("content-type") ?? "";
      octets = Buffer.from(await r.arrayBuffer());
    }
    // Le moteur d'image ne lit que le PNG et le JPEG.
    if (!/png|jpe?g/.test(type)) return null;
    return `data:${type.includes("png") ? "image/png" : "image/jpeg"};base64,${octets.toString("base64")}`;
  } catch {
    return null;
  }
}

const court = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ligne = await getTournament(slug);
  if (!ligne || ligne.tournament.status === "brouillon") return new Response("Tournoi introuvable", { status: 404 });
  const { tournament: t, venue } = ligne;
  const lance = t.status === "encours" || t.status === "termine";
  // Le tirage préparé (pas encore lancé) : seul l'organisateur — l'admin, ou le
  // gérant de la salle — peut en tirer l'image, pour l'annoncer avant le jour J.
  let provisoire = false;
  if (!lance && new URL(req.url).searchParams.get("brouillon") === "1") {
    const moi = await getCurrentUser();
    provisoire = moi?.role === "admin" || (moi?.role === "manager" && moi.venueId === t.venueId);
    if (!provisoire) return new Response("Réservé à l'organisateur", { status: 403 });
  }
  const direct = await tableauEnDirect(t.id);
  if (!lance && !provisoire) {
    direct.arbre = [];
    direct.perdants = [];
    direct.finales = [];
    direct.poules = [];
  }

  // Les photos se lisent par l'adresse interne ; le pied affiche l'adresse publique.
  const origine = new URL(req.url).origin;
  const publique = new URL(await urlPublique()).host;
  const [regular, gras, tresGras, logoPng] = await Promise.all([
    lire("fonts/Geist-Regular.ttf"),
    lire("fonts/Geist-Bold.ttf"),
    lire("fonts/Geist-ExtraBold.ttf"),
    lire("brand/logo.png"),
  ]);
  const logo = `data:image/png;base64,${logoPng.toString("base64")}`;

  // Les visages, une fois chacun.
  const visages = new Map<string, Visage>();
  for (const d of [...direct.arbre, ...direct.perdants, ...direct.finales]) for (const v of [d.a, d.b]) if (v) visages.set(v.id, v);
  for (const g of direct.poules) for (const l of g.lignes) visages.set(l.id, l);
  const photos = new Map<string, string | null>();
  await Promise.all([...visages.values()].map(async (v) => photos.set(v.id, await enDataUri(v.avatar, origine))));

  // Les colonnes de l'arbre, comme dans l'app : un tour fait tout entier d'exemptions ne se dessine pas.
  const colonnes = (duels: DuelVue[], nom: (r: number) => string) =>
    [...new Set(duels.map((d) => d.round))]
      .sort((a, b) => a - b)
      .map((r) => ({ titre: nom(r), duels: duels.filter((d) => d.round === r).sort((a, b) => a.slot - b.slot) }))
      .filter((c) => c.duels.some((d) => d.status !== "exempt"));
  const principal = colonnes(direct.arbre, (r) => nomDuTour(r, direct.tours));
  const derniersPerdants = Math.max(0, ...direct.perdants.map((d) => d.round));
  const perdants = colonnes(direct.perdants, (r) => (r === derniersPerdants ? "Finale des perdants" : `Perdants · tour ${r}`));
  const finales = direct.finales.filter((d) => d.round === 1 || d.a || d.b);

  const champion =
    t.status === "termine"
      ? (() => {
          const finale = finales.length ? finales[finales.length - 1] : principal.at(-1)?.duels[0];
          if (!finale?.gagnant) return null;
          return finale.gagnant === "a" ? finale.a : finale.b;
        })()
      : null;

  // Les dimensions : l'image s'adapte au tableau.
  const hauteurArbre = (cols: typeof principal) => (cols.length ? Math.max(1, cols[0].duels.length) * PAS_DUEL : 0);
  const largeurArbre = (n: number) => n * LARGEUR_COL + Math.max(0, n - 1) * ECART_COL;
  const colsFinales = finales.length ? 1 : 0;
  const parLigne = 3;
  const largeur = Math.max(
    1200,
    MARGE * 2 + largeurArbre(principal.length + colsFinales + (champion ? 1 : 0)),
    MARGE * 2 + largeurArbre(perdants.length),
    direct.poules.length ? MARGE * 2 + parLigne * 360 + (parLigne - 1) * 20 : 0,
  );
  const hauteurPoule = (g: GroupeVue) => 52 + g.lignes.length * 34 + 12;
  const rangeesPoules: GroupeVue[][] = [];
  for (let i = 0; i < direct.poules.length; i += parLigne) rangeesPoules.push(direct.poules.slice(i, i + parLigne));
  const hauteurPoules = rangeesPoules.reduce((s, r) => s + Math.max(...r.map(hauteurPoule)) + 20, direct.poules.length ? 50 : 0);
  const description = court((t.presentation || "").replace(/\s+/g, " ").trim(), 220);
  const enTete = 250 + (description ? 56 : 0);
  const section = (cols: typeof principal) => (cols.length ? 60 + hauteurArbre(cols) + 20 : 0);
  const rien = !principal.length && !direct.poules.length;
  const hauteur = enTete + hauteurPoules + section(principal) + section(perdants) + (rien ? 220 : 0) + 110;

  const sousTitre = [
    DISCIPLINES[t.discipline] ?? t.discipline,
    FORMATS[t.format] ?? t.format,
    t.category !== "open" ? (CATEGORIES[t.category] ?? t.category) : "",
    `${ligne.acceptes} joueur${Number(ligne.acceptes) > 1 ? "s" : ""}`,
  ].filter(Boolean);
  const infos = [duree(t), venue?.name ?? "", t.prizePool > 0 ? `Dotation ${t.prizePool.toLocaleString("fr-FR")} F` : ""].filter(Boolean);

  const Pastille = ({ v, taille = 24 }: { v: Visage; taille?: number }) => {
    const src = photos.get(v.id);
    return src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={taille} height={taille} style={{ borderRadius: 999, objectFit: "cover" }} alt="" />
    ) : (
      <div style={{ width: taille, height: taille, borderRadius: 999, background: C.ligne, color: C.encre, fontSize: taille * 0.45, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
        {v.nom.slice(0, 1).toUpperCase()}
      </div>
    );
  };

  const Cote = ({ v, attente, score, gagne, fini }: { v: Visage | null; attente: string | null; score: number; gagne: boolean; fini: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", height: 30, padding: "0 10px", gap: 8, background: gagne ? "rgba(224,180,58,0.12)" : "transparent" }}>
      {v ? <Pastille v={v} /> : <div style={{ width: 24, height: 24, display: "flex" }} />}
      <div style={{ display: "flex", flexGrow: 1, flexShrink: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", fontSize: 15, fontWeight: gagne ? 800 : 400, color: v ? (fini && !gagne ? C.pale : C.encre) : C.pale }}>
        {v ? court(v.nom, 17) : court(attente ?? "à venir", 22)}
      </div>
      {v?.seed ? <div style={{ display: "flex", fontSize: 11, color: C.pale }}>{`#${v.seed}`}</div> : null}
      <div style={{ display: "flex", width: 22, justifyContent: "flex-end", fontSize: 16, fontWeight: 800, color: gagne ? C.or : C.muet }}>
        {fini || score ? String(score) : ""}
      </div>
    </div>
  );

  const Duel = ({ d }: { d: DuelVue }) => {
    if (d.status === "exempt") return <div style={{ display: "flex", width: LARGEUR_COL, height: HAUTEUR_DUEL }} />;
    const fini = d.status === "termine";
    return (
      <div style={{ display: "flex", flexDirection: "column", width: LARGEUR_COL, height: HAUTEUR_DUEL, borderRadius: 12, border: `1.5px solid ${d.status === "encours" ? C.or : C.ligne}`, background: C.carte, overflow: "hidden", justifyContent: "center" }}>
        <Cote v={d.a} attente={d.attenteA} score={d.scoreA} gagne={d.gagnant === "a"} fini={fini} />
        <div style={{ display: "flex", height: 1, background: C.ligne }} />
        <Cote v={d.b} attente={d.attenteB} score={d.scoreB} gagne={d.gagnant === "b"} fini={fini} />
      </div>
    );
  };

  // Les traits entre deux tours : chaque paire de duels mène au duel suivant.
  const Liens = ({ de, vers, h }: { de: DuelVue[]; vers: DuelVue[]; h: number }) => {
    const traits: { x: number; y: number; w: number; hh: number }[] = [];
    if (vers.length * 2 === de.length) {
      const yDe = (k: number) => (h * (k + 0.5)) / de.length;
      const milieu = ECART_COL / 2;
      for (let j = 0; j < vers.length; j++) {
        const ys = [2 * j, 2 * j + 1].filter((k) => de[k].status !== "exempt").map(yDe);
        const cible = (h * (j + 0.5)) / vers.length;
        if (!ys.length) continue;
        for (const y of ys) traits.push({ x: 0, y, w: milieu, hh: 2 });
        const haut = Math.min(...ys, cible), bas = Math.max(...ys, cible);
        traits.push({ x: milieu - 1, y: haut, w: 2, hh: bas - haut + 2 });
        traits.push({ x: milieu, y: cible, w: milieu, hh: 2 });
      }
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", width: ECART_COL }}>
        <div style={{ display: "flex", height: 26 }} />
        <div style={{ display: "flex", position: "relative", height: h }}>
          {traits.map((t, i) => (
            <div key={i} style={{ position: "absolute", left: t.x, top: t.y - 1, width: t.w, height: t.hh, background: C.ligne }} />
          ))}
        </div>
      </div>
    );
  };

  const TitreColonne = ({ texte }: { texte: string }) => (
    <div style={{ display: "flex", height: 26, fontSize: 12, letterSpacing: 2, color: C.or, textTransform: "uppercase" }}>{texte}</div>
  );

  const Arbre = ({ titre, cols, extra }: { titre?: string; cols: typeof principal; extra?: React.ReactNode }) => {
    const h = hauteurArbre(cols);
    return (
      <div style={{ display: "flex", flexDirection: "column", marginTop: 24 }}>
        {titre ? <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: C.encre, marginBottom: 10 }}>{titre}</div> : null}
        <div style={{ display: "flex" }}>
          {cols.map((c, i) => (
            <div key={i} style={{ display: "flex" }}>
              {i > 0 ? <Liens de={cols[i - 1].duels} vers={c.duels} h={h} /> : null}
              <div style={{ display: "flex", flexDirection: "column", width: LARGEUR_COL }}>
                <TitreColonne texte={c.titre} />
                <div style={{ display: "flex", flexDirection: "column", height: h, justifyContent: "space-around" }}>
                  {c.duels.map((d) => <Duel key={d.id} d={d} />)}
                </div>
              </div>
            </div>
          ))}
          {extra}
        </div>
      </div>
    );
  };

  const ColonneFinales = finales.length ? (
    <div style={{ display: "flex", flexDirection: "column", width: LARGEUR_COL, marginLeft: ECART_COL }}>
      <TitreColonne texte="Grande finale" />
      <div style={{ display: "flex", flexDirection: "column", height: hauteurArbre(principal), justifyContent: "space-around" }}>
        {finales.map((d) => <Duel key={d.id} d={d} />)}
      </div>
    </div>
  ) : null;

  const ColonneChampion = champion ? (
    <div style={{ display: "flex", flexDirection: "column", width: LARGEUR_COL, marginLeft: ECART_COL }}>
      <TitreColonne texte="Champion" />
      <div style={{ display: "flex", flexDirection: "column", height: hauteurArbre(principal), justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 12px", borderRadius: 16, border: `2px solid ${C.or}`, background: "rgba(224,180,58,0.10)" }}>
          <div style={{ display: "flex", fontSize: 30 }}>🏆</div>
          <Pastille v={champion} taille={64} />
          <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: C.or, textAlign: "center" }}>{court(champion.nom, 20)}</div>
        </div>
      </div>
    </div>
  ) : null;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: C.fond, padding: MARGE, fontFamily: "Geist", color: C.encre }}>
        {/* En-tête : logo, titre, l'essentiel. */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={150} height={118} alt="" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexGrow: 1 }}>
            <div style={{ display: "flex", fontSize: 13, letterSpacing: 3, color: C.or, textTransform: "uppercase" }}>
              {t.status === "termine" ? "Tableau final" : lance ? "Tableau en direct" : provisoire ? "Tirage provisoire · le tableau peut encore bouger" : "Le tournoi"}
            </div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, lineHeight: 1.05 }}>{court(t.title, 48)}</div>
            <div style={{ display: "flex", fontSize: 18, color: C.muet }}>{sousTitre.join(" · ")}</div>
            <div style={{ display: "flex", fontSize: 17, color: C.encre }}>{infos.join(" · ")}</div>
          </div>
        </div>
        {description ? (
          <div style={{ display: "flex", marginTop: 18, fontSize: 16, lineHeight: 1.4, color: C.muet, maxWidth: 1100 }}>{description}</div>
        ) : null}
        <div style={{ display: "flex", height: 2, marginTop: 22, background: `linear-gradient(90deg, ${C.or}, ${C.orFonce}, transparent)` }} />

        {rien ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800 }}>Le tableau sera dévoilé au tirage</div>
            <div style={{ display: "flex", fontSize: 17, color: C.muet }}>Inscris-toi sur Master Break pour y prendre ta place.</div>
          </div>
        ) : null}

        {direct.poules.length ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 24, gap: 20 }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 800 }}>Phase de groupes</div>
            {rangeesPoules.map((rangee, i) => (
              <div key={i} style={{ display: "flex", gap: 20 }}>
                {rangee.map((g) => (
                  <div key={g.numero} style={{ display: "flex", flexDirection: "column", width: 360, borderRadius: 14, border: `1.5px solid ${C.ligne}`, background: C.carte, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: `linear-gradient(90deg, #3a2a05, ${C.orFonce})` }}>
                      <div style={{ display: "flex", fontSize: 17, fontWeight: 800 }}>{`Poule ${g.nom}`}</div>
                      <div style={{ display: "flex", fontSize: 12, color: "#f4e3b0" }}>{`${g.joues}/${g.total} joués`}</div>
                    </div>
                    {g.lignes.map((l) => (
                      <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, height: 34, padding: "0 12px", borderTop: `1px solid ${C.ligne}`, background: l.qualifie ? "rgba(60,207,154,0.10)" : "transparent" }}>
                        <div style={{ display: "flex", width: 16, fontSize: 13, color: l.qualifie ? C.jade : C.pale }}>{String(l.rang)}</div>
                        <Pastille v={l} taille={22} />
                        <div style={{ display: "flex", flexGrow: 1, fontSize: 14, fontWeight: l.qualifie ? 700 : 400 }}>{court(l.nom, 20)}</div>
                        <div style={{ display: "flex", fontSize: 12, color: C.muet }}>{`${l.victoires}V ${l.defaites}D`}</div>
                        <div style={{ display: "flex", width: 34, justifyContent: "flex-end", fontSize: 15, fontWeight: 800, color: C.or }}>{String(l.points)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}

        {principal.length ? (
          <Arbre
            titre={direct.poules.length || perdants.length ? (perdants.length ? "Tableau principal" : "Phase finale") : undefined}
            cols={principal}
            extra={
              <>
                {ColonneFinales}
                {ColonneChampion}
              </>
            }
          />
        ) : null}
        {perdants.length ? <Arbre titre="Tableau des perdants" cols={perdants} /> : null}

        {/* Pied : où suivre la suite. */}
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between", paddingTop: 24, borderTop: `1px solid ${C.ligne}` }}>
          <div style={{ display: "flex", fontSize: 16, color: C.muet }}>{provisoire ? `Inscriptions et tableau : ${publique}/t/${t.slug}` : `Suis le tableau en direct : ${publique}/t/${t.slug}`}</div>
          <div style={{ display: "flex", fontSize: 16, fontWeight: 800, color: C.or, letterSpacing: 2 }}>MASTER BREAK</div>
        </div>
      </div>
    ),
    {
      width: largeur,
      height: hauteur,
      fonts: [
        { name: "Geist", data: tampon(regular), weight: 400, style: "normal" },
        { name: "Geist", data: tampon(gras), weight: 700, style: "normal" },
        { name: "Geist", data: tampon(tresGras), weight: 800, style: "normal" },
      ],
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${t.slug}-${provisoire ? "tirage" : "tableau"}.png"`,
      },
    },
  );
}
