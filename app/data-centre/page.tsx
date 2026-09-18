
import { supabase } from "@/lib/supabase";

const LANGSNING_ID = 1;

type Match = {
  id: number;
  date: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  venue: string | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};

type Goal = {
  id: number;
  match_id: number;
  minute: string | null;
  team_id: number | null;
  player_name_raw: string | null;
};

function parseMinute(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d+)(?:\+(\d+))?/);
  if (!match) return null;

  const base = Number(match[1]);
  const added = Number(match[2] || 0);

  return {
    base,
    added,
    sort: base + added / 100,
    stoppage: added > 0,
  };
}

function resultForLangsning(match: Match) {
  const langHome = match.home_team_id === LANGSNING_ID;
  const gf = langHome ? match.home_score : match.away_score;
  const ga = langHome ? match.away_score : match.home_score;

  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function longestStreak(results: string[], accepted: string[]) {
  let longest = 0;
  let current = 0;

  for (const result of results) {
    if (accepted.includes(result)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function currentStreak(results: string[], accepted: string[]) {
  let count = 0;

  for (let i = results.length - 1; i >= 0; i--) {
    if (!accepted.includes(results[i])) break;
    count++;
  }

  return count;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function MiniPie({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const total = values.reduce((sum, value) => sum + value, 0);

  if (!total) {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-100 text-xs font-bold text-slate-400">
        No data
      </div>
    );
  }

  const colors = ["#0284c7", "#94a3b8", "#e2e8f0"];
  let offset = 0;

  const segments = values.map((value, index) => {
    const start = offset;
    const size = (value / total) * 100;
    offset += size;

    return `${colors[index % colors.length]} ${start}% ${offset}%`;
  });

  return (
    <div className="flex items-center gap-5">
      <div
        className="h-28 w-28 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${segments.join(", ")})`,
        }}
      />

      <div className="space-y-2">
        {labels.map((label, index) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: colors[index % colors.length],
              }}
            />
            <span className="text-slate-600">{label}</span>
            <span className="font-black text-slate-950">
              {values[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


export default async function DataCentrePage() {

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(`
      id,
      date,
      venue,
      home_team_id,
      away_team_id,
      home_score,
      away_score,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `)
    .eq("competition", "Shillong Premier League")
    .eq("season", "2026")
    .not("home_score", "is", null)
    .not("away_score", "is", null)
    .order("date", { ascending: true });

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const allMatches = (matchesData || []) as Match[];

  const matches = allMatches.filter(
    (match) =>
      match.home_team_id === LANGSNING_ID ||
      match.away_team_id === LANGSNING_ID
  );

  const matchIds = matches.map((match) => match.id);

  const { data: eventsData } = matchIds.length
    ? await supabase
        .from("match_events")
        .select("id, match_id, minute, team_id, player_name_raw")
        .in("match_id", matchIds)
        .ilike("type", "goal")
        .order("id", { ascending: true })
    : { data: [] };

  const goals = (eventsData || []) as Goal[];

  const uniqueGoals = Array.from(
    new Map(goals.map((goal) => [goal.id, goal])).values()
  );

  const goalsByMatch = new Map<number, Goal[]>();

  for (const goal of uniqueGoals) {
    const list = goalsByMatch.get(goal.match_id) || [];
    list.push(goal);
    goalsByMatch.set(goal.match_id, list);
  }

  const results = matches.map(resultForLangsning);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let failedToScore = 0;
  let bothScored = 0;
  let threePlus = 0;
  let fourPlus = 0;

  let scoredFirst = 0;
  let concededFirst = 0;
  let scoredFirstWins = 0;
  let scoredFirstDraws = 0;
  let scoredFirstLosses = 0;
  let cameFromBehindToWin = 0;
  let cameFromBehindToDraw = 0;

  let homePlayed = 0;
  let homeWins = 0;
  let homeDraws = 0;
  let homeLosses = 0;
  let homeGoals = 0;
  let homeConceded = 0;
  let homeCleanSheets = 0;

  let awayPlayed = 0;
  let awayWins = 0;
  let awayDraws = 0;
  let awayLosses = 0;
  let awayGoals = 0;
  let awayConceded = 0;
  let awayCleanSheets = 0;

  const periodLabels = [
    "1–15",
    "16–30",
    "31–45+",
    "46–60",
    "61–75",
    "76–90+",
  ];

  const goalsByPeriod = [0, 0, 0, 0, 0, 0];

  let firstHalfGoals = 0;
  let secondHalfGoals = 0;
  let stoppageTimeGoals = 0;

  let earliestGoal: { minute: string; player: string } | null = null;
  let latestGoal: { minute: string; player: string } | null = null;

  const scorelines = new Map<string, number>();

  let biggestWin: Match | null = null;
  let biggestLoss: Match | null = null;
  let highestScoring: Match | null = null;
  let mostGoalsScored = 0;
  let mostGoalsConceded = 0;

  for (const match of matches) {
    const langHome = match.home_team_id === LANGSNING_ID;
    const gf = langHome ? match.home_score : match.away_score;
    const ga = langHome ? match.away_score : match.home_score;
    const result = resultForLangsning(match);

    goalsFor += gf;
    goalsAgainst += ga;

    if (result === "W") wins++;
    if (result === "D") draws++;
    if (result === "L") losses++;

    if (ga === 0) cleanSheets++;
    if (gf === 0) failedToScore++;
    if (gf > 0 && ga > 0) bothScored++;
    if (gf + ga >= 3) threePlus++;
    if (gf + ga >= 4) fourPlus++;

    const scoreline = `${gf}-${ga}`;
    scorelines.set(scoreline, (scorelines.get(scoreline) || 0) + 1);

    if (!biggestWin || gf - ga > biggestWin.home_score! - biggestWin.away_score!) {
      if (result === "W") biggestWin = match;
    }

    if (!biggestLoss || ga - gf > biggestLoss.away_score! - biggestLoss.home_score!) {
      if (result === "L") biggestLoss = match;
    }

    if (
      !highestScoring ||
      gf + ga > highestScoring.home_score! + highestScoring.away_score!
    ) {
      highestScoring = match;
    }

    mostGoalsScored = Math.max(mostGoalsScored, gf);
    mostGoalsConceded = Math.max(mostGoalsConceded, ga);

    if (langHome) {
      homePlayed++;
      homeGoals += gf;
      homeConceded += ga;
      if (result === "W") homeWins++;
      if (result === "D") homeDraws++;
      if (result === "L") homeLosses++;
      if (ga === 0) homeCleanSheets++;
    } else {
      awayPlayed++;
      awayGoals += gf;
      awayConceded += ga;
      if (result === "W") awayWins++;
      if (result === "D") awayDraws++;
      if (result === "L") awayLosses++;
      if (ga === 0) awayCleanSheets++;
    }

    const matchGoals = [...(goalsByMatch.get(match.id) || [])].sort(
      (a, b) => (parseMinute(a.minute)?.sort ?? 999) - (parseMinute(b.minute)?.sort ?? 999)
    );

    if (matchGoals.length) {
      const first = matchGoals[0];

      if (first.team_id === LANGSNING_ID) {
        scoredFirst++;

        if (result === "W") scoredFirstWins++;
        if (result === "D") scoredFirstDraws++;
        if (result === "L") scoredFirstLosses++;
      } else if (first.team_id) {
        concededFirst++;

        const langGoalsAfter = matchGoals.filter(
          (goal) =>
            goal.team_id === LANGSNING_ID &&
            (parseMinute(goal.minute)?.sort ?? 999) >
              (parseMinute(first.minute)?.sort ?? -1)
        );

        if (langGoalsAfter.length && result === "W") cameFromBehindToWin++;
        if (langGoalsAfter.length && result === "D") cameFromBehindToDraw++;
      }
    }

    for (const goal of matchGoals) {
      if (goal.team_id !== LANGSNING_ID) continue;

      const parsed = parseMinute(goal.minute);
      if (!parsed) continue;

      if (parsed.base <= 45) {
        firstHalfGoals++;
        if (parsed.base <= 15) goalsByPeriod[0]++;
        else if (parsed.base <= 30) goalsByPeriod[1]++;
        else goalsByPeriod[2]++;
      } else {
        secondHalfGoals++;
        if (parsed.base <= 60) goalsByPeriod[3]++;
        else if (parsed.base <= 75) goalsByPeriod[4]++;
        else goalsByPeriod[5]++;
      }

      if (parsed.stoppage) stoppageTimeGoals++;

      const player = goal.player_name_raw || "Unknown";

      if (
        !earliestGoal ||
        parsed.sort < (parseMinute(earliestGoal.minute)?.sort ?? 999)
      ) {
        earliestGoal = {
          minute: goal.minute || "",
          player,
        };
      }

      if (
        !latestGoal ||
        parsed.sort > (parseMinute(latestGoal.minute)?.sort ?? -1)
      ) {
        latestGoal = {
          minute: goal.minute || "",
          player,
        };
      }
    }
  }

  const totalMatches = matches.length;
  const totalGoals = goalsFor;
  const goalAverage = totalMatches ? (goalsFor / totalMatches).toFixed(2) : "0.00";
  const concededAverage = totalMatches
    ? (goalsAgainst / totalMatches).toFixed(2)
    : "0.00";

  let mostCommonScoreline = "—";
  let mostCommonCount = 0;

  for (const [scoreline, count] of scorelines) {
    if (count > mostCommonCount) {
      mostCommonScoreline = scoreline;
      mostCommonCount = count;
    }
  }

  const bestPeriodIndex = goalsByPeriod.indexOf(Math.max(...goalsByPeriod));
  const resultPoints = wins * 3 + draws;

  const highestScoringTotal = highestScoring
    ? highestScoring.home_score + highestScoring.away_score
    : 0;

  const biggestWinMargin = Math.max(
    ...matches.map((match) => {
      const langHome = match.home_team_id === LANGSNING_ID;
      return langHome
        ? match.home_score - match.away_score
        : match.away_score - match.home_score;
    }),
    0
  );

  const biggestLossMargin = Math.max(
    ...matches.map((match) => {
      const langHome = match.home_team_id === LANGSNING_ID;
      return langHome
        ? match.away_score - match.home_score
        : match.home_score - match.away_score;
    }),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:py-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
            The Data Centre
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Langsning FC
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Team performance, scoring patterns and match trends calculated
            directly from recorded Shillong Premier League 2026 data.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <section>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Langsning Snapshot
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Season at a glance
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Matches" value={totalMatches} />
            <StatCard label="Points" value={resultPoints} />
            <StatCard label="Goals scored" value={goalsFor} />
            <StatCard label="Goals conceded" value={goalsAgainst} />
            <StatCard
              label="Goal difference"
              value={goalsFor - goalsAgainst > 0 ? `+${goalsFor - goalsAgainst}` : goalsFor - goalsAgainst}
            />
            <StatCard label="Goals / match" value={goalAverage} />
            <StatCard label="Conceded / match" value={concededAverage} />
            <StatCard
              label="Unbeaten"
              value={`${percentage(wins + draws, totalMatches)}%`}
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Results & Consistency
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              How Langsning have performed
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">Results</h3>

              <div className="mt-6">
                <MiniPie
                  values={[wins, draws, losses]}
                  labels={["Wins", "Draws", "Losses"]}
                />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <StatCard label="Win %" value={`${percentage(wins, totalMatches)}%`} />
                <StatCard label="Draw %" value={`${percentage(draws, totalMatches)}%`} />
                <StatCard label="Loss %" value={`${percentage(losses, totalMatches)}%`} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">
                Match trends
              </h3>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatCard
                  label="Clean sheets"
                  value={cleanSheets}
                  sub={`${percentage(cleanSheets, totalMatches)}% of matches`}
                />
                <StatCard
                  label="Failed to score"
                  value={failedToScore}
                  sub={`${percentage(failedToScore, totalMatches)}% of matches`}
                />
                <StatCard
                  label="Both scored"
                  value={bothScored}
                  sub={`${percentage(bothScored, totalMatches)}% of matches`}
                />
                <StatCard label="3+ total goals" value={threePlus} />
                <StatCard label="4+ total goals" value={fourPlus} />
                <StatCard
                  label="Unbeaten streak"
                  value={longestStreak(results, ["W", "D"])}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Scoring Patterns
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              When Langsning score
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">
                Goals by half
              </h3>

              <div className="mt-6">
                <MiniPie
                  values={[firstHalfGoals, secondHalfGoals]}
                  labels={["First half", "Second half"]}
                />
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <StatCard label="First half" value={firstHalfGoals} />
                <StatCard label="Second half" value={secondHalfGoals} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">
                15-minute periods
              </h3>

              <div className="mt-6 space-y-4">
                {periodLabels.map((label, index) => {
                  const value = goalsByPeriod[index];
                  const max = Math.max(...goalsByPeriod, 1);
                  const width = (value / max) * 100;

                  return (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-600">{label} min</span>
                        <span className="text-slate-950">{value}</span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-600"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-xs text-slate-500">
                Most productive period:{" "}
                <span className="font-black text-slate-800">
                  {periodLabels[bestPeriodIndex]} minutes
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Earliest goal"
              value={earliestGoal?.minute || "—"}
              sub={earliestGoal?.player || "No recorded goal"}
            />
            <StatCard
              label="Latest goal"
              value={latestGoal?.minute || "—"}
              sub={latestGoal?.player || "No recorded goal"}
            />
            <StatCard label="Stoppage-time goals" value={stoppageTimeGoals} />
            <StatCard label="Recorded Langsning goals" value={totalGoals} />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Match Behaviour
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              What happens during matches
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Scored first" value={scoredFirst} />
            <StatCard label="Conceded first" value={concededFirst} />
            <StatCard label="Won after scoring first" value={scoredFirstWins} />
            <StatCard label="Drawn after scoring first" value={scoredFirstDraws} />
            <StatCard label="Lost after scoring first" value={scoredFirstLosses} />
            <StatCard label="Comeback wins" value={cameFromBehindToWin} />
            <StatCard label="Comeback draws" value={cameFromBehindToDraw} />
            <StatCard
              label="Current unbeaten"
              value={currentStreak(results, ["W", "D"])}
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Home vs Away
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Venue split
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">Home</h3>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatCard label="Played" value={homePlayed} />
                <StatCard label="Record" value={`${homeWins}-${homeDraws}-${homeLosses}`} />
                <StatCard
                  label="Goals / match"
                  value={homePlayed ? (homeGoals / homePlayed).toFixed(2) : "0.00"}
                />
                <StatCard label="Clean sheets" value={homeCleanSheets} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">Away</h3>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatCard label="Played" value={awayPlayed} />
                <StatCard label="Record" value={`${awayWins}-${awayDraws}-${awayLosses}`} />
                <StatCard
                  label="Goals / match"
                  value={awayPlayed ? (awayGoals / awayPlayed).toFixed(2) : "0.00"}
                />
                <StatCard label="Clean sheets" value={awayCleanSheets} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 pb-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Records
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Langsning records
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Most common scoreline" value={mostCommonScoreline} />
            <StatCard label="Biggest win" value={`${biggestWinMargin} goal${biggestWinMargin === 1 ? "" : "s"}`} />
            <StatCard label="Biggest defeat" value={`${biggestLossMargin} goal${biggestLossMargin === 1 ? "" : "s"}`} />
            <StatCard
              label="Highest scoring match"
              value={`${highestScoringTotal} goals`}
              sub={
                highestScoring
                  ? `${highestScoring.home_score}-${highestScoring.away_score}`
                  : undefined
              }
            />
            <StatCard label="Most scored in one match" value={mostGoalsScored} />
            <StatCard label="Most conceded in one match" value={mostGoalsConceded} />
            <StatCard
              label="Longest winning streak"
              value={longestStreak(results, ["W"])}
            />
            <StatCard
              label="Longest unbeaten streak"
              value={longestStreak(results, ["W", "D"])}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
