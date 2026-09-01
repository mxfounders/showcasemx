import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://shwcs.site"),
  title: "shwcs | Proyectos para tu empresa",
  description: "Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.",
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "shwcs",
    title: "shwcs | Proyectos para tu empresa",
    description: "Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.",
    url: "https://shwcs.site",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn("min-h-screen bg-[#f5f5f4] font-sans antialiased", inter.variable)}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-stone-900 focus:shadow-lg">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
