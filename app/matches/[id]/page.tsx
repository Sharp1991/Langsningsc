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

  const [{ data: events }, { data: lineup }, { data: stats }, { data: relatedArticles }] =
    await Promise.all([
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
        .eq("team_id", 1)
        .order("is_starting", { ascending: false })
        .order("shirt_number", { ascending: true }),

      supabase
        .from("match_stats")
        .select("stat_name, home_value, away_value")
        .eq("match_id", id),

      supabase
        .from("articles")
        .select("id, title, slug, excerpt, image_url, category, published_date, published_at, source")
        .eq("match_id", id)
        .order("published_date", { ascending: false }),
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
    relatedArticles: relatedArticles || [],
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

  const homeNumber = Number(home);
  const awayNumber = Number(away);
  const total = homeNumber + awayNumber;

  const homePct =
    total > 0 ? (homeNumber / total) * 100 : 50;

  return (
    <div className="border-b border-[#1c1817]/8 py-5 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="mono text-sm font-semibold text-[#c8102e]">
          {home}
        </span>

        <span className="mono text-[10px] uppercase tracking-[0.16em] text-[#83766c]">
          {label}
        </span>

        <span className="mono text-sm font-semibold text-[#1c1817]">
          {away}
        </span>
      </div>

      <div className="flex h-2 overflow-hidden rounded-full bg-[#e9e4da]">
        <div
          className="bg-[#c8102e]"
          style={{ width: `${homePct}%` }}
        />

        <div
          className="bg-[#1c1817]/20"
          style={{ width: `${100 - homePct}%` }}
        />
      </div>
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === "yellow_card") {
    return (
      <span className="h-4 w-3 rounded-sm bg-yellow-400" />
    );
  }

  if (type === "red_card") {
    return (
      <span className="h-4 w-3 rounded-sm bg-red-700" />
    );
  }

  if (type === "goal") {
    return (
      <span className="text-sm">⚽</span>
    );
  }

  if (type === "substitution") {
    return (
      <span className="text-sm text-[#c8102e]">↕</span>
    );
  }

  return (
    <span className="h-2.5 w-2.5 rounded-full bg-[#c8102e]" />
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

  const formattedDate = new Date(match.date).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-[#faf8f4] text-[#1c1817]">
      <Navbar />

      {/* BREADCRUMB */}
      <div className="border-b border-[#1c1817]/8 bg-white px-6 py-5">
        <nav className="mono mx-auto max-w-5xl text-[10px] uppercase tracking-[0.15em] text-[#83766c]">
          <a
            href="/"
            className="transition-colors hover:text-[#c8102e]"
          >
            Home
          </a>

          <span className="mx-2 text-[#c8102e]/40">
            /
          </span>

          <a
            href="/matches"
            className="transition-colors hover:text-[#c8102e]"
          >
            Match Centre
          </a>

          <span className="mx-2 text-[#c8102e]/40">
            /
          </span>

          <span className="text-[#1c1817]">
            {match.season}
          </span>
        </nav>
      </div>

      {/* HERO SCOREBOARD */}
      <section className="border-b border-[#1c1817]/10 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">

          <div className="text-center">
            <p className="mono text-[10px] uppercase tracking-[0.3em] text-[#c8102e]">
              {match.competition}
              {match.matchday
                ? ` · Matchday ${match.matchday}`
                : ""}
            </p>

            <p className="mt-3 text-sm text-[#83766c]">
              {formattedDate}
              {match.venue ? ` · ${match.venue}` : ""}
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-5 md:gap-12">

            {/* HOME TEAM */}
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-[#faf8f4] shadow-sm md:h-28 md:w-28">

                {home?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={home.crest_url}
                    alt={home.name}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="font-semibold text-[#c8102e]">
                    {home?.short_name ||
                      home?.name?.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-lg font-semibold md:text-xl">
                {home?.name}
              </h2>

              <p className="mono mt-1 text-[9px] uppercase tracking-[0.18em] text-[#c8102e]">
                Home
              </p>
            </div>

            {/* SCORE */}
            <div className="min-w-[130px] text-center md:min-w-[180px]">
              <div
                className="flex items-center justify-center gap-3 text-5xl font-semibold md:gap-5 md:text-7xl"
                style={{
                  fontFamily: "'Fraunces', serif",
                }}
              >
                <span>
                  {match.home_score ?? "–"}
                </span>

                <span className="text-3xl font-normal text-[#83766c] md:text-4xl">
                  –
                </span>

                <span>
                  {match.away_score ?? "–"}
                </span>
              </div>

              <div className="mt-3">
                <span className="mono rounded-full border border-[#1c1817]/10 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-[#83766c]">
                  {isFinished
                    ? "Full Time"
                    : match.status || "Scheduled"}
                </span>
              </div>

              {resultLabel && (
                <p className="mono mt-3 text-[9px] uppercase tracking-[0.18em] text-[#c8102e]">
                  {resultLabel}
                </p>
              )}
            </div>

            {/* AWAY TEAM */}
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#1c1817]/10 bg-[#faf8f4] shadow-sm md:h-28 md:w-28">

                {away?.crest_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={away.crest_url}
                    alt={away.name}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="font-semibold text-[#83766c]">
                    {away?.short_name ||
                      away?.name?.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-lg font-semibold md:text-xl">
                {away?.name}
              </h2>

              <p className="mono mt-1 text-[9px] uppercase tracking-[0.18em] text-[#83766c]">
                Away
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-5xl px-6">

        {/* TIMELINE */}
        {match.events.length > 0 && (
          <section className="border-b border-[#1c1817]/10 py-14 md:py-16">

            <div className="mx-auto max-w-3xl">
              <div className="mb-8">
                <p className="mono text-[9px] uppercase tracking-[0.25em] text-[#c8102e]">
                  Match Report
                </p>

                <h2
                  className="mt-2 text-3xl font-semibold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                  }}
                >
                  Match Timeline
                </h2>
              </div>

              <div className="relative">

                <div className="absolute bottom-0 left-[34px] top-0 w-px bg-[#1c1817]/10" />

                <div className="space-y-7">
                  {match.events.map((e) => (
                    <div
                      key={e.id}
                      className="relative grid grid-cols-[50px_34px_1fr] items-start gap-3"
                    >

                      <div className="mono pt-0.5 text-right text-xs font-semibold text-[#c8102e]">
                        {e.minute}'
                      </div>

                      <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#1c1817]/10 bg-[#faf8f4]">
                        <EventIcon type={e.type} />
                      </div>

                      <div>
                        <p className="font-semibold">
                          {getPlayerName(
                            e.player,
                            e.player_name_raw
                          )}
                        </p>

                        <p className="mono mt-1 text-[9px] uppercase tracking-[0.15em] text-[#83766c]">
                          {e.type.replace(/_/g, " ")}
                        </p>

                        {e.detail && (
                          <p className="mt-1 text-sm text-[#83766c]">
                            {e.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* LANGSNING LINEUP */}
        {match.starting.length > 0 && (
          <section className="border-b border-[#1c1817]/10 py-14 md:py-16">

            <div className="mx-auto max-w-3xl">

              <div className="mb-8">
                <p className="mono text-[9px] uppercase tracking-[0.25em] text-[#c8102e]">
                  Langsning FC
                </p>

                <h2
                  className="mt-2 text-3xl font-semibold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                  }}
                >
                  Lineup
                </h2>
              </div>

              <div className="overflow-hidden rounded-lg border border-[#1c1817]/10 bg-white">

                <div className="border-b border-[#1c1817]/10 bg-[#f4f1eb] px-5 py-3">
                  <p className="mono text-[9px] uppercase tracking-[0.2em] text-[#83766c]">
                    Starting XI
                  </p>
                </div>

                <ul className="divide-y divide-[#1c1817]/8">
                  {match.starting.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-4 px-5 py-3.5"
                    >
                      <span className="mono w-7 text-sm font-semibold text-[#c8102e]">
                        {p.shirt_number ?? "—"}
                      </span>

                      <span className="flex-1 font-medium">
                        {getPlayerName(
                          p.player,
                          p.player_name_raw
                        )}
                      </span>

                      <span className="mono text-[10px] uppercase tracking-wide text-[#83766c]">
                        {p.position || ""}
                      </span>
                    </li>
                  ))}
                </ul>

                {match.subs.length > 0 && (
                  <>
                    <div className="border-y border-[#1c1817]/10 bg-[#f4f1eb] px-5 py-3">
                      <p className="mono text-[9px] uppercase tracking-[0.2em] text-[#83766c]">
                        Substitutes
                      </p>
                    </div>

                    <ul className="divide-y divide-[#1c1817]/8">
                      {match.subs.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center gap-4 px-5 py-3.5"
                        >
                          <span className="mono w-7 text-sm text-[#c8102e]">
                            {p.shirt_number ?? "—"}
                          </span>

                          <span className="flex-1 text-[#1c1817]">
                            {getPlayerName(
                              p.player,
                              p.player_name_raw
                            )}
                          </span>

                          <span className="mono text-[10px] text-[#83766c]">
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
            </div>
          </section>
        )}

        {/* MATCH STATS */}
        {Object.keys(match.stats).length > 0 && (
          <section className="py-14 md:py-16">

            <div className="mx-auto max-w-3xl">

              <div className="mb-8">
                <p className="mono text-[9px] uppercase tracking-[0.25em] text-[#c8102e]">
                  Match Data
                </p>

                <h2
                  className="mt-2 text-3xl font-semibold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                  }}
                >
                  Match Stats
                </h2>

                <div className="mt-3 flex justify-between text-xs text-[#83766c]">
                  <span>{home?.short_name || home?.name}</span>
                  <span>{away?.short_name || away?.name}</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#1c1817]/10 bg-white px-5 md:px-8">
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

        {/* RELATED POSTS */}
        {match.relatedArticles.length > 0 && (
          <section className="border-t border-[#1c1817]/10 py-14 md:py-16">

            <div className="mx-auto max-w-3xl">

              <div className="mb-8">
                <p className="mono text-[9px] uppercase tracking-[0.25em] text-[#c8102e]">
                  Coverage
                </p>

                <h2
                  className="mt-2 text-3xl font-semibold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                  }}
                >
                  Related Posts
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {match.relatedArticles.map((article) => (
                  <a
                    key={article.id}
                    href={`/articles/${article.slug}`}
                    className="group overflow-hidden rounded-lg border border-[#1c1817]/10 bg-white transition hover:-translate-y-1 hover:shadow-md"
                  >
                    {article.image_url && (
                      <div className="aspect-[16/9] overflow-hidden bg-[#f4f1eb]">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}

                    <div className="p-5">
                      {article.category && (
                        <p className="mono text-[9px] uppercase tracking-[0.2em] text-[#c8102e]">
                          {article.category}
                        </p>
                      )}

                      <h3 className="mt-2 text-lg font-semibold leading-snug">
                        {article.title}
                      </h3>

                      {article.excerpt && (
                        <p className="mt-2 text-sm leading-relaxed text-[#83766c]">
                          {article.excerpt}
                        </p>
                      )}

                      <p className="mono mt-4 text-[9px] uppercase tracking-[0.15em] text-[#83766c]">
                        Read Article →
                      </p>
                    </div>
                  </a>
                ))}
              </div>

            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
