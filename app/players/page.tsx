"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { squads } from "@/data/squads";

export default function Players() {
  const [openSeason, setOpenSeason] = useState(squads[0]?.season ?? null);

  return (
    <main className="bg-black pt-16 md:pt-20">
      <Navbar />

      <section className="bg-[#faf8f4] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-[0.3em] text-red-700">Squads</p>
          <h2 className="mt-4 text-4xl font-semibold">Season by Season</h2>

          <div className="mt-10 space-y-4">
            {squads.map((squad) => {
              const isOpen = openSeason === squad.season;

              return (
                <div
                  key={squad.season}
                  className="rounded-lg border border-black/10 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setOpenSeason(isOpen ? null : squad.season)}
                    className="flex w-full items-center justify-between p-6 text-left"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-red-700">
                        {squad.season} Season
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold">Squad</h3>
                    </div>
                    <span className="text-2xl text-red-700">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-black/10 p-6">
                      {squad.note && (
                        <p className="mb-6 max-w-2xl text-base text-gray-600">
                          {squad.note}
                        </p>
                      )}

                      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
                        {squad.players.map((p, idx) => (
                          <div
                            key={p.name}
                            className="group relative rounded-lg border-l-4 border-red-700 bg-white p-5 shadow-sm transition hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-serif text-xl font-semibold leading-snug text-[#1c1817]">
                                {p.name}
                              </h4>
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1817] font-mono text-sm font-bold text-white">
                                {String(idx + 1).padStart(2, "0")}
                              </div>
                            </div>

                            <span className="mt-3 inline-block rounded-full bg-red-700/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">
                              {p.position}
                            </span>

                            {p.note && (
                              <p className="mt-3 text-sm leading-6 text-gray-500">
                                {p.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {squad.achievement && (
                        <div className="mt-8 rounded-lg bg-[#1c1817] p-6 text-white">
                          <p className="text-xs uppercase tracking-[0.3em] text-red-300">
                            Achievement
                          </p>
                          <p className="mt-2 font-serif text-lg font-semibold">
                            🏆 {squad.achievement}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
