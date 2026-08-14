import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const revalidate = 60; // re-fetch at most once a minute

async function getMatch(id) {
  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `
      id, competition, season, matchday, date, venue, status,
      home_score, away_score,
      home_team:teams!matches_home_team_id_fkey ( id, name, short_name, crest_url ),
      away_team:teams!matches_away_team_id_fkey ( id, name, short_name, crest_url )
    `
    )
    .eq("id", id)
    .single();

  if (error || !match) return null;

  const [{ data: events }, { data: lineup }, { data: stats }] = await Promise.all([
    supabase
      .from("match_events")
      .select("id, minute, type, detail, team_id, player:players(name), player_name_raw")
      .eq("match_id", id)
      .order("id", { ascending: true }),

    supabase
      .from("match_lineups")
      .select("id, shirt_number, position, is_starting, sub_minute, player:players(name), player_name_raw")
      .eq("match_id", id)
      .eq("team_id", match.home_team?.id)
      .order("is_starting", { ascending: false })
      .order("shirt_number", { ascending: true }),

    supabase.from("match_stats").select("stat_name, home_value, away_value").eq("match_id", id),
  ]);

  // stats come back as rows — turn into a lookup so missing stats are just absent keys
  const statMap = {};
  (stats || []).forEach((s) => {
    statMap[s.stat_name] = { home: s.home_value, away: s.away_value };
  });

  return {
    ...match,
    events: events || [],
    starting: (lineup || []).filter((p) => p.is_starting),
    subs: (lineup || []).filter((p) => !p.is_starting),
    stats: statMap,
  };
}

function StatRow({ label, home, away }) {
  if (home == null || away == null) return null;
  const total = Number(home) + Number(away) || 1;
  const homePct = (Number(home) / total) * 100;
  return (
    <div className="mb-5">
      <p className="mono text-center text-[11px] uppercase tracking-[0.15em] text-[#83766c] mb-2">
        {label}
      </p>
      <div className="mono flex justify-between text-sm mb-1.5">
        <span className="font-semibold text-[#c8102e]">{home}</span>
        <span className="text-[#83766c]">{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-[#e9e4da]">
        <div className="bg-[#c8102e]" style={{ width: `${homePct}%` }} />
        <div className="bg-[#83766c]/50" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

export default async function MatchDetail({ params }) {
  const match = await getMatch(params.id);
  if (!match) notFound();

  const { home_team: home, away_team: away } = match;
  const isFinished = match.status === "finished";

  return (
    <main className="bg-black pt-16 md:pt-20">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-[#faf8f4] pt-8 px-6">
        <nav className="mono mx-auto max-w-3xl text-xs tracking-wide text-[#83766c]">
          <a href="/" className="hover:text-[#c8102e]">Home</a>
          <span className="mx-2 text-[#c8102e]/40">/</span>
          <a href="/matches" className="hover:text-[#c8102e]">Match Centre</a>
          <span className="mx-2 text-[#c8102e]/40">/</span>
          <a href={`/matches?season=${match.season}`} className="hover:text-[#c8102e]">{match.season}</a>
          <span className="mx-2 text-[#c8102e]/40">/</span>
          <span className="text-[#1c1817]">{match.date}</span>
        </nav>
      </div>

      {/* Scoreboard */}
      <section className="bg-[#faf8f4] pb-14 pt-8">
        <div className="mx-auto max-w-3xl px-6">
          <p className="mono text-center text-xs uppercase tracking-[0.3em] text-[#c8102e]">
            {match.competition}
            {match.matchday ? ` · Matchday ${match.matchday}` : ""}
          </p>
          <p className="mono mt-2 text-center text-xs text-[#83766c]">
            {match.date}
            {match.venue ? ` — ${match.venue}` : ""}
          </p>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-white font-semibold text-[#c8102e]">
                {home?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={home.crest_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  home?.short_name || home?.name?.slice(0, 3).toUpperCase()
                )}
              </div>
              <p className="font-semibold text-[#1c1817] text-center">{home?.name}</p>
            </div>

            <div className="text-center">
              <div
                className="flex items-center gap-3 text-5xl md:text-6xl font-semibold text-[#1c1817]"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                <span>{match.home_score ?? "–"}</span>
                <span className="text-[#83766c] text-3xl">–</span>
                <span>{match.away_score ?? "–"}</span>
              </div>
              <p className="mono mt-2 text-[11px] uppercase tracking-[0.2em] text-[#83766c]">
                {isFinished ? "Full Time" : match.status || "Scheduled"}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-white font-semibold text-[#83766c]">
                {away?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={away.crest_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  away?.short_name || away?.name?.slice(0, 3).toUpperCase()
                )}
              </div>
              <p className="font-semibold text-[#1c1817] text-center">{away?.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      {match.events.length > 0 && (
        <section className="bg-[#faf8f4] border-t border-[#1c1817]/8 py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold text-[#1c1817]" style={{ fontFamily: "'Fraunces', serif" }}>
              Match Timeline
            </h2>

            <div className="relative mt-8 pl-14">
              <div className="absolute left-6 top-1 bottom-1 w-px bg-[#1c1817]/10" />
              {match.events.map((e) => (
                <div key={e.id} className="relative pb-6 last:pb-0">
                  <span className="mono absolute -left-14 top-0 w-8 text-right text-sm font-semibold text-[#c8102e]">
                    {e.minute}'
                  </span>
                  <span
                    className={`absolute -left-[34px] top-1 h-2 w-2 rounded-full border-2 bg-[#faf8f4] ${
                      e.type === "yellow_card" ? "border-yellow-600" : e.type === "red_card" ? "border-red-800" : "border-[#c8102e]"
                    }`}
                  />
                  <p className="mono inline-block rounded border border-[#1c1817]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#83766c] mr-2">
                    {e.type.replace("_", " ")}
                  </p>
                  <p className="mt-1.5 font-medium text-[#1c1817]">
                    {e.player?.name || e.player_name_raw || "Unknown player"}
                  </p>
                  {e.detail && <p className="text-sm text-[#83766c]">{e.detail}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lineup — home side only */}
      {match.starting.length > 0 && (
        <section className="bg-[#faf8f4] border-t border-[#1c1817]/8 py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold text-[#1c1817]" style={{ fontFamily: "'Fraunces', serif" }}>
              Lineup
            </h2>

            <ul className="mt-6 divide-y divide-[#1c1817]/6">
              {match.starting.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="mono w-6 text-sm text-[#c8102e]">{p.shirt_number ?? "—"}</span>
                  <span className="flex-1 text-[#1c1817]">{p.player?.name || p.player_name_raw}</span>
                  <span className="mono text-xs text-[#83766c]">{p.position}</span>
                </li>
              ))}
            </ul>

            {match.subs.length > 0 && (
              <>
                <p className="mono mt-6 mb-2 text-xs uppercase tracking-wide text-[#83766c]">Substitutes</p>
                <ul className="divide-y divide-[#1c1817]/6">
                  {match.subs.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="mono w-6 text-sm text-[#c8102e]">{p.shirt_number ?? "—"}</span>
                      <span className="flex-1 text-[#1c1817]">{p.player?.name || p.player_name_raw}</span>
                      <span className="mono text-xs text-[#83766c]">{p.sub_minute ? `${p.sub_minute}'` : ""}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {/* Stats — only recorded metrics render */}
      {Object.keys(match.stats).length > 0 && (
        <section className="bg-[#faf8f4] border-t border-[#1c1817]/8 py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-semibold text-[#1c1817]" style={{ fontFamily: "'Fraunces', serif" }}>
              Match Stats
            </h2>
            <div className="mt-8 max-w-md mx-auto">
              {Object.entries(match.stats).map(([name, val]) => (
                <StatRow
                  key={name}
                  label={name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  home={val.home}
                  away={val.away}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
