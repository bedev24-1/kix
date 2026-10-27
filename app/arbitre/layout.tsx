import Link from "next/link";
import { MasterMark } from "@/components/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * L'espace arbitre. Il n'est pas réservé à un rôle : un bénévole invité pour un
 * soir doit pouvoir y entrer avec son compte de joueur. C'est `canScore` qui
 * décide, match par match, de ce qu'il peut y faire.
 */
export default async function ArbitreLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-[env(safe-area-inset-top)] z-30 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-5 py-3.5 backdrop-blur-xl">
        <Link href="/arbitre" className="flex items-center gap-2.5">
          <MasterMark size={28} />
          <span className="flex flex-col gap-px">
            <span className="text-[13px] font-bold tracking-[0.16em]">FEUILLE DE MATCH</span>
            <span className="text-[11px] text-muted">{user.name}</span>
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-5 sm:py-6">{children}</main>
    </div>
  );
}
