"use client";

import { useEffect, useState } from "react";

type Scorer = {
  playerId: number | null;
  name: string;
  goals: number;
  imageUrl: string | null;
};

type QuickInfoData = {
  topScorer: {
    spl: Scorer[];
    durand: Scorer[];
    overall: Scorer[];
  };

  form: string[];

  biggestWin: {
    score: string;
    opponent: string;
    competition: string;
    langsningCrestUrl: string | null;
    opponentCrestUrl: string | null;
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

  function ScorerGroup({
    scorers,
    competition,
    highlight = false,
  }: {
    scorers: Scorer[];
    competition: string;
    highlight?: boolean;
  }) {
    if (scorers.length === 0) {
      return (
        <div className="border border-black/10 bg-black/[0.025] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
            {competition}
          </p>

          <p className="mt-4 text-sm text-black/40">
            No goals recorded
          </p>
        </div>
      );
    }

    return (
      <div
        className={
          highlight
            ? "border border-[#c8102e]/20 bg-[#c8102e]/[0.035] p-4"
            : "border border-black/10 bg-black/[0.025] p-4"
        }
      >
        <p
          className={
            highlight
              ? "text-[9px] font-bold uppercase tracking-[0.2em] text-[#c8102e]"
              : "text-[9px] font-bold uppercase tracking-[0.2em] text-black/40"
          }
        >
          {competition}
        </p>

        <div className="mt-4 space-y-3">
          {scorers.map((scorer) => (
            <div
              key={`${competition}-${scorer.playerId}-${scorer.name}`}
              className="flex items-center gap-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white">
                {scorer.imageUrl ? (
                  <img
                    src={scorer.imageUrl}
                    alt={scorer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[8px] font-bold uppercase tracking-widest text-black/25">
                    IMG
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-base font-bold uppercase leading-tight text-black">
                  {scorer.name}
                </p>

                <p className="mt-1 text-xl font-black uppercase text-[#c8102e]">
                  {scorer.goals}{" "}
                  {scorer.goals === 1 ? "Goal" : "Goals"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden border border-black/10 bg-white shadow-sm">
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
              <ScorerGroup
                scorers={data.topScorer.spl}
                competition="Shillong Premier League"
              />

              <ScorerGroup
                scorers={data.topScorer.durand}
                competition="IndianOil Durand Cup"
              />

              <ScorerGroup
                scorers={data.topScorer.overall}
                competition="Overall"
                highlight
              />
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
                  className={`flex h-14 w-14 items-center justify-center border text-lg font-black ${
                    result === "W"
                      ? "border-green-200 bg-green-50 text-green-600"
                      : result === "D"
                        ? "border-amber-200 bg-amber-50 text-amber-600"
                        : "border-red-200 bg-red-50 text-red-600"
                  }`}
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
          <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/40">
              Biggest Victory
            </p>

            {data.biggestWin ? (
              <>
                <div className="mt-5 flex items-center justify-center gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white">
                    {data.biggestWin.langsningCrestUrl ? (
                      <img
                        src={data.biggestWin.langsningCrestUrl}
                        alt="Langsning FC"
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">
                        LFC
                      </span>
                    )}
                  </div>

                  <span className="text-5xl font-black tracking-tight text-[#c8102e] sm:text-6xl">
                    {data.biggestWin.score}
                  </span>

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white">
                    {data.biggestWin.opponentCrestUrl ? (
                      <img
                        src={data.biggestWin.opponentCrestUrl}
                        alt={data.biggestWin.opponent}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-[8px] font-bold uppercase tracking-widest text-black/20">
                        CREST
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xl font-bold text-black sm:text-2xl">
                  Langsning FC vs {data.biggestWin.opponent}
                </p>

                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c8102e]">
                  {data.biggestWin.competition}
                </p>

                <p className="mt-1 text-xs text-black/40">
                  Biggest winning margin · 2026 season
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
