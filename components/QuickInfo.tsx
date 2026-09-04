"use client";

import { useEffect, useRef, useState } from "react";

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
    teamGoalsFor: number;
    teamGoalsAgainst: number;
    teamCrestUrl: string | null;
  };

  form: {
    results: string[];
    games: number;
      wins: number;
    draws: number;
    losses: number;
    winPercentage: number;
  };

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
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (cards.length <= 1 || isPaused) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % cards.length);
    }, 5500);

    return () => clearInterval(timer);
  }, [cards.length, isPaused]);

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
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/55">
            {competition}
          </p>

          <p className="mt-4 text-sm text-black/55">
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
              : "text-[9px] font-bold uppercase tracking-[0.2em] text-black/55"
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
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black/55">

                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-hidden border border-black/10 bg-white shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="border-b border-black/10 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#c8102e]">
              Club Update
            </p>

            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/65">
              {card.label} · 2026 SEASON
            </p>
          </div>

          <span className="text-[10px] font-semibold tracking-widest text-black/50">
            {String(current + 1).padStart(2, "0")} /{" "}
            {String(cards.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <div
        className="min-h-[230px] touch-pan-y px-5 py-6 transition-transform duration-300 sm:px-7 sm:py-7"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;

          const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
          const deltaX = endX - touchStartX.current;

          if (Math.abs(deltaX) >= 50) {
            setCurrent((prev) =>
              deltaX < 0
                ? (prev + 1) % cards.length
                : (prev - 1 + cards.length) % cards.length
            );
          }

          touchStartX.current = null;
        }}
      >
        {card.id === "top-scorer" && (
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
                Top Scorer
              </h2>

              <p className="mt-1 text-xs text-black/65">
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

              <div>
                <ScorerGroup
                  scorers={data.topScorer.overall}
                  competition="Overall · All Competitions"
                  highlight
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="border border-black/10 bg-black/[0.025] p-3">
                    <div className="flex items-center gap-2">
                      {data.topScorer.teamCrestUrl ? (
                        <img
                          src={data.topScorer.teamCrestUrl}
                          alt="Langsning FC"
                          className="h-7 w-7 object-contain"
                        />
                      ) : null}
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                          Langsning FC
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/55">
                          Goals For
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-black text-black">
                      {data.topScorer.teamGoalsFor}
                    </p>
                  </div>

                  <div className="border border-black/10 bg-black/[0.025] p-3">
                    <div className="flex items-center gap-2">
                      {data.topScorer.teamCrestUrl ? (
                        <img
                          src={data.topScorer.teamCrestUrl}
                          alt="Langsning FC"
                          className="h-7 w-7 object-contain"
                        />
                      ) : null}
                      <div>
                        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                          Langsning FC
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/55">
                          Goals Against
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-black text-black">
                      {data.topScorer.teamGoalsAgainst}
                    </p>
                  </div>
                </div>
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

              <p className="mt-1 text-xs text-black/65">
                Langsning FC · All finished matches in 2026
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {data.form.results.map((result, index) => (
                <div
                  key={`${result}-${index}`}
                  className={`flex h-12 w-12 items-center justify-center border text-base font-black ${
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

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border border-black/10 bg-black/[0.025] px-3 py-3">
                <p className="text-lg font-black text-black">
                  {data.form.games}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-black/55">
                  Games
                </p>
              </div>

              <div className="border border-green-200 bg-green-50 px-3 py-3">
                <p className="text-lg font-black text-green-600">
                  {data.form.wins}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-green-600/70">
                  Wins
                </p>
              </div>

              <div className="border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-lg font-black text-amber-600">
                  {data.form.draws}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600/70">
                  Draws
                </p>
              </div>

              <div className="border border-red-200 bg-red-50 px-3 py-3">
                <p className="text-lg font-black text-red-600">
                  {data.form.losses}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-red-600/70">
                  Losses
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-green-600">
                    Win
                  </p>
                  <p className="mt-1 text-lg font-black text-black">
                    {data.form.games > 0
                      ? Math.round((data.form.wins / data.form.games) * 1000) / 10
                      : 0}%
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600">
                    Draw
                  </p>
                  <p className="mt-1 text-lg font-black text-black">
                    {data.form.games > 0
                      ? Math.round((data.form.draws / data.form.games) * 1000) / 10
                      : 0}%
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-600">
                    Loss
                  </p>
                  <p className="mt-1 text-lg font-black text-black">
                    {data.form.games > 0
                      ? Math.round((data.form.losses / data.form.games) * 1000) / 10
                      : 0}%
                  </p>
                </div>
              </div>

              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${
                      data.form.games > 0
                        ? (data.form.wins / data.form.games) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-amber-400"
                  style={{
                    width: `${
                      data.form.games > 0
                        ? (data.form.draws / data.form.games) * 100
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${
                      data.form.games > 0
                        ? (data.form.losses / data.form.games) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="mt-2 flex justify-between text-[8px] font-bold uppercase tracking-[0.12em] text-black/45">
                <span>Win</span>
                <span>Draw</span>
                <span>Loss</span>
              </div>
            </div>

            <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-black/50">
              Most recent result first
            </p>
          </div>
        )}

        {card.id === "biggest-win" && (
          <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-black/55">
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

                <p className="mt-1 text-xs text-black/55">
                  Biggest winning margin · 2026 season
                </p>
              </>
            ) : (
              <p className="mt-5 text-sm text-black/55">
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
                  ? "w-8 scale-110 bg-[#c8102e] shadow-sm"
                  : "w-2 bg-black/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
