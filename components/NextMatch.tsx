"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  date: string;
  time?: string | null;
  venue?: string | null;
  home_team_id: number;
  away_team_id: number;
  status?: string | null;
  home_team?: Team | null;
  away_team?: Team | null;
};

function getMatchDate(match: Match) {
  return new Date(
    `${match.date}T${match.time || "00:00:00"}`
  );
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

export default function NextMatch() {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNextMatch() {
      const now = new Date();

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
        )
        .eq("status", "pending");

      if (error) {
        console.error("NEXT MATCH ERROR:", error);
        setLoading(false);
        return;
      }

      const upcomingMatches = (data || [])
        .filter((item: Match) => getMatchDate(item) > now)
        .sort(
          (a: Match, b: Match) =>
            getMatchDate(a).getTime() - getMatchDate(b).getTime()
        );

      setMatch(upcomingMatches[0] || null);
      setLoading(false);
    }

    loadNextMatch();
  }, []);

  if (loading) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#111] p-6">
        <div className="animate-pulse">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mx-auto mt-8 h-8 w-48 rounded bg-white/10" />
          <div className="mx-auto mt-4 h-3 w-32 rounded bg-white/10" />
          <div className="mt-6 h-20 rounded bg-white/10" />
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
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#111] text-white shadow-xl">
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
            className="mono hidden text-[10px] uppercase tracking-[0.15em] text-white/50 transition-colors hover:text-white sm:block"
          >
            View Match →
          </Link>
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
              <div className="h-16 w-16 rounded-full bg-white/5 sm:h-20 sm:w-20" />
            )}

            <p className="mt-3 text-sm font-semibold leading-tight sm:text-base">
              {match.home_team?.name ||
                `Team ${match.home_team_id}`}
            </p>
          </div>

          {/* VS */}
          <div className="text-center">
            <p className="mono text-xs uppercase tracking-[0.2em] text-white/40">
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
              <div className="h-16 w-16 rounded-full bg-white/5 sm:h-20 sm:w-20" />
            )}

            <p className="mt-3 text-sm font-semibold leading-tight sm:text-base">
              {match.away_team?.name ||
                `Team ${match.away_team_id}`}
            </p>
          </div>
        </div>

        {/* MATCH INFORMATION */}
        <div className="mt-7 text-center">
          <p className="font-medium">{match.competition}</p>

          <p className="mono mt-2 text-[10px] uppercase tracking-[0.15em] text-white/50">
            {formattedDate} · {formattedTime}
          </p>

          {match.venue && (
            <p className="mono mt-2 text-[9px] uppercase tracking-[0.15em] text-white/35">
              {match.venue}
            </p>
          )}
        </div>

        {/* COUNTDOWN */}
        <div className="mx-auto mt-7 max-w-md">
          <p className="mono text-center text-[9px] uppercase tracking-[0.25em] text-white/40">
            Kickoff In
          </p>

          <Countdown target={matchDate} />
        </div>

        {/* MOBILE BUTTON */}
        <Link
          href={`/matches/${match.id}`}
          className="mono mt-7 block rounded-md border border-white/10 px-4 py-3 text-center text-[10px] uppercase tracking-[0.15em] text-white/70 transition-colors hover:bg-white/5 hover:text-white sm:hidden"
        >
          View Match →
        </Link>
      </div>
    </section>
  );
}
