"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Product, ProductImage, ProductVariant } from "@/db";
import { Photo } from "@/components/ui/Photo";
import { useSnackbar } from "@/components/ui/Snackbar";
import {
  AwardIcon,
  BoltIcon,
  CartIcon,
  HomeIcon,
  QrIcon,
  UserIcon,
  XIcon,
  ChevronLeftIcon,
  FlameIcon,
  ShareIcon,
  LockIcon,
  MinusIcon,
  PhoneIcon,
  PinIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  StoreIcon,
  SwapIcon,
  TruckIcon,
} from "@/components/icons";
import { ATOUTS, type Atout } from "@/lib/atouts";
import { addToCart, useCart } from "@/lib/cart";
import { cn } from "@/lib/cn";
import { f } from "@/lib/format";
import type { ResumeAvis, VendeurVue } from "@/lib/avis";
import type { CartePromo } from "@/lib/banniere";
import { Banniere } from "./Banniere";
import { Portant } from "./Portant";
import { Etoiles, SectionAvis } from "./Avis";

const ICONES = { award: AwardIcon, swap: SwapIcon, lock: LockIcon, shield: ShieldIcon, spark: SparkIcon } as const;

type Autre = { slug: string; name: string; price: number; image: string };

/**
 * La fiche d'un article, version « vitrine claire ».
 *
 * En haut : le portant des photos, les déclinaisons, le nom et le prix. En bas,
 * un tiroir noir qui porte le bouton d'achat ; on le tire vers le haut pour
 * voir les atouts et les infos clés. Et la page elle-même se lit en défilant,
 * comme une boutique en ligne : description, fiche technique, vendeur, avis.
 */
export function Fiche({
  produit,
  galerie,
  declinaisons,
  rayon,
  avis,
  vendeur,
  peutNoter,
  monAvis,
  autres,
  livraison,
  promos,
  vendus,
}: {
  produit: Product;
  galerie: ProductImage[];
  declinaisons: ProductVariant[];
  rayon: string;
  avis: ResumeAvis;
  vendeur: VendeurVue;
  peutNoter: boolean;
  monAvis: { note: number; texte: string } | null;
  autres: Autre[];
  livraison: number;
  promos: CartePromo[];
  vendus: number;
}) {
  const { notify } = useSnackbar();
  const { count } = useCart();
  const [choisie, setChoisie] = useState<ProductVariant | null>(
    declinaisons.find((d) => d.stock > 0) ?? declinaisons[0] ?? null,
  );
  const [index, setIndex] = useState(0);
  const [qte, setQte] = useState(1);
  const [ouvert, setOuvert] = useState(false);
  const [toutLire, setToutLire] = useState(false);
  const [favori, basculerFavori] = useFavori(produit.slug);

  // La photo de la déclinaison choisie passe devant ; la vignette ensuite.
  const photos = [choisie?.image, produit.image, ...galerie.map((g) => g.url)].filter(
    (url, i, tout): url is string => Boolean(url) && tout.indexOf(url) === i,
  );
  const prix = choisie?.price ?? produit.price;
  const stock = choisie ? choisie.stock : produit.stock;
  const epuise = stock <= 0;

  // Partager : la feuille native du téléphone, sinon WhatsApp directement.
  const partager = async () => {
    const url = window.location.href.split("?")[0];
    const texte = `${produit.name} · ${f(prix)} sur Master Break`;
    try {
      if (navigator.share) return await navigator.share({ title: produit.name, text: texte, url });
    } catch {
      return; // partage annulé
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texte}\n${url}`)}`, "_blank", "noopener");
  };

  const ajouter = () => {
    const nom = choisie ? `${produit.name} · ${choisie.name}` : produit.name;
    if (epuise) return notify("Rupture de stock", { detail: nom, tone: "warn" });
    addToCart(produit.slug, qte, choisie?.id ?? null);
    notify("Ajouté au panier", { detail: `${qte} × ${nom} · ${f(prix * qte)}` });
  };

  // Le bandeau collant apparaît quand le nom et le prix sortent de l'écran.
  const repere = useRef<HTMLDivElement>(null);
  const [colle, setColle] = useState(false);
  useEffect(() => {
    const node = repere.current;
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => setColle(!e.isIntersecting && e.boundingClientRect.top < 0));
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const atouts = (produit.atouts ?? []).filter((a): a is Atout => a in ATOUTS);
  const specs = produit.specs ?? [];

  const bouton = (
    <div className="flex h-14 items-center gap-2 rounded-full bg-[#e0b43a] pr-1.5 pl-2 text-[#1a1405]">
      <button type="button" aria-label="Un de moins" onClick={() => setQte((q) => Math.max(1, q - 1))} className="press grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-[#1a1405]/80">
        <MinusIcon size={14} />
      </button>
      <span className="w-5 text-center text-[15px] font-extrabold tabular-nums">{qte}</span>
      <button
        type="button"
        aria-label="Un de plus"
        onClick={() => setQte((q) => Math.min(Math.max(stock, 1), q + 1))}
        className="press grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-[#1a1405]/80"
      >
        <PlusIcon size={14} />
      </button>
      <button type="button" onClick={ajouter} className="press flex h-full grow items-center justify-between gap-2 pl-2 text-[15px] font-extrabold">
        {epuise ? "Rupture" : "Ajouter"}
        <span className="rounded-full bg-[#1a1405] px-3.5 py-2.5 text-[14px] whitespace-nowrap text-[#e0b43a] tabular-nums">{f(prix * qte)}</span>
      </button>
    </div>
  );

  const lesPlus = (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[18px] font-extrabold">Les +</span>
        {avis.total > 0 ? (
          <span className="flex items-center gap-1.5 text-[12px] text-[#e0b43a]">
            {avis.moyenne.toLocaleString("fr-FR")} <Etoiles note={avis.moyenne} taille={11} />
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 text-center text-[11.5px] text-[#c9d0cb]">
        {atouts.map((a) => {
          const Icone = ICONES[ATOUTS[a].icone];
          return <Atout key={a} icone={<Icone size={18} />} label={ATOUTS[a].label} />;
        })}
        <Atout icone={<TruckIcon size={18} />} label="Livré ce soir" />
        <Atout icone={<PinIcon size={18} />} label="Retrait 2 h en salle" />
        <Atout icone={<PhoneIcon size={18} />} label="MoMo · Orange Money" />
      </div>
      <dl className="flex flex-col border-t border-[#26302b] text-[12.5px]">
        {specs.slice(0, 2).map((s) => (
          <Ligne key={s.l} l={s.l} v={s.v} />
        ))}
        <Ligne
          l="En stock"
          v={
            <span className={epuise ? "text-[#ff8a8d]" : "text-[#6fd39b]"}>
              {epuise ? "Rupture" : `${stock}${choisie ? ` · ${choisie.name}` : ""}`}
            </span>
          }
        />
        <Ligne l="Livraison Douala" v={`${f(livraison)} · avant 20 h`} />
      </dl>
    </div>
  );

  return (
    <div className="-mx-5 -mt-4 -mb-32 min-h-dvh bg-[#f4efe2] px-5 pt-4 pb-44 text-[#0e1512] md:-mx-7 md:-mt-6 md:px-7 md:pt-6 lg:mx-0 lg:mt-0 lg:mb-0 lg:rounded-[28px] lg:px-10 lg:pt-8 lg:pb-12">
      {/* Bandeau collant : l'article ne quitte jamais l'écran. */}
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-30 mx-auto flex max-w-[430px] items-center gap-2.5 border-b border-[#e2dccf] bg-[#f4efe2]/95 px-5 py-2.5 backdrop-blur transition md:max-w-[46rem] lg:hidden",
          colle ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[9px]">
          <Photo src={photos[index] ?? produit.image} alt="" fill sizes="36px" className="object-cover" />
        </span>
        <b className="min-w-0 grow truncate text-[13px]">
          {produit.name}
          {choisie ? ` · ${choisie.name}` : ""}
        </b>
        <span className="text-[15px] font-extrabold text-[#b9893b] tabular-nums">{f(prix)}</span>
      </div>

      {/* En-tête compact : la place va à la photo. */}
      <div className="flex items-center gap-2.5">
        <Link href="/app/shop" aria-label="Retour à la boutique" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d8d2c3]">
          <ChevronLeftIcon size={18} />
        </Link>
        <span className="flex shrink-0 flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-[0.02em] uppercase lg:text-[20px]">{rayon}</span>
          <span className="mt-1 text-[10px] text-[#b9893b]">
            <Link href="/app/shop">Shop</Link> › {rayon}
          </span>
        </span>
        <Banniere cartes={promos} />
        <Link href="/app/panier" aria-label="Panier" className="press relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d8d2c3]">
          <CartIcon size={18} />
          {count > 0 ? (
            <span className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e0b43a] px-1 text-[10px] font-extrabold text-[#1a1405]">{count}</span>
          ) : null}
        </Link>
      </div>

      <div className="mt-2 grid gap-x-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-8">
          <Portant
            photos={photos}
            index={Math.min(index, photos.length - 1)}
            onIndex={setIndex}
            nom={produit.name}
            badge={produit.badgeLabel ? { label: produit.badgeLabel, tone: produit.badgeTone } : null}
            favori={favori}
            onFavori={basculerFavori}
          />
        </div>

        <div className="flex flex-col">
          {declinaisons.length > 0 ? (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-1 text-[15px] font-bold [scrollbar-width:none] lg:mt-2">
              {declinaisons.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={choisie?.id === d.id}
                  onClick={() => {
                    setChoisie(d);
                    setIndex(0);
                    setQte(1);
                  }}
                  className={cn(
                    "shrink-0 border-b-2 pb-1 whitespace-nowrap transition",
                    choisie?.id === d.id ? "border-[#b9893b] text-[#0e1512]" : "border-transparent text-[#7a807c]",
                    d.stock <= 0 && "line-through opacity-50",
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
          ) : null}

          {/* Le nom sur toute la largeur ; le prix face à la note et à l'accroche,
              pour qu'il n'y ait pas de vide sous lui ; puis les infos qui
              décident l'achat (stock, livraison, retrait). */}
          <div ref={repere} className="mt-3">
            {/* Le titre, et à côté : les ventes de la semaine et le partage.
                Un titre long prend la ligne : les deux passent dessous. */}
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <h1 className="min-w-0 text-[21px] leading-[1.12] font-extrabold lg:text-[30px]">{produit.name}</h1>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {vendus > 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-[#0e1512] px-2.5 py-1.5 text-[10.5px] font-bold whitespace-nowrap text-[#f6d77a]">
                    <FlameIcon size={13} /> {vendus} vendu{vendus > 1 ? "s" : ""} · 7 j
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Partager cet article"
                  onClick={partager}
                  className="press grid h-[34px] w-[34px] place-items-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.08)]"
                >
                  <ShareIcon size={15} />
                </button>
              </span>
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                {avis.total > 0 ? (
                  <a href="#avis" className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#b9893b]">
                    <Etoiles note={avis.moyenne} taille={11} /> {avis.moyenne.toLocaleString("fr-FR")} · {avis.total} avis
                  </a>
                ) : (
                  <span className="text-[11.5px] text-[#8a8f8b]">Pas encore d&apos;avis</span>
                )}
                {produit.detail ? <p className="line-clamp-2 text-[12.5px] leading-[1.35] text-[#58605b]">{produit.detail}</p> : null}
              </div>
              <span className="shrink-0 text-[32px] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap text-[#b9893b] tabular-nums lg:text-[44px]">
                {f(prix)}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold">
              <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1.5", epuise ? "bg-[#fbe9e7] text-[#c9463d]" : "bg-[#e3f1e8] text-[#2f8f5b]")}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {epuise ? "Rupture" : `${stock} en stock${choisie ? ` · ${choisie.name}` : ""}`}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[#3d4440]">
                <TruckIcon size={13} /> Livré ce soir · {f(livraison)}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[#3d4440]">
                <PinIcon size={13} /> Retrait 2 h
              </span>
            </div>
          </div>

          {/* Sur grand écran, pas de tiroir : les atouts et le bouton sont posés là. */}
          <div className="mt-6 hidden flex-col gap-5 rounded-[26px] bg-[#0e1512] p-6 text-[#f4efe2] lg:flex">
            {lesPlus}
            {bouton}
          </div>

          <Section titre="Description">
            <p className={cn("text-[13.5px] leading-6 text-pretty text-[#3d4440]", !toutLire && "line-clamp-4")}>
              {produit.description || produit.detail || "Le vendeur n'a pas encore décrit cet article."}
            </p>
            {(produit.description ?? "").length > 220 ? (
              <button type="button" onClick={() => setToutLire((v) => !v)} className="mt-1 self-start text-[12.5px] font-bold text-[#b9893b]">
                {toutLire ? "Lire moins" : "Lire plus"}
              </button>
            ) : null}
          </Section>

          {specs.length > 0 ? (
            <Section titre="Fiche technique">
              <div className="grid grid-cols-2 gap-2">
                {specs.map((s) => (
                  <div key={s.l} className="rounded-[14px] bg-white px-3 py-2.5 text-[11.5px] text-[#6a706c]">
                    {s.l}
                    <b className="mt-0.5 block text-[14px] text-[#0e1512]">{s.v}</b>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section titre="Vendu par">
            <div className="flex items-center gap-3 rounded-[18px] bg-[#0e1512] p-3.5 text-[#f4efe2]">
              {vendeur.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vendeur.avatar} alt="" className="h-11 w-11 rounded-full border-[1.5px] border-[#e0b43a] object-cover" />
              ) : (
                <span className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-[#e0b43a] text-[#e0b43a]">
                  <StoreIcon size={20} />
                </span>
              )}
              <span className="min-w-0 grow">
                <b className="block truncate text-[14.5px]">{vendeur.nom}</b>
                <span className="block text-[11px] text-[#9fb0a6]">
                  {vendeur.avis > 0 ? `${vendeur.note.toLocaleString("fr-FR")} / 5 · ` : ""}
                  {vendeur.ventes} vente{vendeur.ventes > 1 ? "s" : ""}
                  {vendeur.maison ? " · la boutique Master Break" : ""}
                </span>
              </span>
              <Link href="/app/shop" className="shrink-0 rounded-full border border-[#e0b43a]/40 px-3 py-1.5 text-[11.5px] text-[#e0b43a]">
                Voir la boutique
              </Link>
            </div>
          </Section>

          <Section titre={`Avis${avis.total ? ` · ${avis.total}` : ""}`} id="avis">
            <SectionAvis productId={produit.id} resume={avis} peutNoter={peutNoter} monAvis={monAvis} />
          </Section>

          {autres.length > 0 ? (
            <Section titre="Dans le même rayon">
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:-mx-7 md:px-7 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
                {autres.map((o) => (
                  <Link key={o.slug} href={`/app/shop/${o.slug}`} className="w-36 shrink-0 overflow-hidden rounded-[18px] bg-white lg:w-full">
                    <span className="relative block h-28">
                      <Photo src={o.image} alt={o.name} fill sizes="160px" className="object-cover" />
                    </span>
                    <span className="flex flex-col gap-1 px-3 py-2.5">
                      <span className="line-clamp-2 text-[12px] leading-4 font-semibold">{o.name}</span>
                      <span className="text-[12.5px] font-extrabold text-[#b9893b]">{f(o.price)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>

      {/* Le tiroir, sur téléphone et tablette. */}
      {ouvert ? <button type="button" aria-label="Fermer les détails" onClick={() => setOuvert(false)} className="fixed inset-0 z-30 bg-[#070a09]/45 lg:hidden" /> : null}
      <Tiroir ouvert={ouvert} onOuvert={setOuvert}>
        <div className={cn("grid transition-[grid-template-rows] duration-300", ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="max-h-[52dvh] overflow-y-auto pb-4">{lesPlus}</div>
          </div>
        </div>
        {bouton}
      </Tiroir>
    </div>
  );
}

/* La bulle : la barre de navigation repliée, posée sur le tiroir. */
const MENU = [
  { href: "/app", label: "Accueil", Icon: HomeIcon },
  { href: "/direct", label: "Direct", Icon: BoltIcon },
  { href: "/app/pass", label: "Pass", Icon: QrIcon, qr: true },
  { href: "/app/shop", label: "Shop", Icon: CartIcon },
  { href: "/app/rewards", label: "Profil", Icon: UserIcon },
];

/** Diamètre de la bulle, et le jour laissé tout autour par l'encoche. */
const BULLE = 44;
const JOUR = 6;

function Tiroir({ ouvert, onOuvert, children }: { ouvert: boolean; onOuvert: (v: boolean) => void; children: React.ReactNode }) {
  const depart = useRef<number | null>(null);
  const [menu, setMenu] = useState(false);
  const centre = 24 + BULLE / 2; // distance du centre de la bulle au bord droit
  const encoche = `radial-gradient(circle ${BULLE / 2 + JOUR + 1}px at calc(100% - ${centre}px) 0, transparent ${BULLE / 2 + JOUR}px, #000 ${BULLE / 2 + JOUR + 1}px)`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] md:max-w-[46rem] lg:hidden">
      {/* Le menu déroulé a la largeur et la hauteur du bouton d'achat, juste
          au-dessus de lui ; la bulle reste posée sur son extrémité droite. */}
      {menu ? (
        <nav
          aria-label="Navigation"
          className="absolute inset-x-4 z-10 flex h-14 origin-right items-center justify-between rounded-full border-[1.5px] border-[#e0b43a] bg-[#0e1512] pl-3 shadow-[0_10px_24px_rgba(0,0,0,.3)] motion-safe:animate-[mb-menu_.3s_cubic-bezier(.2,.8,.3,1)_both]"
          style={{ top: -28, paddingRight: 24 + BULLE - 16 + 8 }}
        >
          {MENU.map(({ href, label, Icon, qr }) =>
            qr ? (
              <Link key={href} href={href} aria-label="Mon Master Pass" className="press grid h-10 w-10 place-items-center rounded-full bg-[#e0b43a] text-[#1a1405]">
                <Icon size={20} />
              </Link>
            ) : (
              <Link
                key={href}
                href={href}
                className={cn("press flex w-11 flex-col items-center gap-0.5 text-[9.5px]", href === "/app/shop" ? "text-[#e0b43a]" : "text-[#9fb0a6]")}
              >
                <Icon size={19} />
                {label}
              </Link>
            ),
          )}
        </nav>
      ) : null}
      {/* La bulle vit au-dessus du bord du tiroir : elle monte et descend avec lui. */}
      <div className="absolute right-6 z-20 motion-safe:animate-[mb-bulle_.45s_.12s_cubic-bezier(.2,.8,.3,1.2)_both]" style={{ top: -BULLE / 2 }}>
        {/* La bulle reste dans son encoche : fermée, c'est le logo ; ouverte, la croix. */}
        <button
          type="button"
          aria-label={menu ? "Refermer le menu" : "Ouvrir le menu"}
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="press relative grid place-items-center rounded-full border-[1.5px] border-[#e0b43a] bg-[#0e1512] text-[#f4efe2] shadow-[0_0_12px_rgba(0,0,0,.22)]"
          style={{ width: BULLE, height: BULLE }}
        >
          {menu ? (
            <XIcon size={17} className="motion-safe:animate-[mb-tourne_.3s_ease-out]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/emblem.png" alt="" className="h-6 w-6" />
          )}
        </button>
      </div>

      <div
        className="rounded-t-[30px] bg-[#0e1512] px-4 pt-2 pb-[calc(.9rem+env(safe-area-inset-bottom))] text-[#f4efe2] shadow-[0_-10px_30px_rgba(0,0,0,.18)] motion-safe:animate-[mb-tiroir_.35s_cubic-bezier(.2,.7,.3,1)_both]"
        style={{ WebkitMaskImage: encoche, maskImage: encoche }}
      >
        <button
          type="button"
          aria-expanded={ouvert}
          aria-label={ouvert ? "Replier les détails" : "Voir les détails"}
          onClick={() => onOuvert(!ouvert)}
          onPointerDown={(e) => {
            depart.current = e.clientY;
          }}
          onPointerUp={(e) => {
            const d = depart.current;
            depart.current = null;
            if (d === null) return;
            const dy = e.clientY - d;
            if (dy < -25) onOuvert(true);
            else if (dy > 25) onOuvert(false);
          }}
          className="flex w-full touch-none flex-col items-center gap-1 pb-2.5"
        >
          <span className="h-[5px] w-12 rounded-full bg-[#59625d]" />
          {ouvert ? null : <span className="text-[10.5px] text-[#8a978f]">Glisse pour les détails</span>}
        </button>
        {children}
      </div>
    </div>
  );
}

function Section({ titre, id, children }: { titre: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-7 flex scroll-mt-20 flex-col">
      <h2 className="mb-2.5 text-[11.5px] font-bold tracking-[0.16em] text-[#b9893b] uppercase">{titre}</h2>
      {children}
    </section>
  );
}

function Atout({ icone, label }: { icone: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="grid h-11 w-11 place-items-center rounded-full border border-[#33403a] text-[#e0b43a]">{icone}</span>
      {label}
    </div>
  );
}

function Ligne({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#26302b] py-2.5">
      <dt className="text-[#9fb0a6]">{l}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

/* Favoris : une commodité propre à ce téléphone, gardée dans le navigateur. */
const CLE_FAVORIS = "mb.favoris";
const lireFavoris = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(CLE_FAVORIS) ?? "[]") as string[];
  } catch {
    return [];
  }
};
const ecouteurs = new Set<() => void>();

function useFavori(slug: string): [boolean, () => void] {
  const favori = useSyncExternalStore(
    (cb) => {
      ecouteurs.add(cb);
      return () => ecouteurs.delete(cb);
    },
    () => lireFavoris().includes(slug),
    () => false,
  );
  const basculer = () => {
    const liste = lireFavoris();
    const suivante = liste.includes(slug) ? liste.filter((s) => s !== slug) : [...liste, slug];
    try {
      localStorage.setItem(CLE_FAVORIS, JSON.stringify(suivante));
    } catch {
      /* stockage indisponible : le cœur ne se souviendra pas */
    }
    ecouteurs.forEach((cb) => cb());
  };
  return [favori, basculer];
}
