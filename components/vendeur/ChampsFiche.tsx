import { ATOUTS, ecrireSpecs, type Atout, type Spec } from "@/lib/atouts";

/**
 * La fiche technique et les atouts d'un article, dans le formulaire du
 * vendeur. `atoutsForm` signale au serveur que les cases étaient présentes :
 * toutes décochées veut alors dire « aucun atout », pas « ne touche à rien ».
 */
export function ChampsFiche({ specs = [], atouts = [] }: { specs?: Spec[]; atouts?: Atout[] }) {
  return (
    <>
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="label-caps text-[10.5px] text-muted">Fiche technique · une ligne par caractéristique</span>
        <textarea
          name="specs"
          rows={4}
          defaultValue={ecrireSpecs(specs)}
          placeholder={"Batterie : 1000 mAh\nCharge : USB-C · 45 min\nRéservoir : 2 ml"}
          className="rounded-card border border-line bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-gold"
        />
      </label>
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <input type="hidden" name="atoutsForm" value="1" />
        <legend className="label-caps mb-1.5 text-[10.5px] text-muted">Atouts affichés sur la fiche</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ATOUTS) as Atout[]).map((cle) => (
            <label key={cle} className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-[12.5px]">
              <input type="checkbox" name="atouts" value={cle} defaultChecked={atouts.includes(cle)} className="accent-[#e0b43a]" />
              {ATOUTS[cle].label}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
