import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 60;

async function getMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Matches query failed: ${error.message}`);
  }

  return data || [];
}

export default async function MatchesPage() {
  const matches = await getMatches();

  const grouped: Record<string, Record<string, any[]>> = {};

  matches.forEach((match: any) => {
    const season = match.season || "Unknown Season";
    const competition = match.competition || "Other Matches";

    if (!grouped[season]) {
      grouped[season] = {};
    }

    if (!grouped[season][competition]) {
      grouped[season][competition] = [];
    }

    grouped[season][competition].push(match);
  });

  const seasons = Object.keys(grouped).sort((a, b) =>
    b.localeCompare(a)
  );

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

      <section className="px-6 py-12">
        <div className="mx-auto max-w-4xl">

          {seasons.length === 0 ? (
            <div className="border border-[#1c1817]/10 bg-white p-10 text-center">
              <p className="mono text-xs uppercase tracking-[0.2em] text-[#83766c]">
                No matches recorded yet
              </p>
            </div>
          ) : (
            <div className="space-y-10">

              {seasons.map((season) => (
                <section key={season}>

                  {/* YEAR */}
                  <div className="mb-5 flex items-center gap-4">
                    <h2
                      className="text-4xl font-semibold"
                      style={{ fontFamily: "'Fraunces', serif" }}
                    >
                      {season}
                    </h2>

                    <div className="h-px flex-1 bg-[#1c1817]/10" />
                  </div>

                  {/* TOURNAMENTS */}
                  <div className="space-y-5">

                    {Object.entries(grouped[season]).map(
                      ([competition, competitionMatches]) => (
                        <div
                          key={competition}
                          className="overflow-hidden border border-[#1c1817]/10 bg-white"
                        >

                          {/* TOURNAMENT */}
                          <div className="border-b border-[#1c1817]/10 bg-[#f4f1eb] px-5 py-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="mono text-[10px] uppercase tracking-[0.2em] text-[#83766c]">
                                  Tournament
                                </p>

                                <h3 className="mt-1 text-lg font-semibold">
                                  {competition}
                                </h3>
                              </div>

                              <span className="mono text-xs text-[#83766c]">
                                {competitionMatches.length}{" "}
                                {competitionMatches.length === 1
                                  ? "match"
                                  : "matches"}
                              </span>
                            </div>
                          </div>

                          {/* MATCHES */}
                          <div className="divide-y divide-[#1c1817]/8">

                            {competitionMatches.map((match: any) => {
                              const date = match.date
                                ? new Date(
                                    match.date
                                  ).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : "";

                              return (
                                <Link
                                  key={match.id}
                                  href={`/matches/${match.id}`}
                                  className="group block px-5 py-5 transition hover:bg-[#faf8f4]"
                                >
                                  <div className="grid grid-cols-[70px_1fr_auto] items-center gap-4">

                                    {/* DATE */}
                                    <div>
                                      <p className="mono text-xs text-[#83766c]">
                                        {date}
                                      </p>

                                      {match.matchday && (
                                        <p className="mono mt-1 text-[9px] uppercase tracking-wide text-[#83766c]/70">
                                          MD {match.matchday}
                                        </p>
                                      )}
                                    </div>

                                    {/* SCORE */}
                                    <div className="space-y-2">

                                      <div className="flex items-center justify-between gap-4">
                                        <span className="font-semibold">
                                          Langsning FC
                                        </span>

                                        <span className="mono font-semibold">
                                          {match.home_score ?? "–"}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between gap-4">
                                        <span className="font-semibold">
                                          Mumbay FC
                                        </span>

                                        <span className="mono font-semibold">
                                          {match.away_score ?? "–"}
                                        </span>
                                      </div>

                                    </div>

                                    {/* STATUS */}
                                    <div className="text-right">
                                      <p className="mono text-[10px] uppercase tracking-[0.15em] text-[#c8102e]">
                                        {match.status === "finished"
                                          ? "Full Time"
                                          : match.status || "Scheduled"}
                                      </p>

                                      <p className="mt-2 text-lg text-[#83766c] transition group-hover:translate-x-1">
                                        →
                                      </p>
                                    </div>

                                  </div>

                                  {/* VENUE */}
                                  {match.venue && (
                                    <p className="mono mt-3 pl-[86px] text-[10px] uppercase tracking-wide text-[#83766c]/70">
                                      {match.venue}
                                    </p>
                                  )}
                                </Link>
                              );
                            })}

                          </div>
                        </div>
                      )
                    )}

                  </div>
                </section>
              ))}

            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  );
}
