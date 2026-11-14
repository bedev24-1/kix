"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MomoCheckout, type Method } from "@/components/mb/MomoCheckout";
import { Sheet } from "@/components/ui/Sheet";
import { useSnackbar } from "@/components/ui/Snackbar";
import { CheckIcon, ClockIcon, LockIcon, UserIcon } from "@/components/icons";
import { reserveTable } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { f, fcfa } from "@/lib/format";
import type { FloorTable } from "@/lib/queries";

const DURATIONS = [60, 90, 120, 180];

/** 90 → « 1 h 30 », 60 → « 1 h », 45 → « 45 min ». */
function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!h) return `${rest} min`;
  return rest ? `${h} h ${rest}` : `${h} h`;
}

/** Les 7 prochaines soirées : « Ce soir », « Demain », puis le jour de la semaine. */
function jours(): { cle: number; label: string }[] {
  const out: { cle: number; label: string }[] = [];
  const maintenant = new Date();
  // Avant 2 h du matin, « ce soir » est encore la soirée de la veille.
  const base = new Date(maintenant);
  if (base.getHours() < 2) base.setDate(base.getDate() - 1);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() + i * 86_400_000);
    const label = i === 0 ? "Ce soir" : i === 1 ? "Demain" : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
    out.push({ cle: d.getTime(), label });
  }
  return out;
}

/** Créneaux d'une soirée : de 16 h à 1 h 30 du matin, par demi-heure, sans ceux déjà passés. */
function slots(jour: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const debut = new Date(jour);
  debut.setHours(16, 0, 0, 0);
  for (let i = 0; i < 20; i++) {
    const d = new Date(debut.getTime() + i * 30 * 60_000);
    if (d.getTime() < Date.now() + 10 * 60_000) continue;
    out.push({ iso: d.toISOString(), label: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) });
  }
  return out;
}

type Etat = "libre" | "bientot" | "occupee" | "fermee";

/** L'état d'une table tel qu'on le montre : ce qui s'y passe maintenant, puis ce qui arrive. */
function etatDe(item: FloorTable): { etat: Etat; detail: string } {
  const { table: t, now, next, externe } = item;
  if (t.status === "closed") return { etat: "fermee", detail: "Fermée" };
  if (now || externe.maintenant || t.status === "occupied") return { etat: "occupee", detail: "En jeu" };
  // Seulement ce qui arrive dans les 8 prochaines heures : une réservation de demain ne change rien ce soir.
  const prochain = [next?.reservation.startsAt, externe.prochain].filter(Boolean).map((d) => new Date(d!)).filter((d) => +d - Date.now() < 8 * 3_600_000).sort((a, b) => +a - +b)[0];
  if (prochain) return { etat: "bientot", detail: heure(prochain) };
  return { etat: "libre", detail: "Libre" };
}
const heure = (d: Date) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
/** « Billard 12 » → « 12 » : la pastille ne montre que le numéro. */
const numero = (label: string) => (label.match(/\d+/) || [label.slice(0, 3)])[0];

const POINT: Record<Etat, string> = { libre: "bg-jade", bientot: "bg-gold", occupee: "bg-warn", fermee: "bg-muted/50" };
const LEGENDE: [Etat, string][] = [["libre", "Libre"], ["bientot", "Réservée plus tard"], ["occupee", "En jeu"], ["fermee", "Fermée"]];

export function BookTable({ floor, phone, caisse = true }: { floor: FloorTable[]; phone: string; caisse?: boolean }) {
  const { notify } = useSnackbar();
  const router = useRouter();
  const lesJours = useMemo(() => jours(), []);
  const [jour, setJour] = useState(lesJours[0].cle);
  const times = useMemo(() => slots(jour), [jour]);

  const [table, setTable] = useState<FloorTable | null>(null);
  const [startsAt, setStartsAt] = useState(slots(lesJours[0].cle)[0]?.iso ?? slots(lesJours[1].cle)[0]?.iso ?? new Date().toISOString());
  const choisirJour = (cle: number) => { setJour(cle); const t = slots(cle); if (t[0]) setStartsAt(t[0].iso); };
  const [minutes, setMinutes] = useState(90);
  const [players, setPlayers] = useState(2);
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const start = async (phoneNumber: string, method: Method) => {
    if (!table) return { ok: false as const, error: "Choisis une table" };
    const result = await reserveTable(table.table.id, startsAt, minutes, players, phoneNumber, method, note);
    if (!result.ok) return result;
    return { ok: true as const, reference: result.reference, instruction: result.instruction };
  };

  function onPaid() {
    const label = table?.table.label;
    setTable(null);
    notify("Table réservée", { detail: `${label} · ${duration(minutes)}`, tone: "jade" });
    router.refresh();
    router.push("/app/reservations");
  }

  /** Salle « paiement à la caisse » : la réservation est confirmée tout de suite, sans paiement en ligne. */
  async function confirmerSansPaiement() {
    if (!table) return;
    setEnvoi(true); setErreur("");
    const r = await reserveTable(table.table.id, startsAt, minutes, players, phone || "", "om", note).catch(() => ({ ok: false as const, error: "Réseau indisponible, réessaie." }));
    setEnvoi(false);
    if (!r.ok) { setErreur(r.error); return; }
    onPaid();
  }

  const etats = floor.map((item) => ({ item, ...etatDe(item) }));
  const libres = etats.filter((e) => e.etat === "libre").length;
  const tarifs = [...new Set(floor.map((x) => x.table.hourlyRate))].filter(Boolean);
  const estimation = table ? Math.round((table.table.hourlyRate * minutes) / 60) : 0;

  return (
    <>
      <div className="flex flex-col gap-3 rounded-panel border border-line bg-surface/60 p-3.5 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-[12.5px] text-dim">
            <span className="font-semibold text-ink">{libres}</span> sur {floor.length} libre{libres > 1 ? "s" : ""}
            {tarifs.length ? <span className="text-muted"> · {tarifs.map((x) => `${f(x)}/h`).join(" – ")}</span> : null}
            {caisse ? <span className="text-muted"> · paiement à la caisse</span> : null}
          </p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted">
            {LEGENDE.filter(([k]) => k !== "fermee" || etats.some((e) => e.etat === "fermee")).map(([k, l]) => (
              <li key={k} className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", POINT[k])} />{l}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
          {etats.map(({ item, etat, detail }) => {
            const t = item.table;
            const ouvert = etat !== "fermee";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => ouvert && setTable(item)}
                disabled={!ouvert}
                data-table={t.label}
                aria-label={`${t.label} · ${detail}${ouvert ? " · réserver" : ""}`}
                title={`${t.label} · ${t.seats} places · ${detail}`}
                className={cn(
                  "press group relative flex flex-col items-center justify-center gap-0.5 rounded-card border px-1 py-2.5 transition disabled:opacity-40",
                  table?.table.id === t.id ? "border-gold bg-gold/10" : "border-line bg-bg/40 hover:border-gold/50 hover:bg-surface-2",
                )}
              >
                <span className={cn("absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full", POINT[etat], etat === "occupee" && "live-dot")} />
                <span className="text-[17px] font-bold leading-none tabular-nums">{numero(t.label)}</span>
                <span className={cn("text-[10px] leading-tight", etat === "libre" ? "text-jade-text" : etat === "bientot" ? "text-gold-text" : "text-muted")}>{detail}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted">Touche une table pour la réserver{caisse ? " ; tu règles à la caisse après la partie" : ""}.</p>
      </div>

      <Sheet
        open={Boolean(table)}
        onClose={() => { setTable(null); setErreur(""); }}
        title={table ? table.table.label : ""}
        className="sm:max-w-[30rem]"
      >
        {table ? (
          <div className="flex flex-col gap-4">
            <p className="text-[12px] text-muted">
              {table.table.seats} places · {table.table.hourlyRate ? `${f(table.table.hourlyRate)}/h, décompté à la seconde` : "au jeton"}
              {etatDe(table).etat === "bientot" ? ` · déjà réservée à ${etatDe(table).detail}` : ""}
            </p>
            <Group label="Quel jour ?">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {lesJours.map((j) => (
                  <Pick key={j.cle} active={jour === j.cle} onClick={() => choisirJour(j.cle)}>
                    {j.label}
                  </Pick>
                ))}
              </div>
            </Group>

            <Group label="À quelle heure ?">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {times.length ? times.map((t) => (
                  <Pick key={t.iso} active={startsAt === t.iso} onClick={() => setStartsAt(t.iso)}>
                    {t.label}
                  </Pick>
                )) : <span className="py-2 text-[12.5px] text-muted">Plus de créneau ce soir : choisis un autre jour.</span>}
              </div>
            </Group>

            <Group label="Combien de temps ?">
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((m) => (
                  <Pick key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                    {duration(m)}
                  </Pick>
                ))}
              </div>
            </Group>

            <Group label="Combien de joueurs ?">
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 6].map((p) => (
                  <Pick key={p} active={players === p} onClick={() => setPlayers(p)}>
                    <UserIcon size={13} /> {p}
                  </Pick>
                ))}
              </div>
            </Group>

            <label className="flex flex-col gap-2">
              <span className="label-caps text-[11px] text-muted">Un mot pour la salle</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Table près du bar, anniversaire…"
                className="h-12 rounded-none border border-line bg-surface px-3.5 text-[14px] outline-none focus:border-gold"
              />
            </label>

            {caisse ? (
              <>
                <div className="flex flex-col gap-1.5 border border-line bg-surface px-3.5 py-3 text-[12.5px]">
                  <span className="flex justify-between gap-3"><span className="text-muted">{table.table.label} · {duration(minutes)}</span><span className="font-semibold">≈ {fcfa(estimation)}</span></span>
                  <span className="flex items-start gap-2 text-[11.5px] leading-5 text-muted">
                    <LockIcon size={13} className="mt-0.5 shrink-0" />
                    Rien à payer maintenant : tu règles à la caisse après la partie, au temps réellement joué. La table est gardée 20 minutes après l&apos;heure.
                  </span>
                </div>
                {erreur ? <p className="text-[12.5px] text-warn">{erreur}</p> : null}
                <button
                  type="button"
                  onClick={confirmerSansPaiement}
                  disabled={envoi}
                  className="press flex h-12 items-center justify-center gap-2 bg-gold font-semibold text-gold-ink transition disabled:opacity-60"
                >
                  <ClockIcon size={16} />
                  {envoi ? "Réservation…" : "Réserver la table"}
                </button>
              </>
            ) : (
              <>
                <p className="flex items-start gap-2 rounded-none border border-line bg-surface px-3.5 py-3 text-[11.5px] leading-5 text-muted">
                  <LockIcon size={13} className="mt-0.5 shrink-0" />
                  L&apos;acompte de {fcfa(table.table.deposit)} retient la table et se déduit de ta note à
                  l&apos;arrivée. Il reste acquis à la salle en cas d&apos;absence.
                </p>
                <MomoCheckout
                  amount={table.table.deposit}
                  defaultPhone={phone}
                  start={start}
                  onPaid={onPaid}
                  hint={`${table.table.label} · ${duration(minutes)}`}
                  label={`Retenir la table · ${fcfa(table.table.deposit)}`}
                />
              </>
            )}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="label-caps text-[11px] text-muted">{label}</span>
      {children}
    </div>
  );
}

function Pick({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] whitespace-nowrap transition",
        active ? "bg-gold font-semibold text-gold-ink" : "glass text-dim hover:text-ink",
      )}
    >
      {active ? <CheckIcon size={13} /> : null}
      {children}
    </button>
  );
}
