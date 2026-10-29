import { SearchIcon } from "@/components/icons";

/**
 * La recherche de l'accueil, reprise partout : une barre fine dont la loupe
 * est une bulle à l'intérieur. Discrète au repos, elle passe à l'or dès qu'on
 * tape et devient le bouton. Un simple formulaire GET.
 */
export function RechercheBulle({
  action,
  placeholder,
  defaultValue,
  caches,
  className,
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  /** Champs cachés envoyés avec la recherche (le rayon, par exemple). */
  caches?: Record<string, string>;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={`group flex h-10 items-center rounded-full border border-ink/12 bg-ink/5 pr-1 pl-4 transition-colors has-[input:not(:placeholder-shown)]:border-gold/55 ${className ?? ""}`}
    >
      {Object.entries(caches ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="grow">
        <span className="sr-only">Rechercher</span>
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink/50"
        />
      </label>
      <button
        aria-label="Rechercher"
        className="press grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/10 text-ink transition-colors group-has-[input:not(:placeholder-shown)]:bg-gold group-has-[input:not(:placeholder-shown)]:text-gold-ink"
      >
        <SearchIcon size={15} />
      </button>
    </form>
  );
}
