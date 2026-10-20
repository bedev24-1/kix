import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BrandDefs } from "@/components/icons";
import { Analytique } from "@/components/mb/Analytique";
import { SnackbarProvider } from "@/components/ui/Snackbar";
import { configFirebase } from "@/lib/firebase";
import "./globals.css";

const geist = localFont({
  src: [
    { path: "./fonts/Geist-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Geist-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Geist-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Geist-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Geist-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Master Break — l'écosystème de l'excellence billard",
    template: "%s · Master Break",
  },
  description:
    "Achète tes jetons de billard depuis ton téléphone, scanne ton QR à la table, commande ton matériel et prends tes billets de tournoi. Douala et Yaoundé.",
  applicationName: "Master Break",
  // Les aperçus de liens (WhatsApp, Facebook) veulent des adresses complètes.
  metadataBase: new URL(process.env.MB_PUBLIC_URL?.trim() || "https://masterbreak.vps.buyticle.com"),
  openGraph: {
    type: "website",
    siteName: "Master Break",
    locale: "fr_FR",
    images: [{ url: "/img/hall-neon.jpg", width: 1200, height: 630, alt: "Master Break" }],
  },
  manifest: "/manifest.webmanifest",
  // iOS ne lit pas le manifeste pour l'icône de l'écran d'accueil : il lui
  // faut `apple-touch-icon`, et un PNG opaque — il ne sait pas composer sur
  // une transparence, qui devient noire.
  appleWebApp: {
    capable: true,
    title: "Master Break",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark light",
  // La barre système suit le fond de l'application une fois installée.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#071a13" },
    { media: "(prefers-color-scheme: light)", color: "#f4f1e8" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applique le thème avant le premier rendu : pas de flash blanc au chargement.
const themeScript = `try{var t=localStorage.getItem("mb.theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg text-ink antialiased">
        <BrandDefs />
        <SnackbarProvider>{children}</SnackbarProvider>
        <Analytique config={configFirebase()} />
      </body>
    </html>
  );
}
