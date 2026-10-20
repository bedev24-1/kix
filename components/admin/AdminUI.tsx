import { cn } from "@/lib/cn";

/* Les écrans d'admin assument le rectangle : tableaux, champs et filets nets,
   pastilles réservées aux actions. */

export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] lg:text-[32px]">{title}</h1>
        {subtitle ? <p className="text-[13px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  // Les en-têtes descendent en variables CSS : sur téléphone, chaque cellule
  // les rappelle à gauche de sa valeur et la ligne devient une carte. Voir
  // `.tbl-cards` dans globals.css — aucune page n'a eu à être réécrite.
  const libelles = Object.fromEntries(
    head.map((cell, i) => [`--c${i + 1}`, cell ? JSON.stringify(cell) : '""']),
  ) as React.CSSProperties;

  return (
    <div className="tbl-cards overflow-x-auto border border-line" style={libelles}>
      <table className="w-full min-w-160 border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-line bg-surface">
            {head.map((cell) => (
              <th key={cell} className="px-4 py-3 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  min,
  max,
  list,
  hint,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  /** Borne basse d'un champ numérique : le navigateur la fait respecter aussi. */
  min?: number;
  max?: number;
  /** Un `<datalist>` de valeurs proposées, sans interdire les autres. */
  list?: string;
  /** Une ligne sous le champ, pour la règle qu'on ne devine pas. */
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        list={list}
        className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink outline-none focus:border-gold"
      />
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  rows = 3,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="rounded-none border border-line bg-surface px-3 py-2.5 text-[13px] text-ink outline-none focus:border-gold"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] tracking-[0.1em] text-muted uppercase">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        className="h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink outline-none focus:border-gold"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-bg text-ink">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Switch({ label, name, defaultChecked = true }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 self-end pb-2.5 text-[13px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--mb-accent)]" />
      {label}
    </label>
  );
}

// Le bouton d'envoi vit à part : il a besoin du navigateur pour savoir que le
// formulaire travaille, et le reste de ce fichier n'en a pas besoin.
export { SubmitButton } from "@/components/admin/SubmitButton";

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "gold" | "jade" | "warn" | "neutral";
  children: React.ReactNode;
}) {
  const tones = {
    gold: "bg-gold/15 text-gold-text border-gold/35",
    jade: "bg-jade/15 text-jade-text border-jade/35",
    warn: "bg-warn/15 text-warn border-warn/35",
    neutral: "bg-surface-2 text-dim border-line",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px]", tones[tone])}>
      {children}
    </span>
  );
}

/** Formulaire repliable : la liste reste lisible, l'édition tient sur place. */
export function Drawer({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="border border-line bg-surface open:pb-4">
      <summary className="cursor-pointer list-none px-4 py-3.5 text-[13px] font-semibold marker:hidden">
        {summary}
      </summary>
      <div className="px-4">{children}</div>
    </details>
  );
}
