/**
 * Une bille de billard américain, dessinée en CSS : couleur réglementaire,
 * bande pour les rayées (9 à 15), pastille blanche, reflet. Une bille déjà
 * empochée s'éteint.
 */
const COULEURS = ["#f2c230", "#1f4fd1", "#d8352a", "#5b2a86", "#f07a1a", "#1c8a4a", "#7a1f1f", "#111111"];

export function couleurBille(n: number) {
  return COULEURS[(n - 1) % 8] ?? "#111";
}

export function Bille({ n, tombee = false, taille = 18, titre }: { n: number; tombee?: boolean; taille?: number; titre?: string }) {
  const c = couleurBille(n);
  const rayee = n >= 9;
  return (
    <span
      title={titre ?? `Bille ${n}`}
      style={{
        position: "relative",
        display: "inline-block",
        flex: "none",
        width: taille,
        height: taille,
        borderRadius: "50%",
        background: rayee
          ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), transparent 32%), linear-gradient(180deg, #f3f0e8 0 24%, ${c} 24% 76%, #f3f0e8 76%)`
          : `radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), transparent 32%), ${c}`,
        boxShadow: tombee
          ? "inset 0 0 0 1.5px rgba(255,255,255,.35)"
          : "inset -2px -3px 5px rgba(0,0,0,.45), 0 1px 2px rgba(0,0,0,.5)",
        opacity: tombee ? 0.28 : 1,
        filter: tombee ? "grayscale(1) brightness(.6)" : undefined,
      }}
    >
      <span style={{ position: "absolute", inset: "30%", borderRadius: "50%", background: "#f8f6f0", opacity: 0.9 }} />
    </span>
  );
}

/** Les billes d'un joueur : son groupe (empochées éteintes), et la noire quand il est dessus. */
export function BillesDuGroupe({
  groupe,
  empochees,
  surLaNoire,
  taille = 18,
  ecart = 5,
  inverse = false,
}: {
  groupe: "pleines" | "rayees" | null;
  empochees: number[];
  surLaNoire: boolean;
  taille?: number;
  ecart?: number;
  inverse?: boolean;
}) {
  if (!groupe) return null;
  const billes = groupe === "pleines" ? [1, 2, 3, 4, 5, 6, 7] : [9, 10, 11, 12, 13, 14, 15];
  return (
    <span style={{ display: "inline-flex", gap: ecart, flexDirection: inverse ? "row-reverse" : "row", alignItems: "center" }}>
      {billes.map((b) => (
        <Bille key={b} n={b} tombee={empochees.includes(b)} taille={taille} />
      ))}
      {surLaNoire ? <Bille n={8} taille={taille} titre="Sur la noire" /> : null}
    </span>
  );
}
