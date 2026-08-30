import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ShowcaseMX | B2B Software",
  description: "Directorio curado de software B2B para founders y corporativos en México.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}
      >
        <Navbar />
        <main className="pt-24 pb-16">
          {children}
        </main>
      </body>
    </html>
  );
}
