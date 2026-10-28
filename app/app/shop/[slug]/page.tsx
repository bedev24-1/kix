import { notFound } from "next/navigation";
import { Fiche } from "@/components/shop/fiche/Fiche";
import { achatDuClient, avisDuClient, avisDuProduit, vendeurDe } from "@/lib/avis";
import { getFicheProduit, getProduct, getProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { DELIVERY_FEE } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.name ?? "Produit" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fiche = await getFicheProduit(slug);
  if (!fiche || !fiche.produit.active) notFound();
  const { produit, galerie, declinaisons } = fiche;

  const user = await getCurrentUser();
  const [autres, avis, vendeur, achat, monAvis] = await Promise.all([
    getProducts(produit.category),
    avisDuProduit(produit.id),
    vendeurDe(produit.sellerId),
    user ? achatDuClient(user.id, produit.id) : null,
    user ? avisDuClient(user.id, produit.id) : null,
  ]);

  return (
    <Fiche
      produit={produit}
      galerie={galerie}
      declinaisons={declinaisons}
      rayon={produit.category === "vapes" ? "Vapes" : "Billard"}
      avis={avis}
      vendeur={vendeur}
      peutNoter={Boolean(achat)}
      monAvis={monAvis ? { note: monAvis.note, texte: monAvis.texte } : null}
      autres={autres
        .filter((p) => p.id !== produit.id)
        .slice(0, 6)
        .map((p) => ({ slug: p.slug, name: p.name, price: p.price, image: p.image }))}
      livraison={DELIVERY_FEE}
    />
  );
}
