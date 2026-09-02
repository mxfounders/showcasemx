import type { Metadata } from "next";
import { NewsletterUnsubscribe } from "@/components/newsletter-unsubscribe";

export const metadata: Metadata = {
  title: "Cancelar newsletter | shwcs",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token;
  return <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
    <NewsletterUnsubscribe token={typeof token === "string" ? token : ""} />
  </section>;
}

