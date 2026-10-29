import Link from "next/link";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/mb/AppHeader";
import { CoursBannieres, type CoursCarte } from "@/components/mb/CoursBanniere";
import { CartBar } from "@/components/shop/CartBar";
import { Recuperation } from "@/components/shop/Recuperation";
import { RechercheBulle } from "@/components/ui/RechercheBulle";
import { EnTeteShop } from "@/components/shop/decouvrir/EnTeteShop";
import { BanniereCours, type CoursVitrine } from "@/components/shop/decouvrir/BanniereCours";
import { GrilleArticles, RangeeVendus, type ArticleVitrine } from "@/components/shop/decouvrir/Rayons";
import { EcranImmersif } from "@/components/shop/decouvrir/EcranImmersif";
import { CapIcon, GiftIcon, SparkIcon, TargetIcon, VapeIcon } from "@/components/icons";
import { getBalance, getProducts, getUnreadCount } from "@/lib/queries";
import { plusVendus } from "@/lib/avis";
import { getCourses, NIVEAUX } from "@/lib/courses";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/cn";
import { f } from "@/lib/format";
import type { Product } from "@/db";

export const metadata = { title: "Master Shop" };

const RAYONS = [
  { id: "toi", label: "Pour toi", Icon: SparkIcon },
  { id: "vapes", label: "Vapes", Icon: VapeIcon },
  { id: "billard", label: "Billard", Icon: TargetIcon },
  { id: "cours", label: "Cours", Icon: CapIcon },
  { id: "cadeaux", label: "Cadeaux", Icon: GiftIcon },
] as const;
type Rayon = (typeof RAYONS)[number]["id"];

/** Les cartes Master Break se vendent comme un article, mais forment leur propre rayon. */
const estCadeau = (p: Product) => /^carte\b/i.test(p.name) || /cadeau/i.test(p.badgeLabel ?? "");

const versVitrine = (p: Product, vendus?: number): ArticleVitrine => ({
  slug: p.slug,
  nom: p.name,
  detail: p.detail,
  prix: p.price,
  image: p.image,
  badge: p.badgeLabel,
  vendus,
});

function Titre({ titre, lien, href }: { titre: string; lien?: string; href?: string }) {
  return (
    <div className="-mb-1 flex items-baseline justify-between gap-3 pt-2">
      <h2 className="text-[15.5px] font-extrabold tracking-[-0.01em] lg:text-[18px]">{titre}</h2>
      {lien && href ? (
        <Link href={href} className="press text-[12px] text-gold-text">
          {lien}
        </Link>
      ) : null}
    </div>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat, q } = await searchParams;
  const rayon: Rayon = RAYONS.some((r) => r.id === cat) ? (cat as Rayon) : "toi";
  const cherche = (q ?? "").trim();
  const user = await requireUser();
  const depuisAccueil = (await cookies()).get("mb_depuis")?.value === "accueil";

  const [tous, unread, solde, cours, vendus] = await Promise.all([
    getProducts(undefined, cherche),
    getUnreadCount(user.id),
    getBalance(user.id),
    getCourses(),
    plusVendus(6),
  ]);

  const carteCadeau = tous.find(estCadeau);
  const billard = tous.filter((p) => p.category === "billard" && !estCadeau(p));
  const coursVitrine: CoursVitrine[] = cours.map(({ course, venue }) => ({
    slug: course.slug,
    titre: course.title,
    niveau: NIVEAUX[course.level] ?? course.level,
    ligne: [course.coachName, venue?.name, course.schedule].filter(Boolean).join(" · "),
    prix: f(course.price),
    image: course.image,
  }));
  const rayonActuel =
    rayon === "vapes"
      ? tous.filter((p) => p.category === "vapes" && !estCadeau(p))
      : rayon === "billard"
        ? billard
        : rayon === "cadeaux"
          ? tous.filter(estCadeau)
          : tous;

  return (
    <>
      <AppHeader user={user} unread={unread} title="Master Shop" subtitle="Vapes, puffs et matériel de billard livrés à Douala ou retirés en salle." />
      <EnTeteShop user={{ name: user.name, avatar: user.avatar }} unread={unread} solde={solde} depuisAccueil={depuisAccueil} />

      <RechercheBulle
        action="/app/shop"
        placeholder="Cherche, ou décris ce qu'il te faut"
        defaultValue={cherche}
        caches={rayon === "toi" ? undefined : { cat: rayon }}
        className="lg:max-w-xl"
      />

      <nav aria-label="Rayons" className="-mx-5 flex gap-[7px] overflow-x-auto px-5 [scrollbar-width:none] md:-mx-7 md:px-7 lg:mx-0 lg:px-0">
        {RAYONS.map(({ id, label, Icon }) => (
          <Link
            key={id}
            href={id === "toi" ? "/app/shop" : `/app/shop?cat=${id}`}
            aria-current={rayon === id ? "page" : undefined}
            className={cn(
              "press flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-[13px] text-[12.5px]",
              rayon === id ? "border-[#f3eee2] bg-[#f3eee2] font-bold text-[#0b1a12]" : "border-ink/16 text-ink/85",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>

      {cherche ? (
        <>
          <p className="text-[13px] text-muted">
            {tous.length === 0
              ? `Rien pour « ${cherche} » — essaie un autre mot.`
              : `${tous.length} article${tous.length > 1 ? "s" : ""} pour « ${cherche} », tous rayons confondus.`}
          </p>
          <GrilleArticles articles={tous.map((p) => versVitrine(p))} />
        </>
      ) : rayon === "toi" ? (
        <>
          <Titre titre="Les plus vendus cette semaine" lien="Tout voir" href="/app/shop?cat=vapes" />
          <RangeeVendus articles={vendus.map(({ produit, vendus: n }) => versVitrine(produit, n))} />

          {coursVitrine.length ? (
            <>
              <Titre titre="Pour progresser au billard" lien="Les cours" href="/app/cours" />
              <BanniereCours cours={coursVitrine} />
            </>
          ) : null}

          {billard.length ? (
            <>
              <Titre titre="Populaire en billard" lien="Voir tout" href="/app/shop?cat=billard" />
              <GrilleArticles articles={billard.slice(0, 2).map((p) => versVitrine(p))} />
            </>
          ) : null}

          <EcranImmersif
            hrefCollection="/app/shop?cat=billard"
            hrefCadeau={carteCadeau ? `/app/shop/${carteCadeau.slug}` : "/app/shop?cat=cadeaux"}
          />
        </>
      ) : rayon === "cours" ? (
        <>
          <BanniereCours cours={coursVitrine} />
          <CoursBannieres cartes={cours.map((c): CoursCarte => ({ ...c, inscrits: Number(c.inscrits) }))} />
        </>
      ) : (
        <>
          <Recuperation />
          <GrilleArticles articles={rayonActuel.map((p) => versVitrine(p))} />
        </>
      )}

      <CartBar />
    </>
  );
}
