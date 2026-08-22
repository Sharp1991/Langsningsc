"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const LANGSNING_TEAM_ID = 1;

type Team = {
  name: string;
  short_name?: string | null;
  crest_url?: string | null;
};

type Match = {
  id: number;
  competition: string;
  season: string;
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

function getMatchDate(match: Match) {
  return new Date(`${match.date}T${match.time || "00:00:00"}`);
}

function Countdown({ target }: { target: Date }) {
  const [timeLeft, setTimeLeft] = useState(
    target.getTime() - new Date().getTime()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(target.getTime() - new Date().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [target]);

  if (timeLeft <= 0) {
    return (
      <div className="mono text-center text-xs uppercase tracking-[0.2em] text-[#c8102e]">
        Match Started
      </div>
    );
  }

  const totalSeconds = Math.floor(timeLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="mt-4 grid grid-cols-4 gap-2">
      <div className="rounded-md bg-[#1c1817] px-2 py-3 text-center text-white">
        <p className="text-xl font-semibold sm:text-2xl">{days}</p>
        <p className="mono mt-1 text-[8px] uppercase tracking-wider text-white/50">
          Days
        </p>
      </div>

      <div className="rounded-md bg-[#1c1817] px-2 py-3 text-center text-white">
        <p className="text-xl font-semibold sm:text-2xl">{hours}</p>
        <p className="mono mt-1 text-[8px] uppercase tracking-wider text-white/50">
          Hrs
        </p>
      </div>

      <div className="rounded-md bg-[#1c1817] px-2 py-3 text-center text-white">
        <p className="text-xl font-semibold sm:text-2xl">{minutes}</p>
        <p className="mono mt-1 text-[8px] uppercase tracking-wider text-white/50">
          Min
        </p>
      </div>

      <div className="rounded-md bg-[#c8102e] px-2 py-3 text-center text-white">
        <p className="text-xl font-semibold sm:text-2xl">{seconds}</p>
        <p className="mono mt-1 text-[8px] uppercase tracking-wider text-white/80">
          Sec
        </p>
      </div>
    </div>
  );
}

function PreviousMatchCard({ match }: { match: Match }) {
  const date = getMatchDate(match);

  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block min-w-[250px] snap-start rounded-lg border border-[#1c1817]/10 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:min-w-0 sm:flex-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono text-[9px] uppercase tracking-[0.15em] text-[#83766c]">
            {formattedDate}
          </p>

          <p className="mono mt-1 text-[8px] uppercase tracking-[0.12em] text-[#c8102e]">
            {match.competition}
          </p>
        </div>

        <span className="mono text-[9px] uppercase tracking-wider text-[#83766c]">
          FT
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {match.home_team?.crest_url ? (
              <img
                src={match.home_team.crest_url}
                alt={match.home_team.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded-full bg-[#e9e4da]" />
            )}

            <span className="truncate text-sm font-medium text-[#1c1817]">
              {match.home_team?.short_name ||
                match.home_team?.name ||
                `Team ${match.home_team_id}`}
            </span>
          </div>

          <span className="mono text-base font-semibold text-[#1c1817]">
            {match.home_score ?? "–"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {match.away_team?.crest_url ? (
              <img
                src={match.away_team.crest_url}
                alt={match.away_team.name}
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded-full bg-[#e9e4da]" />
            )}

            <span className="truncate text-sm font-medium text-[#1c1817]">
              {match.away_team?.short_name ||
                match.away_team?.name ||
                `Team ${match.away_team_id}`}
            </span>
          </div>

          <span className="mono text-base font-semibold text-[#1c1817]">
            {match.away_score ?? "–"}
          </span>
        </div>
      </div>

      <p className="mono mt-5 text-[9px] uppercase tracking-[0.15em] text-[#83766c] transition-colors group-hover:text-[#c8102e]">
        Match Details →
      </p>
    </Link>
  );
}

export default function NextMatch() {
  const [match, setMatch] = useState<Match | null>(null);
  const [previousMatches, setPreviousMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatches() {
      const now = new Date();

      const { data: upcomingData, error: upcomingError } = await supabase
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
        )
        .eq("status", "pending");

      if (upcomingError) {
        console.error("NEXT MATCH ERROR:", upcomingError);
        setLoading(false);
        return;
      }

      const upcomingMatches = (upcomingData || [])
        .filter((item: Match) => getMatchDate(item) > now)
        .sort(
          (a: Match, b: Match) =>
            getMatchDate(a).getTime() - getMatchDate(b).getTime()
        );

      setMatch(upcomingMatches[0] || null);

      const { data: previousData, error: previousError } = await supabase
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
        )
        .eq("status", "finished")
        .or(
          `home_team_id.eq.${LANGSNING_TEAM_ID},away_team_id.eq.${LANGSNING_TEAM_ID}`
        )
        .order("date", { ascending: false })
        .limit(4);

      if (previousError) {
        console.error("PREVIOUS MATCHES ERROR:", previousError);
        setPreviousMatches([]);
      } else {
        setPreviousMatches(previousData || []);
      }

      setLoading(false);
    }

    loadMatches();
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-[#1c1817]/10 bg-[#faf8f4] p-6">
        <div className="animate-pulse">
          <div className="h-3 w-24 rounded bg-[#1c1817]/10" />
          <div className="mx-auto mt-8 h-8 w-48 rounded bg-[#1c1817]/10" />
          <div className="mx-auto mt-4 h-3 w-32 rounded bg-[#1c1817]/10" />
          <div className="mt-6 h-20 rounded bg-[#1c1817]/10" />
        </div>
      </section>
    );
  }

  if (!match) {
    return null;
  }

  const matchDate = getMatchDate(match);

  const formattedDate = matchDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = matchDate.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section className="overflow-hidden rounded-xl border border-[#1c1817]/10 bg-[#faf8f4] text-[#1c1817] shadow-sm">

      <div className="p-6 sm:p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.25em] text-[#c8102e]">
              Langsning FC
            </p>

            <h2
              className="mt-2 text-2xl font-semibold sm:text-3xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Next Match
            </h2>
          </div>

          <Link
            href={`/matches/${match.id}`}
            className="mono hidden text-[10px] uppercase tracking-[0.15em] text-[#83766c] transition-colors hover:text-[#c8102e] sm:block"
          >
            View Match →
          </Link>
        </div>

        {/* COUNTDOWN */}
        <div className="mx-auto mt-7 max-w-md">
          <p className="mono text-center text-[9px] uppercase tracking-[0.25em] text-[#83766c]">
            Kickoff In
          </p>

          <Countdown target={matchDate} />
        </div>

        {/* TEAMS */}
        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">

          {/* HOME */}
          <div className="flex min-w-0 flex-col items-center text-center">
            {match.home_team?.crest_url ? (
              <img
                src={match.home_team.crest_url}
                alt={match.home_team.name}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-[#e9e4da] sm:h-20 sm:w-20" />
            )}

            <p className="mt-3 text-sm font-semibold leading-tight sm:text-base">
              {match.home_team?.name || `Team ${match.home_team_id}`}
            </p>
          </div>

          {/* VS */}
          <div className="text-center">
            <p className="mono text-xs uppercase tracking-[0.2em] text-[#83766c]">
              VS
            </p>
          </div>

          {/* AWAY */}
          <div className="flex min-w-0 flex-col items-center text-center">
            {match.away_team?.crest_url ? (
              <img
                src={match.away_team.crest_url}
                alt={match.away_team.name}
                className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-[#e9e4da] sm:h-20 sm:w-20" />
            )}

            <p className="mt-3 text-sm font-semibold leading-tight sm:text-base">
              {match.away_team?.name || `Team ${match.away_team_id}`}
            </p>
          </div>
        </div>

        {/* MATCH INFO */}
        <div className="mt-7 text-center">
          <p className="font-medium">{match.competition}</p>

          <p className="mono mt-2 text-[10px] uppercase tracking-[0.15em] text-[#83766c]">
            {formattedDate} · {formattedTime}
          </p>

          {match.venue && (
            <p className="mono mt-2 text-[9px] uppercase tracking-[0.15em] text-[#83766c]">
              {match.venue}
            </p>
          )}
        </div>

        <Link
          href={`/matches/${match.id}`}
          className="mono mt-7 block rounded-md border border-[#1c1817]/10 px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-[#83766c] transition-colors hover:bg-white hover:text-[#c8102e] sm:hidden"
        >
          View Match →
        </Link>
      </div>

      {/* PREVIOUS MATCHES */}
      {previousMatches.length > 0 && (
        <div className="border-t border-[#1c1817]/10 px-6 py-7 sm:px-8">

          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="mono text-[9px] uppercase tracking-[0.25em] text-[#c8102e]">
                Results
              </p>

              <h3
                className="mt-1 text-xl font-semibold"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Previous Matches
              </h3>
            </div>

            <Link
              href="/matches"
              className="mono text-[9px] uppercase tracking-[0.15em] text-[#83766c] transition-colors hover:text-[#c8102e]"
            >
              All Matches →
            </Link>
          </div>

          {/* HORIZONTAL */}
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
            {previousMatches.map((previousMatch) => (
              <PreviousMatchCard
                key={previousMatch.id}
                match={previousMatch}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
