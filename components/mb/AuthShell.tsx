import Image from "next/image";
import Link from "next/link";
import { MasterMark } from "@/components/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const promises = [
  ["Ton Pass", "Des jetons prépayés, un QR au comptoir, plus de billets froissés."],
  ["Tes salles", "Tables libres en direct, tarifs, réservations dans tout Douala et Yaoundé."],
  ["Ton classement", "Chaque partie compte : points, badges, tournois Master Break."],
];

/** Colonne image + argumentaire à gauche sur grand écran, formulaire plein cadre sur mobile. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* vitrine — écrans larges seulement */}
      <aside className="relative hidden overflow-hidden bg-bg-2 lg:block">
        <Image
          src="/img/hall-neon.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/65 to-bg/25" />
        <div className="halo halo-gold -bottom-40 -left-24 h-120 w-120" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="self-start" aria-label="Master Break">
            <Image src="/brand/logo.png" alt="Master Break, l'écosystème de l'excellence billard" width={327} height={257} priority className="h-28 w-auto" />
          </Link>

          <div className="flex flex-col gap-9">
            <h2 className="max-w-md text-[40px] leading-[1.08] xl:text-[46px]">
              La nuit camerounaise, <span className="text-gold-text">enfin digitalisée.</span>
            </h2>
            <ul className="stagger flex flex-col gap-5">
              {promises.map(([label, text]) => (
                <li key={label} className="flex max-w-sm gap-3.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-gold" />
                  <span className="flex flex-col gap-1">
                    <span className="text-[14px] font-semibold">{label}</span>
                    <span className="text-[13px] leading-6 text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] tracking-[0.14em] text-dim uppercase">Douala · Yaoundé · Bafoussam</p>
        </div>
      </aside>

      {/* formulaire */}
      <main className="relative flex min-h-dvh flex-col overflow-hidden px-5 py-9 sm:px-8 lg:justify-center lg:px-14 xl:px-20">
        <div className="halo halo-gold -top-44 -right-24 h-100 w-100 lg:hidden" />

        <div className="relative flex items-center justify-between lg:absolute lg:top-8 lg:right-14 xl:right-20">
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <MasterMark size={30} />
            <span className="text-[15px] font-semibold tracking-[0.2em] uppercase">Master Break</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="rise relative mx-auto mt-10 flex w-full max-w-[26rem] flex-col gap-7 lg:mt-0">
          <div className="flex flex-col gap-2.5">
            <h1 className="text-[32px] leading-tight sm:text-[36px]">{title}</h1>
            <p className="text-[13.5px] leading-6 text-muted">{subtitle}</p>
          </div>

          {children}
          {footer}
        </div>
      </main>
    </div>
  );
}
