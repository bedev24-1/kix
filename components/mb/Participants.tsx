import { Photo } from "@/components/ui/Photo";
import { Card } from "@/components/ui/Card";
import { UserIcon } from "@/components/icons";

export type Visage = { id: string; name: string; avatar: string | null };

const VISIBLES = 4;

/**
 * Qui vient, en visages : les vrais profils d'abord, puis des places vides
 * dessinées jusqu'à quatre — une salle qui se remplit se voit, une salle vide
 * aussi, sans photos d'emprunt.
 */
export function Participants({
  titre,
  detail,
  visages,
  total,
}: {
  titre: string;
  detail: string;
  visages: Visage[];
  total: number;
}) {
  const montres = visages.slice(0, VISIBLES);
  const vides = Math.max(0, VISIBLES - montres.length);
  const reste = Math.max(0, total - montres.length);

  return (
    <Card className="flex items-center gap-3 px-3.5 py-3">
      <div className="flex shrink-0">
        {montres.map((v, i) => (
          <span
            key={v.id}
            title={v.name}
            className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-bg bg-surface-2 text-[11px] font-semibold text-dim ${i > 0 ? "-ml-3" : ""}`}
          >
            {v.avatar ? (
              <Photo src={v.avatar} alt={v.name} fill sizes="36px" className="object-cover" />
            ) : (
              (v.name.trim()[0] ?? "?").toUpperCase()
            )}
          </span>
        ))}
        {Array.from({ length: vides }, (_, i) => (
          <span
            key={`vide-${i}`}
            aria-hidden="true"
            className={`grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-line bg-surface text-faint ${montres.length + i > 0 ? "-ml-3" : ""}`}
          >
            <UserIcon size={14} />
          </span>
        ))}
        {reste > 0 ? (
          <span className="-ml-3 grid h-9 w-9 place-items-center rounded-full border-2 border-bg bg-surface-2 text-[10px] font-semibold text-dim">
            +{reste}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{titre}</span>
        <span className="text-[11px] text-muted">{detail}</span>
      </div>
    </Card>
  );
}
