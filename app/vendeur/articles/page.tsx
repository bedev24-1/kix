import { Photo } from "@/components/ui/Photo";
import { Drawer, Field, Select, SubmitButton, Switch, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/dash/Section";
import { deleteProduct, saveProduct } from "@/lib/actions";
import { GalerieEtVariantes } from "@/components/vendeur/GalerieEtVariantes";
import { ChampsFiche } from "@/components/vendeur/ChampsFiche";
import { getGalerieEtVariantes, getProduitsVendeur } from "@/lib/seller";
import { requireRole } from "@/lib/session";
import { f } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes articles" };

const RAYONS = [
  { value: "vapes", label: "Vapes" },
  { value: "billard", label: "Billard" },
];

export default async function VendeurArticles() {
  const vendeur = await requireRole("seller", "manager", "admin");
  const articles = await getProduitsVendeur(vendeur.id);
  const { images, variantes } = await getGalerieEtVariantes(articles.map((a) => a.product.id));

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl lg:text-[26px]">Mes articles</h1>
        <p className="text-[13px] text-muted">Ce que tu vends sur Master Break.</p>
      </header>

      <Drawer summary="＋ Mettre un article en vente">
        <form action={saveProduct} className="grid gap-3 pt-3 sm:grid-cols-2">
          <Field label="Nom" name="name" required className="sm:col-span-2" />
          <Field label="Prix (F)" name="price" type="number" min={0} required />
          <Field label="Stock" name="stock" type="number" min={0} defaultValue={0} />
          <Select label="Rayon" name="category" options={RAYONS} />
          <ImageField name="image" dossier="produits" defaultValue="/img/puffs.jpg" />
          <Field label="Accroche" name="detail" className="sm:col-span-2" />
          <TextArea label="Description" name="description" className="sm:col-span-2" />
          <ChampsFiche />
          <div className="flex items-center gap-4 sm:col-span-2">
            <Switch label="En vente" name="active" />
            <SubmitButton>Mettre en vente</SubmitButton>
          </div>
        </form>
      </Drawer>

      <Section title={`${articles.length} article${articles.length > 1 ? "s" : ""}`}>
        {articles.length === 0 ? (
          <Card tone="dashed" shape="panel" className="px-5 py-10 text-center text-[13px] text-muted">
            Tu n&apos;as encore rien mis en vente.
          </Card>
        ) : null}

        <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-2">
          {articles.map(({ product, vendus }) => (
            <Card key={product.id} data-article={product.slug} shape="panel" className="flex flex-col gap-3 p-3.5">
              <div className="flex gap-3">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-card">
                  <Photo src={product.image} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold">{product.name}</span>
                    {!product.active ? (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                        retiré
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-muted">
                    {f(product.price)} · {Number(vendus)} vendu{Number(vendus) > 1 ? "s" : ""}
                  </span>
                  <span
                    className={cn(
                      "text-[12px]",
                      product.stock === 0 ? "text-warn" : product.stock < 5 ? "text-gold-text" : "text-muted",
                    )}
                  >
                    {product.stock === 0 ? "rupture de stock" : `${product.stock} en stock`}
                  </span>
                </span>
              </div>

              <Drawer summary="Modifier">
                <form action={saveProduct} className="grid gap-3 pt-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="slug" value={product.slug} />
                  <Field label="Nom" name="name" defaultValue={product.name} className="sm:col-span-2" />
                  <Field label="Prix (F)" name="price" type="number" min={0} defaultValue={product.price} />
                  <Field label="Stock" name="stock" type="number" min={0} defaultValue={product.stock} />
                  <Select label="Rayon" name="category" defaultValue={product.category} options={RAYONS} />
                  <ImageField name="image" dossier="produits" defaultValue={product.image} />
                  <Field label="Accroche" name="detail" defaultValue={product.detail} className="sm:col-span-2" />
                  <TextArea label="Description" name="description" defaultValue={product.description} className="sm:col-span-2" />
                  <ChampsFiche specs={product.specs} atouts={product.atouts} />
                  <div className="flex items-center gap-4 sm:col-span-2">
                    <Switch label="En vente" name="active" defaultChecked={product.active} />
                    <SubmitButton />
                  </div>
                </form>
                <form action={deleteProduct} className="pt-2">
                  <input type="hidden" name="id" value={product.id} />
                  <button className="h-10 text-[12px] text-muted transition hover:text-warn">
                    Retirer de la vente
                  </button>
                </form>
              </Drawer>

              <GalerieEtVariantes
                article={product}
                images={images.filter((i) => i.productId === product.id)}
                variantes={variantes.filter((v) => v.productId === product.id)}
              />
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
