// Jeu d'icônes maison : trait 1.8, grille 24, couleur héritée (currentColor).
type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({
  size = 20,
  className,
  strokeWidth = 1.8,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);

export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7.5 9 5l6 2.5L21 5v11.5L15 19l-6-2.5L3 19z" />
    <path d="M9 5v11.5M15 7.5V19" />
  </Svg>
);

export const QrIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <path d="M13.5 13.5h3v3h-3zM20.5 13.5v3M17.5 20.5h3M13.5 20.5h1" />
  </Svg>
);

export const CartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h2.2l2 10.5h10L20 8H7" />
    <circle cx="9.5" cy="19.5" r="1.4" />
    <circle cx="17.5" cy="19.5" r="1.4" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.7" />
    <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
  </Svg>
);

export const BellIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-2 8-2 8h16s-2-1-2-8" />
    <path d="M10.5 20.5a2 2 0 0 0 3 0" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Svg>
);

export const CoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6v8.8M9.6 9.6h4.2a1.9 1.9 0 0 1 0 3.8h-4M9.6 13.4h4.4" />
  </Svg>
);

export const TicketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 9.2V6.6a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1v2.6a2.8 2.8 0 0 0 0 5.6v2.6a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-2.6a2.8 2.8 0 0 0 0-5.6z" />
  </Svg>
);

export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v4.2a5 5 0 0 1-10 0z" />
    <path d="M7 5.4H4.6v1.4A3.4 3.4 0 0 0 7 10M17 5.4h2.4v1.4A3.4 3.4 0 0 1 17 10" />
    <path d="M12 13.4V17M8.6 20h6.8" />
  </Svg>
);

export const BoltIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 3 5 13.5h6L11 21l8-10.5h-6z" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6V12l3 1.8" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="3" />
    <path d="M8 3.4v3.6M16 3.4v3.6M3.6 10.4h16.8" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg strokeWidth={3} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const MinusIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M14 6l-6 6 6 6" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg strokeWidth={2.6} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const SlidersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </Svg>
);

export const TruckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h10v9H3zM13 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </Svg>
);

export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v11M8.2 7.3 12 3.5l3.8 3.8" />
    <path d="M5.5 13v6.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V13" />
  </Svg>
);

export const BookmarkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />
  </Svg>
);

export const ChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19V11M12 19V5M19 19v-6" />
  </Svg>
);

export const TargetIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <circle cx="12" cy="12" r="3.2" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10" width="15" height="10" rx="2.4" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
);

export const TableIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.4" y="6.4" width="17.2" height="11.2" rx="2.4" />
    <circle cx="8" cy="10" r="1" />
    <circle cx="16" cy="14" r="1" />
  </Svg>
);

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M18.9 14.2a1.6 1.6 0 0 0 .3 1.8l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a1.9 1.9 0 0 1-3.8 0v-.2a1.6 1.6 0 0 0-2.8-1.2l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a1.9 1.9 0 0 1 0-3.8h.2a1.6 1.6 0 0 0 1.2-2.8l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a1.9 1.9 0 0 1 3.8 0v.2a1.6 1.6 0 0 0 2.8 1.2l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a1.9 1.9 0 0 1 0 3.8h-.2z" />
  </Svg>
);

/**
 * Dégradé du monogramme, défini une seule fois pour tout le document.
 *
 * Un `<defs>` par instance donnerait plusieurs `id="mbGold"` : le navigateur ne
 * retient que le premier, et quand celui-ci se trouve dans une branche
 * `display:none` (la colonne vitrine cachée sur mobile), le monogramme visible
 * se peint dans le vide. Ce bloc vit dans le layout racine, toujours rendu.
 */
export const BrandDefs = () => (
  <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
    <defs>
      <linearGradient id="mbGold" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#F4DE9A" />
        <stop offset="0.45" stopColor="#D9B450" />
        <stop offset="1" stopColor="#9A7519" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * L'emblème Master Break : le triangle et la queue du logo officiel
 * (public/brand/logo.png), découpé sans retouche dans public/brand/emblem.png.
 */
export const MasterMark = ({ size = 30, className }: { size?: number; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- petite image fixe, servie telle quelle
  <img
    src="/brand/emblem.png"
    alt=""
    aria-hidden="true"
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: "contain" }}
  />
);
