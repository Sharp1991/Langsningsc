"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Performance = {
  id: number;
  season: number;
  competition: string;
  position: string | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goals_for: number | null;
  goals_against: number | null;
  points: number | null;
  notes: string | null;
};

export default function ClubPerformance() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPerformance() {
      const { data, error } = await supabase
        .from("club_performance")
        .select("*")
        .order("season", { ascending: false });

      if (error) {
        console.error("Error loading club performance:", error);
      } else {
        setPerformances(data || []);
      }

      setLoading(false);
    }

    loadPerformance();
  }, []);

  return (
    <section className="bg-white py-24 text-black">
      <div className="mx-auto max-w-7xl px-6">

        <p className="text-xs uppercase tracking-[0.3em] text-red-700">
          Records & Statistics
        </p>

        <h2 className="mt-4 text-4xl font-semibold leading-tight">
          Club Performance
        </h2>

        <p className="mt-4 max-w-2xl text-gray-600">
          Langsning FC&apos;s competitive record across major league campaigns.
        </p>

        {loading ? (
          <div className="mt-10 py-10 text-center text-gray-500">
            Loading performance records...
          </div>
        ) : performances.length === 0 ? (
          <div className="mt-10 border border-gray-200 py-10 text-center text-gray-500">
            No performance records available.
          </div>
        ) : (
          <div className="mt-10 overflow-x-auto border border-gray-200">

            <table className="w-full min-w-[1100px] border-collapse text-sm">

              <thead>
                <tr className="border-b-2 border-red-700 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-600">

                  <th className="px-4 py-4">Season</th>
                  <th className="px-4 py-4">Competition</th>
                  <th className="px-4 py-4">Position</th>
                  <th className="px-4 py-4">Pld</th>
                  <th className="px-4 py-4">W</th>
                  <th className="px-4 py-4">D</th>
                  <th className="px-4 py-4">L</th>
                  <th className="px-4 py-4">GF</th>
                  <th className="px-4 py-4">GA</th>
                  <th className="px-4 py-4">Pts</th>
                  <th className="min-w-[320px] px-4 py-4">
                    Narrative
                  </th>

                </tr>
              </thead>

              <tbody>
                {performances.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-200 transition hover:bg-red-50 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    }`}
                  >

                    <td className="whitespace-nowrap px-4 py-5 font-semibold">
                      {row.season}
                    </td>

                    <td className="whitespace-nowrap px-4 py-5 font-medium">
                      {row.competition}
                    </td>

                    <td className="px-4 py-5">
                      {row.position || "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.played ?? "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.wins ?? "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.draws ?? "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.losses ?? "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.goals_for ?? "—"}
                    </td>

                    <td className="px-4 py-5">
                      {row.goals_against ?? "—"}
                    </td>

                    <td className="px-4 py-5 font-bold text-red-700">
                      {row.points ?? "—"}
                    </td>

                    <td className="min-w-[320px] px-4 py-5 leading-6 text-gray-600">
                      {row.notes || "—"}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </div>
    </section>
  );
}
