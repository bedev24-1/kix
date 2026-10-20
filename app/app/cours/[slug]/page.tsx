import { Photo } from "@/components/ui/Photo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db, enrollments } from "@/db";
import { CoursButton } from "@/components/mb/CoursButton";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon, PinIcon, TargetIcon } from "@/components/icons";
import { FORMATS, NIVEAUX, getCourse, prixParSeance } from "@/lib/courses";
import { requireUser } from "@/lib/session";
import { f } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lu = await getCourse(slug);
  return { title: lu?.course.title ?? "Cours de billard" };
}

export default async function CoursFiche({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [lu, user] = await Promise.all([getCourse(slug), requireUser()]);
  if (!lu || !lu.course.active) notFound();

  const { course, venue } = lu;
  const pris = Number(lu.inscrits);
  const restantes = Math.max(0, course.capacity - pris);

  const mienne = (
    await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(eq(enrollments.courseId, course.id), eq(enrollments.userId, user.id), eq(enrollments.status, "paid")),
      )
      .limit(1)
  )[0];

  return (
    <div className="-mx-5 -mt-4 pb-40 lg:mx-0 lg:mt-0 lg:pb-0">
      <div className="relative h-72 lg:h-96 lg:overflow-hidden lg:rounded-panel lg:border lg:border-line">
        <Photo src={course.image} alt={course.title} fill sizes="(max-width: 1024px) 100vw, 900px" className="object-cover" priority />
        <div className="absolute inset-0 bg-linear-to-b from-black/50 via-black/15 to-bg lg:to-black/75" />

        <Link
          href="/app/cours"
          aria-label="Retour"
          className="absolute top-4 left-5 grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur lg:hidden"
        >
          <ChevronLeftIcon size={18} />
        </Link>

        <div className="absolute inset-x-5 bottom-4 flex flex-col gap-2 text-white lg:inset-x-7">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="gold" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {NIVEAUX[course.level] ?? course.level}
            </Chip>
            <Chip tone="neutral" className="px-2.5 py-1 text-[10px] tracking-[0.06em] uppercase">
              {FORMATS[course.format] ?? course.format}
            </Chip>
          </div>
          <h1 className="text-[24px] leading-tight lg:text-[32px]">{course.title}</h1>
          <p className="text-[13px] text-white/75">
            {course.coachName}
            {venue ? ` · ${venue.name}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-5 pt-5 lg:px-0 lg:pt-6">
        <div className="grid grid-cols-3 gap-2.5">
          <Fait valeur={String(course.sessions)} quoi={course.sessions > 1 ? "séances" : "séance"} />
          <Fait valeur={f(prixParSeance(course))} quoi="par séance" />
          <Fait
            valeur={String(restantes)}
            quoi={restantes > 1 ? "places libres" : "place libre"}
            alerte={restantes === 0}
          />
        </div>

        <Card shape="square" tone="dashed" className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <TargetIcon size={13} /> {course.schedule || "Créneau à confirmer"}
          </span>
          {venue ? (
            <span className="flex items-center gap-1.5">
              <PinIcon size={13} /> {venue.name}
            </span>
          ) : null}
        </Card>

        {course.description ? (
          <p className="text-[13.5px] leading-6 text-dim text-pretty">{course.description}</p>
        ) : null}
      </div>

      {/* Barre d'inscription collée en bas sur téléphone : la décision se prend
          après avoir lu, pas avant de faire défiler. */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[430px] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:static lg:mx-0 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-5">
        <Card shape="panel" className="glass-strong p-3.5 lg:max-w-md">
          <CoursButton
            courseId={course.id}
            titre={course.title}
            price={course.price}
            phone={user.phone}
            sessions={course.sessions}
            inscrit={Boolean(mienne)}
            complet={restantes === 0}
          />
        </Card>
      </div>
    </div>
  );
}

function Fait({ valeur, quoi, alerte }: { valeur: string; quoi: string; alerte?: boolean }) {
  return (
    <Card shape="panel" className="flex flex-col gap-0.5 px-3 py-3">
      <span className={`text-[18px] leading-tight font-bold tracking-[-0.02em] ${alerte ? "text-warn" : ""}`}>
        {valeur}
      </span>
      <span className="text-[11px] leading-tight text-muted">{quoi}</span>
    </Card>
  );
}
