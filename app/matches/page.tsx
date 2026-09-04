"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

type Team = {
  name: string;
  short_name?: string | null;
  crest_url?: string | null;
};

type Match = {
  id: number;
  competition: string;
  season: string;
  matchday?: string | null;
  date: string;
  time?: string | null;
  venue?: string | null;
  home_team_id: number;
  away_team_id: number;
  home_score?: number | null;
  away_score?: number | null;
  status?: string | null;
  home_team?: Team | null;
  away_team?: Team | null;
};

function StatusPill({ status }: { status?: string | null }) {
  const isFinished = status === "finished";
  const isLive = status === "live";

  const label = isFinished
    ? "Full Time"
    : isLive
    ? "Live"
    : status === "pending"
    ? "Scheduled"
    : status || "Scheduled";

  return (
    <span
      className={`mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${
        isLive
          ? "border-[#c8102e] text-[#c8102e]"
          : isFinished
          ? "border-[#1c1817]/15 text-[#83766c]"
          : "border-[#83766c]/30 text-[#83766c]"
      }`}
    >
      {isLive && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8102e]" />
      )}
      {label}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
    >
      <path
        d="M6 3.5L10.5 8L6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Collapsible({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-in-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-[#1c1817]/10 bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="h-4 w-4 rounded bg-[#1c1817]/10" />
          <div className="h-8 w-24 rounded bg-[#1c1817]/10" />
        </div>
        <div className="h-3 w-16 rounded bg-[#1c1817]/10" />
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openSeasons, setOpenSeasons] = useState<Record<string, boolean>>({});
  const [openCompetitions, setOpenCompetitions] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    async function loadMatches() {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          *,
          home_team:teams!matches_home_team_id_fkey (
            name,
            short_name,
            crest_url
          ),
          away_team:teams!matches_away_team_id_fkey (
            name,
            short_name,
            crest_url
          )
        `
        );

      if (error) {
        console.error("MATCHES ERROR:", error);
        setError(true);
        setMatches([]);
      } else {
        const sortedMatches = (data || []).sort((a: Match, b: Match) => {
          const now = new Date();

          const aDate = new Date(
            `${a.date}T${a.time || "00:00:00"}`
          );

          const bDate = new Date(
            `${b.date}T${b.time || "00:00:00"}`
          );

          const aUpcoming = aDate > now;
          const bUpcoming = bDate > now;

          // Played matches first
          if (aUpcoming !== bUpcoming) {
            return aUpcoming ? 1 : -1;
          }

          // Played matches: newest first
          if (!aUpcoming && !bUpcoming) {
            return bDate.getTime() - aDate.getTime();
          }

          // Upcoming matches: earliest first
          return aDate.getTime() - bDate.getTime();
        });

        setMatches(sortedMatches);

        const seasons = Array.from(
          new Set(
            sortedMatches.map(
              (m: Match) => m.season || "Unknown Season"
            )
          )
        );

        seasons.sort((a, b) => b.localeCompare(a));

        if (seasons[0]) {
          setOpenSeasons({ [seasons[0]]: true });
        }
      }

      setLoading(false);
    }

    loadMatches();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Match[]>> = {};

    matches.forEach((match) => {
      const season = match.season || "Unknown Season";
      const competition = match.competition || "Other Matches";

      if (!map[season]) {
        map[season] = {};
      }

      if (!map[season][competition]) {
        map[season][competition] = [];
      }

      map[season][competition].push(match);
    });

    return map;
  }, [matches]);

  const seasons = Object.keys(grouped).sort((a, b) =>
    b.localeCompare(a)
  );

  const seasonCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    seasons.forEach((season) => {
      counts[season] = Object.values(grouped[season]).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
    });

    return counts;
  }, [seasons, grouped]);

  function toggleSeason(season: string) {
    setOpenSeasons((prev) => ({
      ...prev,
      [season]: !prev[season],
    }));
  }

  function toggleCompetition(key: string) {
    setOpenCompetitions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <main className="min-h-screen bg-[#faf8f4] text-[#1c1817]">
      <Navbar />

      <section className="border-b border-[#1c1817]/10 px-6 pb-12 pt-32">
        <div className="mx-auto max-w-4xl">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[#c8102e]">
            Langsning FC
          </p>

          <h1
            className="mt-3 text-5xl font-semibold md:text-6xl"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Match Centre
          </h1>

          <p className="mt-4 max-w-xl text-[#83766c]">
            Results, fixtures and match records from Langsning FC.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl">
          {loading ? (
            <div className="space-y-4">
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[#c8102e]/20 bg-[#c8102e]/5 p-10 text-center">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[#c8102e]">
                Couldn't load matches — please try again shortly
              </p>
            </div>
          ) : seasons.length === 0 ? (
            <div className="rounded-lg border border-[#1c1817]/10 bg-white p-10 text-center">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[#83766c]">
                No matches recorded yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map((season) => {
                const seasonOpen = openSeasons[season] ?? false;

                return (
                  <div
                    key={season}
                    className="overflow-hidden rounded-lg border border-[#1c1817]/10 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* YEAR */}
                    <button
                      onClick={() => toggleSeason(season)}
                      aria-expanded={seasonOpen}
                      className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors hover:bg-[#f4f1eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]/40 sm:px-6"
                    >
                      <div className="flex items-center gap-4 text-[#c8102e]">
                        <ChevronIcon open={seasonOpen} />

                        <h2
                          className="text-3xl font-semibold text-[#1c1817] sm:text-4xl"
                          style={{ fontFamily: "'Fraunces', serif" }}
                        >
                          {season === "2026" ? "2026-27" : season}
                        </h2>
                      </div>

                      <span className="mono text-xs text-[#83766c]">
                        {seasonCounts[season]} matches
                      </span>
                    </button>

                    {/* TOURNAMENTS */}
                    <Collapsible open={seasonOpen}>
                      <div className="border-t border-[#1c1817]/10 bg-[#faf8f4] p-3 sm:p-4">
                        <div className="space-y-3">
                          {Object.entries(grouped[season]).map(
                            ([competition, competitionMatches]) => {
                              const key = `${season}-${competition}`;
                              const competitionOpen =
                                openCompetitions[key] ?? false;

                              return (
                                <div
                                  key={key}
                                  className="overflow-hidden rounded-md border border-[#1c1817]/10 bg-white"
                                >
                                  {/* TOURNAMENT */}
                                  <button
                                    onClick={() =>
                                      toggleCompetition(key)
                                    }
                                    aria-expanded={competitionOpen}
                                    className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-[#f4f1eb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8102e]/40 sm:px-5"
                                  >
                                    <div className="flex items-center gap-3 text-[#c8102e]">
                                      <ChevronIcon
                                        open={competitionOpen}
                                      />

                                      <div>
                                        <p className="mono text-[9px] uppercase tracking-[0.2em] text-[#83766c]">
                                          Tournament
                                        </p>

                                        <h3 className="mt-1 font-semibold text-[#1c1817]">
                                          {competition}
                                        </h3>
                                      </div>
                                    </div>

                                    <span className="mono text-xs text-[#83766c]">
                                      {competitionMatches.length}
                                    </span>
                                  </button>

                                  {/* MATCHES */}
                                  <Collapsible open={competitionOpen}>
                                    <div className="divide-y divide-[#1c1817]/8 border-t border-[#1c1817]/10">
                                      {competitionMatches.map((match) => {
                                        const date = match.date
                                          ? new Date(
                                              match.date
                                            ).toLocaleDateString(
                                              "en-IN",
                                              {
                                                day: "numeric",
                                                month: "short",
                                              }
                                            )
                                          : "";

                                        const isFinished =
                                          match.status === "finished";

                                        const hasScore =
                                          match.home_score !== null &&
                                          match.home_score !== undefined &&
                                          match.away_score !== null &&
                                          match.away_score !== undefined;

                                        return (
                                          <Link
                                            key={match.id}
                                            href={`/matches/${match.id}`}
                                            className="group block px-4 py-5 transition-colors hover:bg-[#faf8f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#c8102e]/40 sm:px-5 sm:py-6"
                                          >
                                            {/* DATE + STATUS */}
                                            <div className="flex items-center justify-between gap-3">
                                              <div>
                                                <p className="mono text-[11px] font-medium text-[#83766c]">
                                                  {date}
                                                </p>

                                                {match.matchday && (
                                                  <p className="mono mt-1 text-[9px] uppercase tracking-wide text-[#83766c]/70">
                                                    MD {match.matchday}
                                                  </p>
                                                )}
                                              </div>

                                              <StatusPill
                                                status={match.status}
                                              />
                                            </div>

                                            {/* MATCH */}
                                            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                                              {/* HOME TEAM */}
                                              <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                                                <span className="text-right text-sm font-semibold leading-tight sm:text-base">
                                                  {match.home_team?.name ||
                                                    `Team ${match.home_team_id}`}
                                                </span>

                                                {match.home_team?.crest_url ? (
                                                  <img
                                                    src={
                                                      match.home_team
                                                        .crest_url
                                                    }
                                                    alt={
                                                      match.home_team.name
                                                    }
                                                    className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
                                                  />
                                                ) : (
                                                  <div className="h-9 w-9 shrink-0 rounded-full bg-[#f4f1eb] sm:h-11 sm:w-11" />
                                                )}
                                              </div>

                                              {/* SCORE / TIME */}
                                              <div className="min-w-[72px] text-center sm:min-w-[90px]">
                                                {isFinished || hasScore ? (
                                                  <p className="mono text-xl font-semibold tracking-tight sm:text-2xl">
                                                    {match.home_score ?? "–"}{" "}
                                                    <span className="mx-1 text-[#83766c]">
                                                      –
                                                    </span>{" "}
                                                    {match.away_score ?? "–"}
                                                  </p>
                                                ) : match.time ? (
                                                  <div>
                                                    <p className="mono text-lg font-semibold sm:text-xl">
                                                      {match.time.slice(0, 5)}
                                                    </p>

                                                    <p className="mono mt-1 text-[8px] uppercase tracking-wider text-[#83766c]">
                                                      Kickoff
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <p className="mono text-lg font-semibold text-[#83766c]">
                                                    vs
                                                  </p>
                                                )}
                                              </div>

                                              {/* AWAY TEAM */}
                                              <div className="flex min-w-0 items-center justify-start gap-2 sm:gap-3">
                                                {match.away_team?.crest_url ? (
                                                  <img
                                                    src={
                                                      match.away_team
                                                        .crest_url
                                                    }
                                                    alt={
                                                      match.away_team.name
                                                    }
                                                    className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
                                                  />
                                                ) : (
                                                  <div className="h-9 w-9 shrink-0 rounded-full bg-[#f4f1eb] sm:h-11 sm:w-11" />
                                                )}

                                                <span className="text-left text-sm font-semibold leading-tight sm:text-base">
                                                  {match.away_team?.name ||
                                                    `Team ${match.away_team_id}`}
                                                </span>
                                              </div>
                                            </div>

                                            {/* VENUE + ARROW */}
                                            <div className="mt-5 flex items-center justify-between gap-4">
                                              {match.venue ? (
                                                <p className="mono text-[10px] uppercase tracking-wide text-[#83766c]/70">
                                                  {match.venue}
                                                </p>
                                              ) : (
                                                <span />
                                              )}

                                              <span className="text-lg text-[#83766c] transition-transform group-hover:translate-x-1">
                                                →
                                              </span>
                                            </div>
                                          </Link>
                                        );
                                      })}
                                    </div>
                                  </Collapsible>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </Collapsible>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
