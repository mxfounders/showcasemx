import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://shwcs.site"),
  title: "shwcs | Proyectos para tu empresa",
  description: "Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/icons/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "shwcs",
    title: "shwcs | Proyectos para tu empresa",
    description: "Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.",
    url: "https://shwcs.site",
    images: [
      {
        url: "https://shwcs.site/og-image.png",
        width: 1920,
        height: 1080,
        alt: "shwcs — Explora proyectos, descubre herramientas y conecta con sus operadores.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "shwcs | Proyectos para tu empresa",
    description: "Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.",
    images: ["https://shwcs.site/og-image.png"],
  },
};

export default async function RootLayout(
  props: Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }>
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  return (
    <html lang={locale}>
      <body className={cn("min-h-screen bg-[#f5f5f4] font-sans antialiased", inter.variable)}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-stone-900 focus:shadow-lg">Saltar al contenido</a>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
