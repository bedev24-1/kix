import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "@/components/ui/Photo";
import { PartagerBouton } from "@/components/mb/PartagerBouton";
import { PinIcon, TargetIcon } from "@/components/icons";
import { metadonneesApercu } from "@/lib/apercu";
import { FORMATS, NIVEAUX, getCourse, prixParSeance } from "@/lib/courses";
import { getCurrentUser } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * La page publique d'un cours : celle qu'on partage.
 *
 * La fiche de l'application demande un compte : son lien, collé dans
 * WhatsApp, montrait l'aperçu de la connexion et perdait le joueur en route.
 * Celle-ci s'ouvre à tous — le coach, la salle, le prix, les places — et
 * mène à l'inscription : on crée son compte (ou on se connecte) et on
 * arrive directement sur la fiche du cours, prêt à payer sa place.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lu = await getCourse(slug);
  if (!lu || !lu.course.active) return { title: "Cours introuvable" };
  const { course, venue } = lu;
  return metadonneesApercu({
    titre: course.title,
    description: [
      [course.coachName, venue?.name].filter(Boolean).join(" · "),
      `${NIVEAUX[course.level] ?? course.level} · ${course.sessions} séance${course.sessions > 1 ? "s" : ""} · ${f(course.price)}`,
      course.schedule,
      course.description,
    ]
      .filter(Boolean)
      .join(" — "),
    image: course.image,
    chemin: `/c/${course.slug}`,
  });
}

export default async function CoursPublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lu, moi] = await Promise.all([getCourse(slug), getCurrentUser()]);
  if (!lu || !lu.course.active) notFound();

  const { course, venue } = lu;
  const restantes = Math.max(0, course.capacity - Number(lu.inscrits));
  const fiche = `/app/cours/${course.slug}`;
  const porte = `/rejoindre?vers=${encodeURIComponent(fiche)}`;

  return (
    <main className="min-h-dvh bg-bg text-ink">
      <nav className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/emblem.png" alt="" width={26} height={26} />
          <span className="text-[13px] font-extrabold tracking-[-0.02em] uppercase">Master Break</span>
        </Link>
        <PartagerBouton
          chemin={`/c/${course.slug}`}
          titre={course.title}
          className="press ml-auto grid h-10 w-10 place-items-center rounded-full border border-line text-dim hover:text-ink"
        />
      </nav>

      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-5 pb-16">
        <div className="relative h-64 overflow-hidden rounded-panel border border-line sm:h-80">
          <Photo src={course.image} alt={course.title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
          <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/10 to-black/80" />
          <div className="absolute inset-x-5 bottom-4 flex flex-col gap-2 text-white">
            <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase">
              <span className="rounded-full bg-gold px-2.5 py-1 text-gold-ink">{NIVEAUX[course.level] ?? course.level}</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">{FORMATS[course.format] ?? course.format}</span>
            </div>
            <h1 className="text-[26px] leading-tight sm:text-[34px]">{course.title}</h1>
            <p className="text-[13px] text-white/80">
              Avec {course.coachName}
              {venue ? ` · ${venue.name}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <Fait valeur={String(course.sessions)} quoi={course.sessions > 1 ? "séances" : "séance"} />
          <Fait valeur={f(prixParSeance(course))} quoi="par séance" />
          <Fait valeur={String(restantes)} quoi={restantes > 1 ? "places libres" : "place libre"} alerte={restantes === 0} />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-dashed border-line px-4 py-3.5 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <TargetIcon size={13} /> {course.schedule || "Créneau à confirmer"}
          </span>
          {venue ? (
            <span className="flex items-center gap-1.5">
              <PinIcon size={13} /> {venue.name}
            </span>
          ) : null}
          <span className="ml-auto font-semibold text-ink">{f(course.price)} le cours complet</span>
        </div>

        {course.description ? <p className="text-[14px] leading-6 text-dim text-pretty">{course.description}</p> : null}

        <div className="flex flex-col gap-2.5 rounded-panel border border-line bg-surface p-4">
          {restantes === 0 ? (
            <p className="text-center text-[13.5px] text-warn">Ce cours est complet pour le moment.</p>
          ) : moi ? (
            <Link
              href={fiche}
              className="press flex h-12 items-center justify-center rounded-full bg-gold text-[14px] font-semibold text-gold-ink"
            >
              M&apos;inscrire au cours
            </Link>
          ) : (
            <>
              <Link
                href={`${porte}&entree=inscription`}
                className="press flex h-12 items-center justify-center rounded-full bg-gold text-[14px] font-semibold text-gold-ink"
              >
                Créer mon compte et m&apos;inscrire
              </Link>
              <Link
                href={porte}
                className="press flex h-11 items-center justify-center rounded-full border border-line text-[13px] text-dim hover:text-ink"
              >
                J&apos;ai déjà un compte
              </Link>
            </>
          )}
          <p className="text-center text-[11.5px] text-muted">
            Paiement Orange Money ou MTN MoMo dans l&apos;application Master Break.
          </p>
        </div>
      </div>
    </main>
  );
}

function Fait({ valeur, quoi, alerte }: { valeur: string; quoi: string; alerte?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-panel border border-line bg-surface px-3 py-3">
      <span className={`text-[18px] leading-tight font-bold tracking-[-0.02em] ${alerte ? "text-warn" : ""}`}>{valeur}</span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </div>
  );
}
