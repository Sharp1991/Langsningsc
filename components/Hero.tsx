"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Article = {
  id: number;
  title: string;
  image_url?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  category?: string | null;
  published_date?: string | null;
};

export default function Hero({ articles }: { articles: Article[] }) {
  const slides = [
    {
      type: "club" as const,
      id: "club",
      image: "/hero.png",
    },
    ...articles.map((article) => ({
      type: "article" as const,
      ...article,
    })),
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[current];

  return (
    <section className="relative overflow-hidden bg-[#c8102e] pt-16 md:pt-20">
      <div className="relative h-[45vh] min-h-[300px] max-h-[520px] w-full">

        {/* SLIDES */}
        {slides.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={
                item.type === "club"
                  ? item.image
                  : item.image_url || "/hero.png"
              }
              alt={
                item.type === "club"
                  ? "Langsning FC"
                  : item.title
              }
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          </div>
        ))}

        {/* CLUB SLIDE */}
        {slide.type === "club" && (
          <div className="absolute bottom-0 left-0 z-10 w-full px-6 pb-10 md:px-16 md:pb-12">
            <div className="max-w-xl">
              <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/70">
                Langsning FC
              </p>

              <h1
                className="text-3xl font-extrabold uppercase leading-none text-[#c8102e] sm:text-4xl md:text-6xl"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                WE ARE
                <br />
                LANGSNING
              </h1>

              <p className="mt-3 text-sm text-white/80 md:text-base">
                United by Football. Driven by Passion.
              </p>
            </div>
          </div>
        )}

        {/* ARTICLE SLIDE */}
        {slide.type === "article" && (
          <div className="absolute bottom-0 left-0 z-10 w-full px-6 pb-10 md:px-16 md:pb-12">
            <div className="max-w-xl">
              {slide.category && (
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#c8102e]">
                  {slide.category}
                </p>
              )}

              <Link
                href={`/articles/${slide.slug || slide.id}`}
              >
                <h2
                  className="text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {slide.title}
                </h2>
              </Link>

              <Link
                href={`/articles/${slide.slug || slide.id}`}
                className="mt-3 inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80 hover:text-white"
              >
                Read story →
              </Link>
            </div>
          </div>
        )}

        {/* DOTS */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 right-6 z-20 flex gap-2 md:right-16">
            {slides.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrent(index)}
                aria-label={`Show slide ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === current
                    ? "w-8 bg-white"
                    : "w-2 bg-white/50 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
