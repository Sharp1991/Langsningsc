"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function LiveMatchSelection() {
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    setError(false);

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
      .order("date", { ascending: false });

    if (error) {
      console.error("LIVE MATCHES ERROR:", error);
      setError(true);
      setMatches([]);
    } else {
      setMatches(data || []);
    }

    setLoading(false);
  }

  function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function openLogger(matchId: number) {
    router.push(`/matches/${matchId}/live`);
  }

  function statusLabel(status?: string | null) {
    if (status === "finished") return "Full Time";
    if (status === "live") return "LIVE";
    if (status === "pending") return "Scheduled";

    return status || "Scheduled";
  }

  return (
    <main className="min-h-screen bg-[#faf8f4] px-4 py-8 text-[#1c1817]">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#c8102e]">
            Langsning FC
          </p>

          <h1 className="text-3xl font-bold">
            Live Match Logger
          </h1>

          <p className="mt-2 text-gray-600">
            Select a match to start collecting live data.
          </p>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-xl bg-white p-8 text-center shadow">
            <p className="font-semibold">
              Loading matches...
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-xl bg-white p-8 text-center shadow">

            <p className="font-semibold text-red-600">
              Could not load matches.
            </p>

            <button
              onClick={loadMatches}
              className="mt-4 rounded-lg bg-[#c8102e] px-5 py-3 font-bold text-white"
            >
              TRY AGAIN
            </button>

          </div>
        )}

        {/* MATCHES */}
        {!loading && !error && (
          <div className="space-y-4">

            {matches.length === 0 ? (
              <div className="rounded-xl bg-white p-8 text-center shadow">
                <p className="text-gray-500">
                  No matches found.
                </p>
              </div>
            ) : (
              matches.map((match) => (

                <div
                  key={match.id}
                  className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
                >

                  {/* TOP */}
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                    <div>
                      <div className="font-bold">
                        {formatDate(match.date)}
                      </div>

                      <div className="text-sm text-gray-500">
                        {match.competition}
                        {match.season
                          ? ` • ${match.season}`
                          : ""}
                      </div>
                    </div>

                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                        match.status === "live"
                          ? "border-red-600 text-red-600"
                          : "border-gray-300 text-gray-600"
                      }`}
                    >
                      {statusLabel(match.status)}
                    </div>

                  </div>

                  {/* TEAMS */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

                    {/* HOME */}
                    <div className="text-center sm:text-right">

                      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-end">

                        {match.home_team?.crest_url && (
                          <img
                            src={match.home_team.crest_url}
                            alt=""
                            className="h-10 w-10 object-contain"
                          />
                        )}

                        <span className="text-lg font-bold">
                          {match.home_team?.name ||
                            "Home Team"}
                        </span>

                      </div>

                    </div>

                    {/* SCORE */}
                    <div className="rounded-lg bg-[#1c1817] px-4 py-3 text-xl font-bold text-white">
                      {match.home_score ?? 0}
                      <span className="mx-2">-</span>
                      {match.away_score ?? 0}
                    </div>

                    {/* AWAY */}
                    <div className="text-center sm:text-left">

                      <div className="flex flex-col items-center gap-2 sm:flex-row">

                        {match.away_team?.crest_url && (
                          <img
                            src={match.away_team.crest_url}
                            alt=""
                            className="h-10 w-10 object-contain"
                          />
                        )}

                        <span className="text-lg font-bold">
                          {match.away_team?.name ||
                            "Away Team"}
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* DETAILS */}
                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-500">

                    {match.time && (
                      <span>
                        🕐 {match.time}
                      </span>
                    )}

                    {match.venue && (
                      <span>
                        📍 {match.venue}
                      </span>
                    )}

                    {match.matchday && (
                      <span>
                        Round {match.matchday}
                      </span>
                    )}

                  </div>

                  {/* LOGGER BUTTON */}
                  <button
                    onClick={() => openLogger(match.id)}
                    className="mt-5 w-full rounded-lg bg-[#c8102e] px-5 py-4 text-lg font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
                  >
                    OPEN LIVE LOGGER
                  </button>

                </div>

              ))
            )}

          </div>
        )}

      </div>
    </main>
  );
}
