import { AppSidebar } from "@/components/mb/AppSidebar";
import { BottomNav } from "@/components/mb/BottomNav";
import { PopupPromo } from "@/components/mb/PopupPromo";
import { getBalance, getUnreadCount } from "@/lib/queries";
import { requireUser } from "@/lib/session";

/**
 * Coquille de l'app : colonne de téléphone avec barre d'onglets flottante en
 * mobile, navigation latérale et contenu large dès le format bureau.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [balance, unread] = await Promise.all([getBalance(user.id), getUnreadCount(user.id)]);

  return (
    <div className="relative flex min-h-dvh">
      <AppSidebar user={user} balance={balance} unread={unread} />

      {/* Trois largeurs, pas deux.
          Jusqu'à 768 px, la colonne de téléphone. Entre 768 et 1024, une
          tablette : la colonne s'élargit et les grilles passent à deux, mais
          la barre du bas reste — une colonne latérale y mangerait un tiers de
          l'écran. Au-delà, la mise en page de bureau.
          Sans ce palier, une tablette affichait une colonne de 430 px flottant
          au milieu de deux marges vides. */}
      <div className="relative mx-auto w-full max-w-[430px] overflow-x-clip px-5 pt-4 pb-32 md:max-w-[46rem] md:px-7 md:pt-6 lg:mx-0 lg:max-w-none lg:overflow-visible lg:px-10 lg:pt-8 lg:pb-14">
        <div className="halo halo-gold -top-35 -left-24 h-85 w-85 lg:hidden" />
        <div className="halo halo-jade top-75 -right-32 h-80 w-80 lg:hidden" />
        <div className="stagger relative mx-auto flex flex-col gap-3.5 md:gap-5 lg:max-w-320 lg:gap-6">{children}</div>
      </div>

      <BottomNav />
      <PopupPromo page="app" />
    </div>
  );
}
