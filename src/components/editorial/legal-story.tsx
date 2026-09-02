'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LegalStoryProps {
  page: {
    title: string;
    intro: string;
    sections: [string, string | string[]][];
  };
}

export function LegalStory({ page }: LegalStoryProps) {
  const [activeSection, setActiveSection] = useState<number>(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(Number(entry.target.getAttribute('data-index')));
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const elements = document.querySelectorAll('.legal-section');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (index: number) => {
    const element = document.getElementById(`section-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <article className="pb-24 sm:pb-32">
      
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            {page.title}
          </h1>

          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              {page.intro}
            </p>
            <Link href="/" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
              Volver al inicio
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── SECTIONS & SIDEBAR ───────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[300px_1fr] lg:gap-24 xl:grid-cols-[320px_1fr]">
          
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-32 flex flex-col items-start gap-1">
              {page.sections.map(([title], index) => (
                <button
                  key={title}
                  onClick={() => scrollToSection(index)}
                  className={`w-full rounded-[14px] px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeSection === index
                      ? 'bg-[#E4EBFC] text-[#365DC4]'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          {/* Text Content */}
          <div className="divide-y divide-stone-200">
            {page.sections.map(([secTitle, secText], index) => (
              <div
                key={secTitle}
                id={`section-${index}`}
                data-index={index}
                className="legal-section scroll-mt-32 py-10 first:pt-0 lg:py-16"
              >
                <h2 className="mb-6 text-2xl font-semibold tracking-[-0.03em] text-stone-900 sm:text-3xl">
                  {secTitle}
                </h2>
                <div className="space-y-5">
                  {Array.isArray(secText) ? (
                    secText.map((p, i) => (
                      <p key={i} className="max-w-3xl text-lg leading-relaxed text-stone-600">
                        {p}
                      </p>
                    ))
                  ) : (
                    <p className="max-w-3xl text-lg leading-relaxed text-stone-600">
                      {secText}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

    </article>
  );
}
