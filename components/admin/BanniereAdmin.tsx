import { Photo } from "@/components/ui/Photo";
import { ImageField } from "@/components/admin/ImageField";
import { SubmitButton } from "@/components/admin/AdminUI";
import { ajouterCarte, deplacerCarte, modifierCarte, retirerCarte } from "@/lib/actions-banniere";
import { elementsPromouvables, toutesLesCartes } from "@/lib/banniere";
import { cn } from "@/lib/cn";

const GENRES = { tournoi: "Tournoi", evenement: "Événement", produit: "Produit", libre: "Carte libre" } as const;
const champ = "h-10 rounded-none border border-line bg-surface px-3 text-[13px] text-ink";
const etiquette = "text-[10.5px] tracking-[0.1em] text-muted uppercase";
const jourIso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * La bannière de la boutique, dans l'onglet Promotions : ce qu'on peut
 * promouvoir (tournois, événements, produits), l'ajout d'une carte avec son
 * image, et les cartes en place — modifiables, réordonnables, datées.
 */
export async function BanniereAdmin() {
  const [elements, cartes] = await Promise.all([elementsPromouvables(), toutesLesCartes()]);
  const maintenant = new Date();
  const enLigne = (c: (typeof cartes)[number]) =>
    c.actif && (!c.debut || c.debut <= maintenant) && (!c.fin || c.fin > maintenant);

  return (
    <section className="flex flex-col gap-5 border border-line p-4">
      <div>
        <h2 className="text-[14px] font-semibold">Bannière de la boutique</h2>
        <p className="mt-1 text-[12.5px] text-muted">
          Les cartes qui se feuillettent en haut des fiches produit, toutes les 4 secondes, dans l&apos;ordre ci-dessous.
          Sans aucune carte en ligne, la bannière montre la livraison du soir et le retrait en salle.
        </p>
      </div>

      {/* Ajouter une carte */}
      <form action={ajouterCarte} className="grid gap-3 border border-dashed border-line p-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className={etiquette}>Ce qu&apos;on promeut</span>
          <select name="element" defaultValue="" className={champ} required>
            <option value="" disabled className="bg-bg text-ink">
              Choisir un tournoi, un événement, un produit…
            </option>
            {(["tournoi", "evenement", "produit"] as const).map((g) => (
              <optgroup key={g} label={`${GENRES[g]}s`}>
                {elements[g].map((e) => (
                  <option key={e.id} value={`${g}:${e.id}`} className="bg-bg text-ink">
                    {e.titre}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value="libre" className="bg-bg text-ink">
              Carte libre (titre et lien à saisir)
            </option>
          </select>
        </label>
        <ImageField name="image" dossier="bannieres" label="Image (sinon celle de l'élément)" className="sm:col-span-2" />
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Titre (facultatif)</span>
          <input name="titre" maxLength={60} placeholder="Repris de l'élément" className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Détail (facultatif)</span>
          <input name="detail" maxLength={80} placeholder="-20 % ce week-end" className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Bouton</span>
          <input name="bouton" maxLength={18} placeholder="J'en profite" className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Lien (carte libre)</span>
          <input name="lien" placeholder="/app/shop" className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Du (facultatif)</span>
          <input type="date" name="debut" className={champ} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={etiquette}>Au (facultatif)</span>
          <input type="date" name="fin" className={champ} />
        </label>
        <div className="flex items-end sm:col-span-2">
          <SubmitButton>Ajouter à la bannière</SubmitButton>
        </div>
      </form>

      {/* Les cartes en place */}
      {cartes.length ? (
        <div className="flex flex-col gap-3">
          {cartes.map((c, i) => (
            <div key={c.id} className={cn("flex flex-col gap-3 border border-line p-3 lg:flex-row", !enLigne(c) && "opacity-70")}>
              <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-[12px] lg:w-56">
                {c.image ? <Photo src={c.image} alt="" fill sizes="224px" className="object-cover" /> : null}
                <span className="absolute inset-0 bg-gradient-to-r from-[#071a13]/95 to-[#071a13]/30" />
                <span className="absolute inset-y-0 left-3 flex flex-col justify-center text-white">
                  <b className="text-[12.5px] text-[#f6d77a]">{c.titre}</b>
                  <span className="text-[10.5px]">{c.detail}</span>
                </span>
              </div>
              <form action={modifierCarte} className="grid grow gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <input type="hidden" name="id" value={c.id} />
                <span className="flex items-center gap-2 text-[11.5px] text-muted sm:col-span-2 xl:col-span-4">
                  <b className="text-ink">
                    {i + 1}. {GENRES[c.kind as keyof typeof GENRES] ?? c.kind}
                  </b>
                  · {enLigne(c) ? <span className="text-jade-text">en ligne</span> : c.actif ? "hors période" : "désactivée"}
                  · lien <code>{c.lien}</code>
                </span>
                <input name="titre" defaultValue={c.titre} maxLength={60} className={champ} aria-label="Titre" />
                <input name="detail" defaultValue={c.detail} maxLength={80} className={champ} aria-label="Détail" />
                <input name="bouton" defaultValue={c.bouton} maxLength={18} className={champ} aria-label="Bouton" />
                <input name="lien" defaultValue={c.lien} className={champ} aria-label="Lien" />
                <ImageField name="image" dossier="bannieres" defaultValue={c.image} className="sm:col-span-2" />
                <input type="date" name="debut" defaultValue={jourIso(c.debut)} className={champ} aria-label="Du" />
                <input type="date" name="fin" defaultValue={jourIso(c.fin)} className={champ} aria-label="Au" />
                <label className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" name="actif" defaultChecked={c.actif} className="h-4 w-4 accent-[var(--mb-accent)]" /> Active
                </label>
                <div className="flex items-center">
                  <SubmitButton />
                </div>
              </form>
              <div className="flex shrink-0 items-start gap-2 lg:flex-col">
                <form action={deplacerCarte}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="sens" value="haut" />
                  <button disabled={i === 0} className="h-9 rounded-full border border-line px-3 text-[12px] disabled:opacity-30">
                    ↑ Monter
                  </button>
                </form>
                <form action={deplacerCarte}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="sens" value="bas" />
                  <button disabled={i === cartes.length - 1} className="h-9 rounded-full border border-line px-3 text-[12px] disabled:opacity-30">
                    ↓ Descendre
                  </button>
                </form>
                <form action={retirerCarte}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="h-9 px-1 text-[12px] text-muted hover:text-warn">Retirer</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">Aucune carte pour l&apos;instant.</p>
      )}

      {/* Le catalogue de ce qu'on peut promouvoir, en un clic */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[13px] font-semibold">Ce qu&apos;on peut promouvoir</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {(["tournoi", "evenement", "produit"] as const).map((g) => (
            <div key={g} className="flex flex-col border border-line">
              <span className="border-b border-line px-3 py-2 text-[11px] tracking-[0.1em] text-muted uppercase">
                {GENRES[g]}s · {elements[g].length}
              </span>
              <div className="flex max-h-72 flex-col overflow-y-auto">
                {elements[g].length === 0 ? <span className="px-3 py-3 text-[12px] text-muted">Rien pour l&apos;instant.</span> : null}
                {elements[g].map((e) => {
                  const deja = cartes.some((c) => c.refId === e.id);
                  return (
                    <form key={e.id} action={ajouterCarte} className="flex items-center gap-2.5 border-b border-line px-3 py-2 last:border-b-0">
                      <input type="hidden" name="element" value={`${g}:${e.id}`} />
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[8px]">
                        <Photo src={e.image} alt="" fill sizes="36px" className="object-cover" />
                      </span>
                      <span className="min-w-0 grow">
                        <span className="block truncate text-[12.5px] font-semibold">{e.titre}</span>
                        <span className="block truncate text-[11px] text-muted">{e.detail}</span>
                      </span>
                      {deja ? (
                        <span className="shrink-0 text-[11px] text-jade-text">En bannière</span>
                      ) : (
                        <button className="shrink-0 rounded-full border border-gold/50 px-2.5 py-1 text-[11px] text-gold-text">+ Bannière</button>
                      )}
                    </form>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
