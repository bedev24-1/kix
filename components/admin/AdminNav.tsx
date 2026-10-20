"use client";

import { DashNav, type NavItem } from "@/components/dash/DashNav";
import {
  BoltIcon,
  CalendarIcon,
  CartIcon,
  ChartIcon,
  CoinIcon,
  MapIcon,
  TableIcon,
  TargetIcon,
  TicketIcon,
  TrophyIcon,
  TruckIcon,
  UserIcon,
} from "@/components/icons";

/**
 * Quatorze pages, quatre places.
 *
 * L'administration les empilait toutes en pastilles au-dessus du contenu :
 * sur un téléphone, la moitié de l'écran partait en navigation avant qu'une
 * seule donnée n'apparaisse. Les quatre premières restent au pouce, le reste
 * attend derrière « Plus ».
 */
const items: NavItem[] = [
  { href: "/admin", label: "Tableau", Icon: ChartIcon, primary: true },
  { href: "/admin/commandes", label: "Commandes", Icon: TruckIcon },
  { href: "/admin/salles", label: "Salles", Icon: MapIcon },
  { href: "/admin/produits", label: "Produits", Icon: CartIcon },
  { href: "/admin/packs", label: "Packs", Icon: CoinIcon },
  { href: "/admin/evenements", label: "Événements", Icon: CalendarIcon },
  { href: "/admin/tables", label: "Tables", Icon: TableIcon },
  { href: "/admin/jetons", label: "Jetons", Icon: TicketIcon },
  { href: "/admin/tournois", label: "Tournois", Icon: TrophyIcon },
  { href: "/admin/abonnements", label: "Abonnements", Icon: BoltIcon },
  { href: "/admin/profils", label: "Profils & certification", Icon: UserIcon },
  { href: "/admin/cours", label: "Cours", Icon: TargetIcon },
  { href: "/admin/vendeurs", label: "Vendeurs", Icon: TruckIcon },
  { href: "/admin/retraits", label: "Retraits", Icon: CoinIcon },
  { href: "/admin/utilisateurs", label: "Utilisateurs", Icon: UserIcon },
];

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  return <DashNav items={items} mobile={mobile} />;
}
