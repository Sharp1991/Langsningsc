"use client";

import { useEffect, useState } from "react";

type Scorer = {
  name: string;
  goals: number;
} | null;

type QuickInfoData = {
  topScorer: {
    spl: Scorer;
    durand: Scorer;
    overall: Scorer;
  };

  form: string[];

  biggestWin: {
    score: string;
    opponent: string;
  } | null;
};

export default function QuickInfo({
  data,
}: {
  data: QuickInfoData;
}) {
  const cards = [
    {
      id: "top-scorer",
      label: "TOP SCORER",
    },
    {
      id: "form",
      label: "CURRENT FORM",
    },
    {
      id: "biggest-win",
      label: "BIGGEST WIN",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (cards.length <= 1) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % cards.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [cards.length]);

  const card = cards[current];

  return (
    <div className="w-full overflow-hidden border border-black/10 bg-white shadow-sm">
      {/* HEADER */}
      <div className="border-b border-black/10 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#c8102e]">
              Club Update
            </p>

            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
              {card.label} · 2026 SEASON
            </p>
          </div>

          <span className="text-[10px] font-semibold tracking-widest text-black/30">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(cards.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-[230px] px-5 py-6 sm:px-7 sm:py-7">
        {card.id === "top-scorer" && (
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
                Top Scorer
              </h2>

              <p className="mt-1 text-xs text-black/45">
                Langsning FC · 2026 season
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {/* SPL */}
              <div className="border border-black/10 bg-black/[0.025] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                  Shillong Premier League
                </p>

                {data.topScorer.spl ? (
                  <div className="mt-4">
                    <p className="text-lg font-bold text-black">
                      {data.topScorer.spl.name}
                    </p>

                    <p className="mt-1 text-2xl font-black uppercase text-[#c8102e]">
                      {data.topScorer.spl.goals}{" "}
                      {data.topScorer.spl.goals === 1
                        ? "Goal"
                        : "Goals"}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-wider text-black/35">
                      SPL 2026
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-black/40">
                    No goals recorded
                  </p>
                )}
              </div>

              {/* DURAND CUP */}
              <div className="border border-black/10 bg-black/[0.025] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                  IndianOil Durand Cup
                </p>

                {data.topScorer.durand ? (
                  <div className="mt-4">
                    <p className="text-lg font-bold text-black">
                      {data.topScorer.durand.name}
                    </p>

                    <p className="mt-1 text-2xl font-black uppercase text-[#c8102e]">
                      {data.topScorer.durand.goals}{" "}
                      {data.topScorer.durand.goals === 1
                        ? "Goal"
                        : "Goals"}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-wider text-black/35">
                      Durand Cup 2026
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-black/40">
                    No goals recorded
                  </p>
                )}
              </div>

              {/* OVERALL */}
              <div className="border border-[#c8102e]/20 bg-[#c8102e]/[0.035] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8102e]">
                  Overall
                </p>

                {data.topScorer.overall ? (
                  <div className="mt-4">
                    <p className="text-lg font-bold text-black">
                      {data.topScorer.overall.name}
                    </p>

                    <p className="mt-1 text-2xl font-black uppercase text-[#c8102e]">
                      {data.topScorer.overall.goals}{" "}
                      {data.topScorer.overall.goals === 1
                        ? "Goal"
                        : "Goals"}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-wider text-black/35">
                      Overall 2026
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-black/40">
                    No goals recorded
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {card.id === "form" && (
          <div className="flex min-h-[180px] flex-col justify-center">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
                Current Form
              </h2>

              <p className="mt-1 text-xs text-black/45">
                Langsning FC · Last 5 finished matches
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {data.form.map((result, index) => (
                <div
                  key={`${result}-${index}`}
                  className="flex h-14 w-14 items-center justify-center border border-black/10 bg-black/[0.025] text-lg font-black"
                >
                  {result}
                </div>
              ))}
            </div>

            <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-black/35">
              Most recent result first
            </p>
          </div>
        )}

        {card.id === "biggest-win" && (
          <div className="flex min-h-[180px] flex-col justify-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40">
              Biggest Victory
            </p>

            {data.biggestWin ? (
              <>
                <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-2">
                  <span className="text-5xl font-black tracking-tight text-[#c8102e] sm:text-6xl">
                    {data.biggestWin.score}
                  </span>

                  <span className="pb-1 text-xl font-bold text-black sm:text-2xl">
                    {data.biggestWin.opponent}
                  </span>
                </div>

                <p className="mt-4 text-xs text-black/45">
                  Langsning FC · Biggest winning margin in
                  the 2026 season
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm text-black/40">
                No wins recorded yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* DOT NAVIGATION */}
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-black/10 px-5 py-3">
          {cards.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.label}`}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === current
                  ? "w-8 bg-[#c8102e]"
                  : "w-2 bg-black/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
