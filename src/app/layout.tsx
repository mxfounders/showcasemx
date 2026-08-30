import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ShowcaseMX | Software B2B Mexicano",
  description: "Catálogo curado de software B2B construido por operadores mexicanos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn("min-h-screen bg-[#f5f5f4] font-sans antialiased", inter.variable)}>
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
