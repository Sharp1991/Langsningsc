import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const revalidate = 60;

type Team = {
  id: number;
  name: string;
  short_name: string | null;
  crest_url: string | null;
};

type Player = {
  name: string;
};

type MatchEvent = {
  id: number;
  minute: string | number | null;
  type: string;
  detail: string | null;
  team_id: number | null;
  player: Player | Player[] | null;
  player_name_raw: string | null;
};

type LineupPlayer = {
  id: number;
  shirt_number: number | null;
  position: string | null;
  is_starting: boolean;
  sub_minute: number | null;
  player: Player | Player[] | null;
  player_name_raw: string | null;
};

type StatValue = {
  home: number | string | null;
  away: number | string | null;
};

function getPlayerName(
  player: Player | Player[] | null,
  fallback: string | null
) {
  if (Array.isArray(player)) {
    return player[0]?.name || fallback || "Unknown player";
  }

  return player?.name || fallback || "Unknown player";
}

function getTeam(team: Team | Team[] | null) {
  if (Array.isArray(team)) {
    return team[0] || null;
  }

  return team;
}

async function getMatch(id: string) {
  const { data: rawMatch, error } = await supabase
    .from("matches")
    .select(
      `
      id,
      competition,
      season,
      matchday,
      date,
      venue,
      status,
      home_score,
      away_score,
      home_team:teams!matches_home_team_id_fkey (
        id,
        name,
        short_name,
        crest_url
      ),
      away_team:teams!matches_away_team_id_fkey (
        id,
        name,
        short_name,
        crest_url
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !rawMatch) return null;

  const home = getTeam(rawMatch.home_team as Team | Team[]);
  const away = getTeam(rawMatch.away_team as Team | Team[]);

  const [
    { data: events },
    { data: lineup },
    { data: stats },
  ] = await Promise.all([
    supabase
      .from("match_events")
      .select(
        `
        id,
        minute,
        type,
        detail,
        team_id,
        player:players(name),
        player_name_raw
      `
      )
      .eq("match_id", id)
      .order("id", { ascending: true }),

    supabase
      .from("match_lineups")
      .select(
        `
        id,
        shirt_number,
        position,
        is_starting,
        sub_minute,
        player:players(name),
        player_name_raw
      `
      )
      .eq("match_id", id)
      .eq("team_id", home?.id ?? -1)
      .order("is_starting", { ascending: false })
      .order("shirt_number", { ascending: true }),

    supabase
      .from("match_stats")
      .select("stat_name, home_value, away_value")
      .eq("match_id", id),
  ]);

  const statMap: Record<string, StatValue> = {};

  (stats || []).forEach((s) => {
    statMap[s.stat_name] = {
      home: s.home_value,
      away: s.away_value,
    };
  });

  return {
    ...rawMatch,
    home_team: home,
    away_team: away,
    events: (events || []) as MatchEvent[],
    starting: ((lineup || []) as LineupPlayer[]).filter(
      (p) => p.is_starting
    ),
    subs: ((lineup || []) as LineupPlayer[]).filter(
      (p) => !p.is_starting
    ),
    stats: statMap,
  };
}

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: number | string | null;
  away: number | string | null;
}) {
  if (home == null || away == null) return null;

  const total = Number(home) + Number(away) || 1;
  const homePct = (Number(home) / total) * 100;

  return (
    <div className="mb-5">
      <p className="mono mb-2 text-center text-[11px] uppercase tracking-[0.15em] text-[#83766c]">
        {label}
      </p>

      <div className="mono mb-1.5 flex justify-between text-sm">
        <span className="font-semibold text-[#c8102e]">
          {home}
        </span>

        <span className="text-[#83766c]">
          {away}
        </span>
      </div>

      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#e9e4da]">
        <div
          className="bg-[#c8102e]"
          style={{ width: `${homePct}%` }}
        />

        <div
          className="bg-[#83766c]/50"
          style={{ width: `${100 - homePct}%` }}
        />
      </div>
    </div>
  );
}

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const match = await getMatch(id);

  if (!match) notFound();

  const home = match.home_team;
  const away = match.away_team;

  const isFinished =
    match.status?.toLowerCase() === "finished";

  let resultLabel = "";

  if (
    isFinished &&
    match.home_score != null &&
    match.away_score != null
  ) {
    if (match.home_score > match.away_score) {
      resultLabel = "Home Win";
    } else if (match.home_score < match.away_score) {
      resultLabel = "Away Win";
    } else {
      resultLabel = "Draw";
    }
  }

  return (
    <main className="bg-black pt-16 md:pt-20">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-[#faf8f4] px-6 pt-8">
        <nav className="mono mx-auto max-w-3xl text-xs tracking-wide text-[#83766c]">

          <a
            href="/"
            className="hover:text-[#c8102e]"
          >
            Home
          </a>

          <span className="mx-2 text-[#c8102e]/40">
            /
          </span>

          <a
            href="/matches"
            className="hover:text-[#c8102e]"
          >
            Match Centre
          </a>

          <span className="mx-2 text-[#c8102e]/40">
            /
          </span>

          <a
            href={`/matches?season=${match.season}`}
            className="hover:text-[#c8102e]"
          >
            {match.season}
          </a>

          <span className="mx-2 text-[#c8102e]/40">
            /
          </span>

          <span className="text-[#1c1817]">
            {match.date}
          </span>

        </nav>
      </div>

      {/* Scoreboard */}
      <section className="bg-[#faf8f4] pb-14 pt-8">
        <div className="mx-auto max-w-3xl px-6">

          <p className="mono text-center text-xs uppercase tracking-[0.3em] text-[#c8102e]">
            {match.competition}
            {match.matchday
              ? ` · Matchday ${match.matchday}`
              : ""}
          </p>

          <p className="mono mt-2 text-center text-xs text-[#83766c]">
            {match.date}
            {match.venue
              ? ` — ${match.venue}`
              : ""}
          </p>

          <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

            {/* HOME */}
            <div className="flex flex-col items-center gap-3">

              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-white font-semibold text-[#c8102e]">

                {home?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={home.crest_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  home?.short_name ||
                  home?.name?.slice(0, 3).toUpperCase()
                )}

              </div>

              <p className="text-center font-semibold text-[#1c1817]">
                {home?.name}
              </p>

            </div>

            {/* SCORE */}
            <div className="text-center">

              <div
                className="flex items-center gap-3 text-5xl font-semibold text-[#1c1817] md:text-6xl"
                style={{
                  fontFamily: "'Fraunces', serif",
                }}
              >

                <span>
                  {match.home_score ?? "–"}
                </span>

                <span className="text-3xl text-[#83766c]">
                  –
                </span>

                <span>
                  {match.away_score ?? "–"}
                </span>

              </div>

              <p className="mono mt-2 text-[11px] uppercase tracking-[0.2em] text-[#83766c]">
                {isFinished
                  ? "Full Time"
                  : match.status || "Scheduled"}
              </p>

              {resultLabel && (
                <p className="mono mt-1 text-[10px] uppercase tracking-[0.15em] text-[#c8102e]">
                  {resultLabel}
                </p>
              )}

            </div>

            {/* AWAY */}
            <div className="flex flex-col items-center gap-3">

              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-white font-semibold text-[#83766c]">

                {away?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={away.crest_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  away?.short_name ||
                  away?.name?.slice(0, 3).toUpperCase()
                )}

              </div>

              <p className="text-center font-semibold text-[#1c1817]">
                {away?.name}
              </p>

            </div>

          </div>
        </div>
      </section>

      {/* TIMELINE */}
      {match.events.length > 0 && (
        <section className="border-t border-[#1c1817]/8 bg-[#faf8f4] py-14">

          <div className="mx-auto max-w-3xl px-6">

            <h2
              className="text-2xl font-semibold text-[#1c1817]"
              style={{
                fontFamily: "'Fraunces', serif",
              }}
            >
              Match Timeline
            </h2>

            <div className="relative mt-8 pl-14">

              <div className="absolute bottom-1 left-6 top-1 w-px bg-[#1c1817]/10" />

              {match.events.map((e) => (

                <div
                  key={e.id}
                  className="relative pb-6 last:pb-0"
                >

                  <span className="mono absolute -left-14 top-0 w-8 text-right text-sm font-semibold text-[#c8102e]">
                    {e.minute}'
                  </span>

                  <span
                    className={`absolute -left-[34px] top-1 h-2 w-2 rounded-full border-2 bg-[#faf8f4] ${
                      e.type === "yellow_card"
                        ? "border-yellow-600"
                        : e.type === "red_card"
                        ? "border-red-800"
                        : "border-[#c8102e]"
                    }`}
                  />

                  <p className="mono mr-2 inline-block rounded border border-[#1c1817]/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#83766c]">
                    {e.type.replace(/_/g, " ")}
                  </p>

                  <p className="mt-1.5 font-medium text-[#1c1817]">
                    {getPlayerName(
                      e.player,
                      e.player_name_raw
                    )}
                  </p>

                  {e.detail && (
                    <p className="text-sm text-[#83766c]">
                      {e.detail}
                    </p>
                  )}

                </div>

              ))}

            </div>
          </div>
        </section>
      )}

      {/* LANGSNING LINEUP */}
      {match.starting.length > 0 && (
        <section className="border-t border-[#1c1817]/8 bg-[#faf8f4] py-14">

          <div className="mx-auto max-w-3xl px-6">

            <h2
              className="text-2xl font-semibold text-[#1c1817]"
              style={{
                fontFamily: "'Fraunces', serif",
              }}
            >
              Lineup
            </h2>

            <p className="mono mt-2 text-xs uppercase tracking-[0.15em] text-[#c8102e]">
              {home?.name}
            </p>

            <ul className="mt-6 divide-y divide-[#1c1817]/6">

              {match.starting.map((p) => (

                <li
                  key={p.id}
                  className="flex items-center gap-3 py-2.5"
                >

                  <span className="mono w-6 text-sm text-[#c8102e]">
                    {p.shirt_number ?? "—"}
                  </span>

                  <span className="flex-1 text-[#1c1817]">
                    {getPlayerName(
                      p.player,
                      p.player_name_raw
                    )}
                  </span>

                  <span className="mono text-xs text-[#83766c]">
                    {p.position || ""}
                  </span>

                </li>

              ))}

            </ul>

            {match.subs.length > 0 && (
              <>

                <p className="mono mb-2 mt-6 text-xs uppercase tracking-wide text-[#83766c]">
                  Substitutes
                </p>

                <ul className="divide-y divide-[#1c1817]/6">

                  {match.subs.map((p) => (

                    <li
                      key={p.id}
                      className="flex items-center gap-3 py-2.5"
                    >

                      <span className="mono w-6 text-sm text-[#c8102e]">
                        {p.shirt_number ?? "—"}
                      </span>

                      <span className="flex-1 text-[#1c1817]">
                        {getPlayerName(
                          p.player,
                          p.player_name_raw
                        )}
                      </span>

                      <span className="mono text-xs text-[#83766c]">
                        {p.sub_minute
                          ? `${p.sub_minute}'`
                          : ""}
                      </span>

                    </li>

                  ))}

                </ul>

              </>
            )}

          </div>
        </section>
      )}

      {/* MATCH STATS */}
      {Object.keys(match.stats).length > 0 && (
        <section className="border-t border-[#1c1817]/8 bg-[#faf8f4] py-14">

          <div className="mx-auto max-w-3xl px-6">

            <h2
              className="text-2xl font-semibold text-[#1c1817]"
              style={{
                fontFamily: "'Fraunces', serif",
              }}
            >
              Match Stats
            </h2>

            <div className="mx-auto mt-8 max-w-md">

              {Object.entries(match.stats).map(
                ([name, val]) => (

                  <StatRow
                    key={name}
                    label={name
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) =>
                        c.toUpperCase()
                      )}
                    home={val.home}
                    away={val.away}
                  />

                )
              )}

            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
