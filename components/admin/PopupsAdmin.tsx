"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageField } from "@/components/admin/ImageField";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";
import { basculerPopup, creerPopup, supprimerPopup } from "@/lib/actions-promo";

const champ = "h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink";
const libelle = "text-[11px] tracking-[0.1em] text-muted uppercase";

/** Créer un pop-up : contenu, boutons, pages, durée et plafond de vues par jour. */
export function NouveauPopup() {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [cle, setCle] = useState(0);
  return (
    <form
      key={cle}
      action={(fd) =>
        start(async () => {
          const res = await creerPopup(fd);
          if (!res.ok) return notify("Impossible", { detail: res.error, tone: "warn" });
          notify("Pop-up programmé", { tone: "jade" });
          setCle((c) => c + 1);
          router.refresh();
        })
      }
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {/* Le modèle se valide avec le pop-up : Cinéma (plein écran, titre géant)
          ou Néon (cadre doré, grand chiffre en contour). */}
      <fieldset className="grid gap-2 sm:grid-cols-2 lg:col-span-4">
        <legend className={`${libelle} pb-1.5`}>Modèle</legend>
        {[
          ["cinema", "Cinéma", "Plein écran bord à bord, titre géant centré, boutons côte à côte."],
          ["neon", "Néon", "Carte cadrée d'or lumineux, grand chiffre en contour (« -20 % »)."],
        ].map(([v, nom, aide]) => (
          <label key={v} className="flex cursor-pointer items-start gap-2.5 border border-line p-3 has-checked:border-gold has-checked:bg-gold/10">
            <input type="radio" name="modele" value={v} defaultChecked={v === "cinema"} className="mt-1" />
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold">{nom}</span>
              <span className="text-[11.5px] text-muted">{aide}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Étiquette</span>
        <input name="etiquette" maxLength={30} placeholder="Sponsorisé, Ce week-end…" className={champ} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Ligne dorée (date, lieu)</span>
        <input name="surtitre" maxLength={60} placeholder="7 · 8 novembre · Le Break Akwa" className={champ} />
      </label>
      <label className="flex flex-col gap-1.5 lg:col-span-2">
        <span className={libelle}>Grand texte (modèle Néon)</span>
        <input name="accroche" maxLength={14} placeholder="-20 %" className={champ} />
      </label>
      <label className="flex flex-col gap-1.5 lg:col-span-2">
        <span className={libelle}>Titre</span>
        <input name="titre" required maxLength={80} placeholder="Tournoi Madiba : -20 % ce week-end" className={champ} />
      </label>
      <label className="flex flex-col gap-1.5 lg:col-span-2">
        <span className={libelle}>Texte</span>
        <input name="texte" maxLength={400} placeholder="Places limitées, inscriptions jusqu'à vendredi." className={champ} />
      </label>
      <ImageField name="image" dossier="popups" label="Image promotionnelle" className="lg:col-span-2" />
      <div className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={libelle}>Bouton 1</span>
          <input name="bouton1Label" placeholder="Prendre ma place" className={champ} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={libelle}>Lien du bouton 1</span>
          <input name="bouton1Url" placeholder="/e/madiba-pool-tournament-spectateurs" className={champ} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={libelle}>Bouton 2 (facultatif)</span>
          <input name="bouton2Label" placeholder="Voir le tableau" className={champ} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={libelle}>Lien du bouton 2</span>
          <input name="bouton2Url" placeholder="/t/madiba-pool-tournament" className={champ} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Début</span>
        <input name="debut" type="datetime-local" className={champ} />
        <span className="text-[11px] text-muted">Vide = maintenant.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Durée</span>
        <select name="dureeHeures" defaultValue="72" className={champ}>
          <option value="1">1 heure (test)</option>
          <option value="6">6 heures</option>
          <option value="24">1 jour</option>
          <option value="72">3 jours</option>
          <option value="168">7 jours</option>
          <option value="336">14 jours</option>
          <option value="720">30 jours</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Vues max par joueur et par jour</span>
        <select name="parJour" defaultValue="1" className={champ}>
          {[1, 2, 3, 4, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n} fois
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Où</span>
        <select name="pages" defaultValue="tous" className={champ}>
          <option value="tous">App et site public</option>
          <option value="app">App seulement</option>
          <option value="site">Site public seulement</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={libelle}>Priorité</span>
        <input name="priorite" type="number" min={0} defaultValue={0} className={champ} />
        <span className="text-[11px] text-muted">Le plus haut passe d&apos;abord.</span>
      </label>
      <div className="flex items-end lg:col-span-3">
        <button disabled={pending} className="press flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-[13px] font-semibold text-gold-ink disabled:opacity-60">
          {pending ? <Spinner size={14} /> : null}
          Programmer le pop-up
        </button>
      </div>
    </form>
  );
}

export function GestesPopup({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const faire = (f: () => Promise<unknown>) =>
    start(async () => {
      await f();
      router.refresh();
    });
  return (
    <div className="flex gap-1.5">
      <button disabled={pending} onClick={() => faire(() => basculerPopup(id, !actif))} className={`rounded-full border px-3 py-1.5 text-[11px] ${actif ? "border-line text-warn" : "border-gold/50 text-gold-text"}`}>
        {actif ? "Arrêter" : "Relancer"}
      </button>
      <button disabled={pending} onClick={() => confirm("Supprimer ce pop-up ?") && faire(() => supprimerPopup(id))} className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted">
        Supprimer
      </button>
    </div>
  );
}
