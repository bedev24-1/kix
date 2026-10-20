import { Field, SubmitButton, Switch, TextArea } from "@/components/admin/AdminUI";
import { ImageField } from "@/components/admin/ImageField";
import { saveVitrine } from "@/lib/actions-vitrine";
import { ARTISTES_MAX, GALERIE_MAX, type Vitrine } from "@/lib/vitrine";

/**
 * Ce que la page publique montre au-delà de l'affiche. Chaque section laissée
 * vide disparaît simplement de la page.
 */
export function VitrineForm({ id, slug, vitrine }: { id: string; slug: string; vitrine: Vitrine }) {
  const galerie = vitrine.galerie ?? [];
  const artistes = vitrine.artistes ?? [];

  return (
    <form action={saveVitrine} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-[12px] text-muted">
        Page publique : <a href={`/e/${slug}`} target="_blank" className="text-gold-text underline">/e/{slug}</a>
      </p>

      <TextArea
        label="Texte d'accroche (une phrase par ligne)"
        name="manifeste"
        rows={6}
        defaultValue={vitrine.manifeste}
      />
      <Field
        label="Vidéo (YouTube, Vimeo ou lien .mp4)"
        name="video"
        defaultValue={vitrine.video}
        placeholder="https://youtu.be/…"
      />
      <Field
        label="Musique (lien Spotify)"
        name="musique"
        defaultValue={vitrine.musique}
        placeholder="https://open.spotify.com/artist/…"
      />

      <fieldset className="grid gap-3 border border-line p-3">
        <legend className="px-1 text-[11px] tracking-[0.1em] text-muted uppercase">Galerie photos</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: GALERIE_MAX }, (_, i) => (
            <ImageField key={i} label={`Photo ${i + 1}`} name={`galerie_${i}`} dossier="evenements" defaultValue={galerie[i] ?? ""} />
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-3 border border-line p-3">
        <legend className="px-1 text-[11px] tracking-[0.1em] text-muted uppercase">Artistes / joueurs à l&apos;affiche</legend>
        {Array.from({ length: ARTISTES_MAX }, (_, i) => (
          <div key={i} className="grid gap-3 border-b border-line pb-3 last:border-0 sm:grid-cols-2">
            <Field label={`Nom ${i + 1}`} name={`artiste_${i}_nom`} defaultValue={artistes[i]?.nom} />
            <ImageField label="Photo" name={`artiste_${i}_photo`} dossier="evenements" defaultValue={artistes[i]?.photo ?? ""} />
            <TextArea label="Présentation" name={`artiste_${i}_bio`} rows={2} defaultValue={artistes[i]?.bio} className="sm:col-span-2" />
          </div>
        ))}
      </fieldset>

      <Switch label="Formulaire « Nous contacter » en bas de page" name="contact" defaultChecked={vitrine.contact ?? true} />
      <SubmitButton>Enregistrer la page publique</SubmitButton>
    </form>
  );
}
