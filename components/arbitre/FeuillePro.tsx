"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { finishMatch, scoreRack, startMatch } from "@/lib/actions";
import { annuler8, chrono8, coup8, preparer8, type GesteChrono } from "@/lib/actions-huit";
import { FAUTES, NOIRE, NOMS_GROUPES, restantes, surLaNoire, type Cote, type Coup, type Etat8, type Faute, type ReglesCasse } from "@/lib/huit";
import type { EtatBarre } from "@/lib/barre-types";
import { useLive } from "@/lib/useLive";
import { cn } from "@/lib/cn";
import { BillesDuGroupe, couleurBille } from "@/components/live/barre/Bille";
import { resteChrono, useHorloge } from "@/components/live/barre/useHorloge";
import { PanneauDiffusion, type DiffusionVue } from "./PanneauDiffusion";

type Joueur = { id: string; name: string; avatar: string | null };

/**
 * La feuille d'arbitre 8-ball, version outil pro.
 *
 * En haut, le bandeau de score — le même que la barre du direct. Au centre,
 * les billes et les gestes de l'arbitre ; à droite (en dessous sur mobile),
 * le chrono de coup, le direct, le journal et les outils du match. Sur
 * ordinateur, les gestes ont un raccourci clavier.
 */
export function FeuillePro({
  matchId,
  a,
  b,
  barre: barreInitiale,
  etat,
  annulable,
  can,
  raison,
  diffusion,
}: {
  matchId: string;
  a: Joueur;
  b: Joueur;
  barre: EtatBarre;
  etat: Etat8;
  annulable: boolean;
  can: boolean;
  raison?: string;
  diffusion: DiffusionVue;
}) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const { data, connected, recu } = useLive<{ barre: EtatBarre | null }>(`/api/live/${matchId}`, { barre: barreInitiale });
  const barre = data.barre ?? barreInitiale;
  const statut = barre.status;

  const [choix, setChoix] = useState<number[]>([]);
  const [panneau, setPanneau] = useState<null | "faute" | "noire" | "noire_casse">(null);
  const [erreur, setErreur] = useState<string>();
  const [corriger, setCorriger] = useState(false);
  const [finir, setFinir] = useState(false);

  // Avant le match : qui casse, la règle, le chrono.
  const [casseur, setCasseur] = useState<Cote>("A");
  const [regle, setRegle] = useState<ReglesCasse>("alternee");
  const [duree, setDuree] = useState(0);

  const nom = useCallback((c: Cote) => (c === "A" ? a.name : b.name), [a.name, b.name]);
  const tireur = nom(etat.main);
  const casse = etat.phase === "casse";
  const pret = surLaNoire(etat, etat.main);
  const sel = choix.filter((n) => n !== NOIRE).sort((x, y) => x - y);

  const executer = useCallback(
    (fn: () => Promise<{ ok: boolean; error?: string; manche?: Cote } | void>, message?: string) =>
      start(async () => {
        setErreur(undefined);
        const r = await fn();
        if (r && !r.ok) {
          setErreur(r.error);
          return;
        }
        setChoix([]);
        setPanneau(null);
        if (r && r.manche) notify(`Manche pour ${nom(r.manche)}`, { tone: "jade" });
        else if (message) notify(message);
        router.refresh();
      }),
    [nom, notify, router],
  );

  const jouer = useCallback((coup: Coup, message: string) => executer(() => coup8(matchId, coup), message), [executer, matchId]);
  const geste = useCallback((g: GesteChrono, message?: string) => executer(() => chrono8(matchId, g), message), [executer, matchId]);
  const basculer = (n: number) => setChoix((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));

  const horloge = useHorloge(Boolean(barre.chrono?.fin));
  const reste = resteChrono(barre.chrono, horloge, barre.maintenant, recu);
  const enMarche = Boolean(barre.chrono?.fin);

  // Raccourcis clavier (ordinateur) : E empoché, R raté, S sécurité, F faute,
  // N noire, Espace chrono, Z annuler. Jamais pendant la saisie d'un texte.
  useEffect(() => {
    if (!can || statut !== "live") return;
    const touche = (ev: KeyboardEvent) => {
      const cible = ev.target as HTMLElement | null;
      if (cible && /input|select|textarea/i.test(cible.tagName)) return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey || pending) return;
      const k = ev.key.toLowerCase();
      if (k === " " && barre.chrono) {
        ev.preventDefault();
        geste(enMarche ? { type: "pause" } : { type: "demarrer" });
      } else if (k === "z" && annulable) executer(() => annuler8(matchId), "Dernier coup annulé");
      else if (casse) return;
      else if (k === "e" && sel.length) jouer({ type: "empoche", billes: sel }, `Empoché · ${tireur} continue`);
      else if (k === "r") jouer({ type: "rate" }, "Raté : la main passe");
      else if (k === "s") jouer({ type: "securite" }, "Sécurité");
      else if (k === "f") setPanneau("faute");
      else if (k === "n") setPanneau("noire");
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [can, statut, pending, casse, sel, tireur, annulable, barre.chrono, enMarche, geste, jouer, executer, matchId]);

  return (
    <div className="flex flex-col gap-4">
      <Bandeau barre={barre} connected={connected} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* ------------------------------------------------ colonne de jeu */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          {statut === "done" || statut === "cancelled" ? (
            <Bloc className="items-center gap-2 py-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-gold text-gold-ink">
                <CheckIcon size={26} />
              </span>
              <h2 className="text-[19px]">{statut === "done" ? "Match terminé" : "Match annulé"}</h2>
              <p className="text-[13px] text-dim">
                {barre.scoreA} – {barre.scoreB} · {barre.winnerId === a.id ? a.name : barre.winnerId === b.id ? b.name : "égalité"}
              </p>
              {barre.contexte.titre ? <p className="text-[12px] text-muted">Le score est reporté au tableau du tournoi.</p> : null}
            </Bloc>
          ) : !can ? (
            <Bloc className="py-6 text-center text-[13px] text-muted">{raison ?? "Tu peux suivre ce match, mais pas le marquer."}</Bloc>
          ) : statut === "scheduled" ? (
            <Bloc className="gap-4">
              <Titre>Avant la première casse</Titre>
              <Choix
                label="Qui casse en premier ?"
                options={[["A", a.name], ["B", b.name]]}
                valeur={casseur}
                onChange={(v) => setCasseur(v as Cote)}
              />
              <Choix
                label="Les manches suivantes"
                options={[["alternee", "Casse alternée"], ["gagnant", "Le gagnant casse"]]}
                valeur={regle}
                onChange={(v) => setRegle(v as ReglesCasse)}
              />
              <Choix
                label="Chrono de coup"
                options={[["0", "Sans"], ["30", "30 s"], ["45", "45 s"], ["60", "60 s"]]}
                valeur={String(duree)}
                onChange={(v) => setDuree(Number(v))}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  executer(async () => {
                    const p = await preparer8(matchId, casseur, regle);
                    if (!p.ok) return p;
                    if (duree) await chrono8(matchId, { type: "regler", duree });
                    await startMatch(matchId);
                    return { ok: true };
                  }, "Match lancé")
                }
                className="press flex h-14 items-center justify-center gap-2 rounded-panel bg-gold text-[16px] font-semibold text-gold-ink disabled:opacity-50"
              >
                {pending ? <Spinner size={18} /> : null}
                Lancer le match
              </button>
            </Bloc>
          ) : (
            <>
              {/* Qui joue, et ce qui compte pour le prochain coup. */}
              <Bloc className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted">
                  <span>
                    Manche {etat.manche} · casse {nom(etat.casseur)} · {etat.regle === "gagnant" ? "le gagnant casse" : "casse alternée"}
                  </span>
                  {etat.dernier ? <span className="truncate">Dernier coup : {etat.dernier}</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[20px] font-bold">{casse ? `Casse de ${nom(etat.casseur)}` : `À ${tireur} de jouer`}</span>
                  {etat.billeEnMain ? <Puce ton="warn">Bille en main</Puce> : null}
                  {pret ? <Puce ton="ink">Sur la noire</Puce> : null}
                  {!casse && !etat.groupes[etat.main] ? <Puce ton="muet">Table ouverte</Puce> : null}
                </div>
              </Bloc>

              {/* Les billes : on touche celles qui viennent de tomber. */}
              <Bloc className="gap-3">
                <div className="flex items-center justify-between">
                  <Titre>{casse ? "Billes tombées à la casse" : "Billes tombées sur ce coup"}</Titre>
                  {sel.length ? (
                    <button type="button" onClick={() => setChoix([])} className="text-[11.5px] text-muted">
                      Effacer
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5">
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                    <BilleTouche
                      key={n}
                      n={n}
                      choisie={choix.includes(n)}
                      tombee={etat.empochees.includes(n)}
                      onClick={n === NOIRE ? () => setPanneau(casse ? "noire_casse" : "noire") : () => basculer(n)}
                    />
                  ))}
                </div>
              </Bloc>

              {erreur ? <p className="rounded-card bg-warn/10 px-3 py-2 text-[12.5px] text-warn">{erreur}</p> : null}

              {/* Ce qui s'est passé. */}
              {panneau === "faute" ? (
                <Bloc className="gap-2">
                  <Titre>
                    Faute de {tireur}
                    {sel.length ? ` · billes ${sel.join(", ")} tombées` : ""}
                  </Titre>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(FAUTES) as Faute[]).map((f) => (
                      <button key={f} disabled={pending} onClick={() => jouer({ type: "faute", faute: f, billes: sel }, "Faute : bille en main")}
                        className="press min-h-11 rounded-card border border-warn/40 px-3 py-2 text-left text-[12.5px] text-warn disabled:opacity-50">
                        {FAUTES[f]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPanneau(null)} className="self-start text-[12px] text-muted">← Retour</button>
                </Bloc>
              ) : panneau === "noire" ? (
                <Bloc className="gap-2">
                  <Titre>La noire est tombée · {tireur}</Titre>
                  <button disabled={pending} onClick={() => jouer({ type: "noire", legale: true }, "Noire")}
                    className="press h-12 rounded-panel bg-gold text-[14px] font-semibold text-gold-ink disabled:opacity-50">
                    Proprement, dans la poche annoncée
                  </button>
                  {!pret ? (
                    <p className="text-[11.5px] text-warn">
                      {tireur} n&apos;a pas fini {etat.groupes[etat.main] ? `ses ${NOMS_GROUPES[etat.groupes[etat.main]!]}` : "son groupe"} : la noire lui fait perdre la manche.
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["blanche", "Avec la blanche"],
                      ["poche", "Mauvaise poche"],
                      ["sortie", "Sortie de la table"],
                    ].map(([k, label]) => (
                      <button key={k} disabled={pending} onClick={() => jouer({ type: "noire", legale: false, motif: label.toLowerCase() }, "Noire perdante")}
                        className="press min-h-11 rounded-card border border-warn/40 px-3 text-[12.5px] text-warn disabled:opacity-50">
                        {label} · perd
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setPanneau(null)} className="self-start text-[12px] text-muted">← Retour</button>
                </Bloc>
              ) : panneau === "noire_casse" ? (
                <Bloc className="gap-2">
                  <Titre>Noire à la casse · règle de la salle</Titre>
                  <button disabled={pending} onClick={() => jouer({ type: "noire_casse", gagne: true }, "Noire à la casse")}
                    className="press h-12 rounded-panel bg-gold text-[14px] font-semibold text-gold-ink disabled:opacity-50">
                    {nom(etat.casseur)} gagne la manche
                  </button>
                  <button disabled={pending} onClick={() => jouer({ type: "noire_casse", gagne: false }, "Noire replacée")}
                    className="press h-11 rounded-full border border-line text-[12.5px] disabled:opacity-50">
                    On la replace, la partie continue
                  </button>
                  <button onClick={() => setPanneau(null)} className="self-start text-[12px] text-muted">← Retour</button>
                </Bloc>
              ) : casse ? (
                <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                  <Geste principal disabled={pending} onClick={() => jouer({ type: "casse", empochees: sel }, "Casse")}>
                    {pending ? <Spinner size={16} /> : null}
                    {sel.length ? `Casse · ${sel.length} bille${sel.length > 1 ? "s" : ""} tombée${sel.length > 1 ? "s" : ""}` : "Casse · rien n'est tombé"}
                  </Geste>
                  <Geste ton="warn" disabled={pending} onClick={() => jouer({ type: "casse", empochees: sel, faute: true }, "Faute à la casse")}>
                    Faute à la casse
                  </Geste>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Geste principal className="col-span-2 sm:col-span-4" disabled={pending || !sel.length} raccourci="E"
                    onClick={() => jouer({ type: "empoche", billes: sel }, `Empoché · ${tireur} continue`)}>
                    {pending ? <Spinner size={16} /> : null}
                    {sel.length ? `Empoché ${sel.join(", ")} · ${tireur} continue` : "Touche les billes tombées"}
                  </Geste>
                  <Geste disabled={pending} raccourci="R" onClick={() => jouer({ type: "rate" }, "Raté : la main passe")}>Raté</Geste>
                  <Geste disabled={pending} raccourci="S" onClick={() => jouer({ type: "securite" }, "Sécurité")}>Sécurité</Geste>
                  <Geste ton="warn" disabled={pending} raccourci="F" onClick={() => setPanneau("faute")}>Faute…</Geste>
                  <Geste ton="noir" disabled={pending} raccourci="N" onClick={() => setPanneau("noire")}>Noire…</Geste>
                </div>
              )}
            </>
          )}
        </div>

        {/* ------------------------------------------------ colonne d'outils */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {statut === "live" && can ? (
            <Bloc className="gap-3">
              <div className="flex items-center justify-between">
                <Titre>Chrono de coup</Titre>
                <div className="flex gap-1">
                  {[0, 30, 45, 60].map((d) => (
                    <button key={d} type="button" disabled={pending} onClick={() => geste({ type: "regler", duree: d }, d ? `Chrono ${d} s` : "Chrono coupé")}
                      className={cn("press rounded-full border px-2.5 py-1 text-[11px]", (barre.chrono?.duree ?? 0) === d ? "border-gold bg-gold font-semibold text-gold-ink" : "border-line text-dim")}>
                      {d ? `${d}s` : "Off"}
                    </button>
                  ))}
                </div>
              </div>
              {barre.chrono ? (
                <>
                  <div className="flex items-center gap-4">
                    <Anneau reste={reste} duree={barre.chrono.duree} />
                    <div className="grid grow grid-cols-2 gap-2">
                      <Geste petit principal={!enMarche} disabled={pending} raccourci="␣" onClick={() => geste(enMarche ? { type: "pause" } : { type: "demarrer" })}>
                        {enMarche ? "Pause" : "Lancer"}
                      </Geste>
                      <Geste petit disabled={pending} onClick={() => geste({ type: "relancer" })}>À plein</Geste>
                      {(["A", "B"] as Cote[]).map((c) => (
                        <Geste key={c} petit disabled={pending || barre.chrono!.ext[c]} onClick={() => geste({ type: "extension", cote: c }, `Extension · ${nom(c)}`)}>
                          {barre.chrono!.ext[c] ? <s>Ext. {nom(c).split(" ")[0]}</s> : `Ext. ${nom(c).split(" ")[0]}`}
                        </Geste>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted">Repart seul après chaque coup noté. Une extension par joueur et par manche.</p>
                </>
              ) : (
                <p className="text-[12px] text-muted">Pas de chrono sur ce match. Choisis une durée pour l&apos;activer.</p>
              )}
            </Bloc>
          ) : null}

          {statut === "live" && can ? (
            <Bloc className="gap-2.5">
              <Titre>Match</Titre>
              {annulable ? (
                <Geste petit disabled={pending} raccourci="Z" onClick={() => executer(() => annuler8(matchId), "Dernier coup annulé")}>
                  Annuler le dernier coup
                </Geste>
              ) : null}
              {corriger ? (
                <div className="grid grid-cols-2 gap-3">
                  {[a, b].map((j) => (
                    <div key={j.id} className="flex flex-col gap-1.5">
                      <span className="truncate text-center text-[12px]">{j.name}</span>
                      <div className="flex gap-1.5">
                        <button disabled={pending} onClick={() => executer(() => scoreRack(matchId, j.id, 1), "Manche ajoutée")}
                          className="press h-10 grow rounded-full border border-line disabled:opacity-45"><PlusIcon size={14} className="mx-auto" /></button>
                        <button disabled={pending} onClick={() => executer(() => scoreRack(matchId, j.id, -1), "Manche retirée")}
                          className="press h-10 grow rounded-full border border-line disabled:opacity-45"><MinusIcon size={14} className="mx-auto" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setCorriger(false)} className="col-span-2 text-[12px] text-muted">Fermer</button>
                </div>
              ) : (
                <Geste petit disabled={pending} onClick={() => setCorriger(true)}>Corriger le score des manches</Geste>
              )}
              {finir ? (
                <div className="flex flex-col gap-2 rounded-card border border-warn/40 bg-warn/10 p-3">
                  <span className="text-[12.5px] text-warn">Terminer maintenant ? Le score en cours fait foi.</span>
                  <div className="flex gap-2">
                    <button onClick={() => setFinir(false)} className="press h-10 grow rounded-full border border-line text-[12px]">Continuer</button>
                    <button disabled={pending} onClick={() => executer(() => finishMatch(matchId), "Match terminé")}
                      className="press h-10 grow rounded-full bg-warn text-[12px] font-semibold text-bg disabled:opacity-50">Terminer</button>
                  </div>
                </div>
              ) : (
                <Geste petit ton="warn" disabled={pending} onClick={() => setFinir(true)}>Terminer le match</Geste>
              )}
              <p className="hidden text-[11px] text-muted lg:block">
                Clavier : E empoché · R raté · S sécurité · F faute · N noire · Espace chrono · Z annuler
              </p>
            </Bloc>
          ) : null}

          <Bloc className="gap-3">
            <Titre>Diffusion</Titre>
            <PanneauDiffusion matchId={matchId} vue={diffusion} />
          </Bloc>

        </div>

        {/* Le journal : sous les gestes sur ordinateur, en bas sur mobile. */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
          <Bloc className="gap-1">
            <Titre>Journal</Titre>
            {barre.moments.length === 0 ? (
              <p className="text-[12px] text-muted">Les coups notés s&apos;afficheront ici.</p>
            ) : (
              <ol className="flex max-h-72 flex-col overflow-y-auto">
                {barre.moments.map((m) => (
                  <li key={m.id} className="flex items-start gap-2.5 border-t border-line py-2 text-[12.5px] first:border-t-0">
                    <span className="w-10 shrink-0 text-[11px] text-muted tabular-nums">
                      {new Date(m.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", m.kind === "foul" ? "bg-warn" : m.kind === "rack" ? "bg-gold" : m.cote === "A" ? "bg-ink" : "bg-muted")} />
                    <span className="min-w-0">
                      {m.cote ? <b className="font-semibold">{nom(m.cote).split(" ")[0]} · </b> : null}
                      {m.texte}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Bloc>

        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- pièces */

function Bandeau({ barre, connected }: { barre: EtatBarre; connected: boolean }) {
  const h = barre.huit;
  const live = barre.status === "live";
  const cote = (c: Cote) => {
    const j = c === "A" ? barre.a : barre.b;
    const score = c === "A" ? barre.scoreA : barre.scoreB;
    const main = live && (h ? h.main === c : barre.turnId === j.id);
    const groupe = h?.groupes[c] ?? null;
    return (
      <div className={cn("relative flex min-w-0 items-center gap-2 px-3 py-3 sm:gap-4 sm:px-5", c === "B" && "flex-row-reverse text-right")}>
        {main ? <span className={cn("absolute inset-y-0 w-1.5 bg-gold", c === "A" ? "left-0" : "right-0")} /> : null}
        {j.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={j.avatar} alt="" className={cn("hidden h-14 w-14 shrink-0 rounded-full object-cover sm:block", main ? "ring-2 ring-gold" : "ring-1 ring-line")} />
        ) : (
          <span className={cn("hidden h-14 w-14 shrink-0 place-items-center rounded-full bg-surface-2 text-[16px] font-bold sm:grid", main ? "ring-2 ring-gold" : "")}>
            {j.nom.slice(0, 1)}
          </span>
        )}
        <div className={cn("flex min-w-0 grow flex-col gap-1", c === "B" && "items-end")}>
          <span className="max-w-full truncate text-[14px] font-bold sm:text-[19px]">{j.nom}</span>
          <span className={cn("flex items-center gap-2", c === "B" && "flex-row-reverse")}>
            {groupe ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[0.08em] uppercase", groupe === "pleines" ? "bg-[#f2c230]/15 text-[#f6d77a]" : "bg-ink/10 text-ink")}>
                <span className="sm:hidden">{groupe === "pleines" ? "Pl." : "Ray."}</span>
                <span className="hidden sm:inline">{groupe === "pleines" ? "Pleines" : "Rayées"}</span> · {h ? restantes({ groupes: h.groupes, empochees: h.empochees } as Etat8, c) : ""}
              </span>
            ) : null}
            <span className="hidden sm:inline-flex">
              {h ? <BillesDuGroupe groupe={groupe} empochees={h.empochees} surLaNoire={h.surLaNoire[c]} taille={14} ecart={3} inverse={c === "B"} /> : null}
            </span>
          </span>
        </div>
        <span key={score} className={cn("mba-pop shrink-0 text-[34px] font-extrabold tabular-nums sm:text-[46px]", main && "text-gold-text")}>{score}</span>
      </div>
    );
  };
  return (
    <div className="sticky top-[62px] z-20 overflow-hidden rounded-panel border border-gold/40 bg-[#071a13] text-[#f4efe2] shadow-lg">
      <style>{`@keyframes mba-pop{0%{transform:scale(1)}35%{transform:scale(1.3)}100%{transform:scale(1)}}.mba-pop{display:inline-block;animation:mba-pop .6s ease-out}`}</style>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {cote("A")}
        <div className="flex flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-[#3a2a05] to-[#6d520c] px-3 sm:px-6">
          <span className="text-[9px] tracking-[0.2em] text-[#f6d77a] uppercase">{barre.target <= 1 ? "Partie" : "Course à"}</span>
          <span className="text-[20px] font-extrabold text-white sm:text-[26px]">{barre.target <= 1 ? "sèche" : barre.target}</span>
          <span className="text-[10px] whitespace-nowrap text-[#f4e3b0]">{h ? `Manche ${h.manche}` : barre.status === "scheduled" ? "À lancer" : ""}</span>
        </div>
        {cote("B")}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-1.5 text-[10.5px] text-[#9fb0a6]">
        <span className="truncate">
          {[barre.contexte.titre ?? barre.contexte.label, barre.contexte.tour, barre.contexte.salle, barre.contexte.table ? `Table ${barre.contexte.table}` : ""].filter(Boolean).join(" · ")}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {barre.direct ? <span className="rounded-full bg-[#e5484d] px-2 py-0.5 font-bold text-white">DIRECT</span> : null}
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-jade" : "bg-warn")} />
          {connected ? "Synchronisé" : "Reconnexion…"}
        </span>
      </div>
    </div>
  );
}

function Anneau({ reste, duree }: { reste: number | null; duree: number }) {
  const r = reste ?? duree;
  const p = Math.max(0, Math.min(1, r / duree)) * 100;
  const urgent = r <= 10;
  return (
    <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full p-1.5" style={{ background: `conic-gradient(${urgent ? "#e5484d" : "#e0b43a"} 0 ${p}%, rgba(127,127,127,.18) ${p}% 100%)` }}>
      <div className={cn("grid h-full w-full place-items-center rounded-full bg-bg text-[32px] font-extrabold tabular-nums", urgent && "text-warn")}>{Math.ceil(r)}</div>
    </div>
  );
}

function BilleTouche({ n, choisie, tombee, onClick }: { n: number; choisie: boolean; tombee: boolean; onClick: () => void }) {
  const c = couleurBille(n);
  const rayee = n > 8;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={tombee}
      aria-label={`Bille ${n}${tombee ? " (empochée)" : ""}`}
      aria-pressed={choisie}
      className={cn(
        "press relative grid aspect-square w-full place-items-center overflow-hidden rounded-full transition",
        tombee ? "opacity-20 grayscale" : "shadow-[inset_-4px_-6px_10px_rgba(0,0,0,.35)]",
        choisie && "scale-105 ring-4 ring-gold ring-offset-2 ring-offset-bg",
      )}
      style={{
        background: rayee
          ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,.5), transparent 32%), linear-gradient(180deg, #f4f1ea 0 24%, ${c} 24% 76%, #f4f1ea 76% 100%)`
          : `radial-gradient(circle at 32% 28%, rgba(255,255,255,.5), transparent 32%), ${c}`,
      }}
    >
      <span className="grid h-[52%] w-[52%] place-items-center rounded-full bg-[#f4f1ea] text-[clamp(10px,2.6vw,17px)] font-bold text-[#111]">{n}</span>
    </button>
  );
}

function Bloc({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("flex flex-col rounded-panel border border-line bg-surface p-4", className)}>{children}</section>;
}

function Titre({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">{children}</h3>;
}

function Puce({ children, ton }: { children: React.ReactNode; ton: "warn" | "ink" | "muet" }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", ton === "warn" ? "bg-warn/15 text-warn" : ton === "ink" ? "bg-ink text-bg" : "border border-line text-muted")}>
      {children}
    </span>
  );
}

function Choix({ label, options, valeur, onChange }: { label: string; options: [string, string][]; valeur: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] text-muted">{label}</span>
      <div className={cn("grid gap-2", options.length > 2 ? "grid-cols-4" : "grid-cols-2")}>
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn("press h-11 truncate rounded-full border px-3 text-[13px]", valeur === v ? "border-gold bg-gold/15 font-semibold" : "border-line text-dim")}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Geste({
  children,
  onClick,
  disabled,
  principal,
  ton,
  petit,
  raccourci,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  principal?: boolean;
  ton?: "warn" | "noir";
  petit?: boolean;
  raccourci?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press relative flex items-center justify-center gap-2 rounded-card px-3 font-semibold transition disabled:opacity-45",
        petit ? "h-10 text-[12.5px]" : "h-14 text-[14px]",
        principal
          ? "bg-gold text-gold-ink"
          : ton === "warn"
            ? "border border-warn/45 text-warn"
            : ton === "noir"
              ? "bg-[#111] text-white"
              : "border border-line",
        className,
      )}
    >
      {children}
      {raccourci ? (
        <kbd className="absolute top-1 right-1.5 hidden rounded border border-current/25 px-1 text-[9px] font-normal opacity-60 lg:inline">{raccourci}</kbd>
      ) : null}
    </button>
  );
}
