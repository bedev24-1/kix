"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSnackbar } from "@/components/ui/Snackbar";
import { Spinner } from "@/components/ui/Spinner";
import { BellIcon } from "@/components/icons";
import { envoyerNotification, retirerNotification, type Cible } from "@/lib/actions-notifications";

const champ = "h-11 rounded-none border border-line bg-surface px-3 text-[13px] text-ink";
const libelle = "text-[11px] tracking-[0.1em] text-muted uppercase";

const PUBLICS: { v: Cible; nom: string }[] = [
  { v: "tous", nom: "Tout le monde" },
  { v: "client", nom: "Joueurs" },
  { v: "manager", nom: "Gérants" },
  { v: "seller", nom: "Vendeurs" },
  { v: "numero", nom: "Un numéro" },
];

/**
 * Écrire et envoyer une notification. L'aperçu montre ce qui s'affichera
 * dans la cloche ; l'envoi à tout le monde demande une confirmation.
 */
export function NouvelleNotification({ effectifs }: { effectifs: Record<string, number> }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  const [cle, setCle] = useState(0);
  const [cible, setCible] = useState<Cible>("tous");
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");

  const combien = cible === "numero" ? 1 : (effectifs[cible] ?? 0);

  return (
    <form
      key={cle}
      action={(fd) => {
        if (cible !== "numero" && !confirm(`Envoyer « ${titre} » à ${combien} compte(s) ?`)) return;
        start(async () => {
          const res = await envoyerNotification(fd);
          if (!res.ok) return notify("Pas envoyée", { detail: res.error, tone: "warn" });
          notify("Notification envoyée", { detail: `${res.destinataires} destinataire(s)`, tone: "jade" });
          setCle((c) => c + 1);
          setTitre("");
          setCorps("");
          setCible("tous");
          router.refresh();
        });
      }}
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="flex flex-wrap gap-2 sm:col-span-2">
          <legend className={`${libelle} pb-1.5`}>À qui</legend>
          {PUBLICS.map((p) => (
            <label
              key={p.v}
              className="flex cursor-pointer items-center gap-2 border border-line px-3 py-2 text-[13px] has-checked:border-gold has-checked:bg-gold/10"
            >
              <input type="radio" name="cible" value={p.v} checked={cible === p.v} onChange={() => setCible(p.v)} />
              {p.nom}
              {p.v !== "numero" ? <span className="text-[11px] text-muted">{effectifs[p.v] ?? 0}</span> : null}
            </label>
          ))}
        </fieldset>
        {cible === "numero" ? (
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={libelle}>Numéro du compte</span>
            <input name="numero" required inputMode="tel" placeholder="6 77 45 12 08" className={champ} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={libelle}>Titre</span>
          <input
            name="titre"
            required
            maxLength={80}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Tournoi Madiba ce samedi"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={libelle}>Message</span>
          <textarea
            name="texte"
            maxLength={400}
            rows={3}
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            placeholder="Inscriptions ouvertes jusqu'à vendredi, 20 places."
            className="rounded-none border border-line bg-surface px-3 py-2.5 text-[13px] text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={libelle}>Lien à l&apos;ouverture (facultatif)</span>
          <input name="lien" maxLength={400} placeholder="/app/tournois ou https://…" className={champ} />
        </label>
        <div className="flex items-end sm:col-span-2">
          <button
            disabled={pending || !titre.trim()}
            className="press flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-[13px] font-semibold text-gold-ink disabled:opacity-60"
          >
            {pending ? <Spinner size={14} /> : <BellIcon size={15} />}
            Envoyer {cible === "numero" ? "à ce numéro" : `à ${combien} compte(s)`}
          </button>
        </div>
      </div>

      {/* Aperçu : la ligne telle qu'elle apparaîtra dans la cloche. */}
      <div className="flex flex-col gap-2">
        <span className={libelle}>Aperçu</span>
        <div className="flex items-start gap-3 border border-line bg-surface p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold-text">
            <BellIcon size={18} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13.5px] font-semibold">{titre || "Titre de la notification"}</span>
            <span className="text-[12px] leading-5 text-dim">{corps || "Le message s'affiche ici."}</span>
            <span className="text-[11px] text-muted">à l&apos;instant</span>
          </span>
        </div>
        <p className="text-[11.5px] leading-5 text-muted">
          Elle arrive dans la cloche de l&apos;app, et sonne sur les téléphones qui ont activé les notifications.
        </p>
      </div>
    </form>
  );
}

export function RetirerNotification({ titre, envoyeeLe }: { titre: string; envoyeeLe: string }) {
  const router = useRouter();
  const { notify } = useSnackbar();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm(`Retirer « ${titre} » de toutes les cloches ?`)) return;
        start(async () => {
          const res = await retirerNotification(titre, envoyeeLe);
          if (res.ok) notify("Retirée", { detail: `${res.retirees} notification(s)`, tone: "jade" });
          router.refresh();
        });
      }}
      className="text-[12px] text-muted underline-offset-4 hover:text-warn hover:underline disabled:opacity-60"
    >
      {pending ? <Spinner size={12} /> : "Retirer"}
    </button>
  );
}
