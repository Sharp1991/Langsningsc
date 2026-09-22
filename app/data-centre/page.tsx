export const dynamic = "force-dynamic";


import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

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
  player_id: number | null;
  player_name_raw: string | null;
  competition: string;
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

  const allMatches = (matchesData || []).map((m) => ({ ...m, home_team: Array.isArray(m.home_team) ? m.home_team[0] : m.home_team, away_team: Array.isArray(m.away_team) ? m.away_team[0] : m.away_team })) as Match[];

  const matches = allMatches.filter(
    (match) =>
      match.home_team_id === LANGSNING_ID ||
      match.away_team_id === LANGSNING_ID
  );

  const matchIds = matches.map((match) => match.id);

  const { data: durandMatchesData } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id")
    .eq("competition", "Durand Cup")
    .eq("season", "2026")
    .or(`home_team_id.eq.${LANGSNING_ID},away_team_id.eq.${LANGSNING_ID}`)
    .not("home_score", "is", null)
    .not("away_score", "is", null);

  const durandMatchIds = (durandMatchesData || []).map((match) => match.id);

  const scorerMatchIds = Array.from(
    new Set([...matchIds, ...durandMatchIds])
  );

  const { data: eventsData } = scorerMatchIds.length
    ? await supabase
        .from("match_events")
        .select("id, match_id, minute, team_id, player_id, player_name_raw")
        .in("match_id", scorerMatchIds)
        .ilike("type", "goal")
        .order("id", { ascending: true })
    : { data: [] };

  const goals = (eventsData || []) as Goal[];

  const uniqueGoals = Array.from(
    new Map(goals.map((goal) => [goal.id, goal])).values()
  );

  const goalMatchIds = Array.from(
    new Set(uniqueGoals.map((goal) => goal.match_id))
  );

  const { data: scorerMatchData } = goalMatchIds.length
    ? await supabase
        .from("matches")
        .select("id, competition")
        .in("id", goalMatchIds)
    : { data: [] };

  const competitionByMatch = new Map(
    (scorerMatchData || []).map((match) => [match.id, match.competition])
  );

  for (const goal of uniqueGoals) {
    goal.competition = competitionByMatch.get(goal.match_id) || "";
  }

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

  const scorerMap = new Map<number, {
    playerId: number;
    name: string;
    photoUrl: string | null;
    splGoals: number;
    durandGoals: number;
  }>();

  for (const goal of uniqueGoals) {
    if (goal.team_id !== LANGSNING_ID || !goal.player_id) continue;

    const existing = scorerMap.get(goal.player_id) || {
      playerId: goal.player_id,
      name: goal.player_name_raw || "Unknown",
      photoUrl: null,
      splGoals: 0,
      durandGoals: 0,
    };

    if (goal.competition === "Shillong Premier League") {
      existing.splGoals++;
    } else if (goal.competition === "Durand Cup") {
      existing.durandGoals++;
    }

    scorerMap.set(goal.player_id, existing);
  }

  const { data: scorerPlayers } = scorerMap.size
    ? await supabase
        .from("players")
        .select("id, name, photo_url")
        .in("id", Array.from(scorerMap.keys()))
    : { data: [] };

  for (const player of scorerPlayers || []) {
    const scorer = scorerMap.get(player.id);
    if (!scorer) continue;

    scorer.name = player.name || scorer.name;
    scorer.photoUrl = player.photo_url || null;
  }

  const topScorers = Array.from(scorerMap.values())
    .sort(
      (a, b) =>
        b.splGoals +
        b.durandGoals -
        (a.splGoals + a.durandGoals) ||
        a.name.localeCompare(b.name)
    );

  const topScorerGoals = topScorers.length
    ? topScorers[0].splGoals + topScorers[0].durandGoals
    : 0;

  const topScorerPlayers = topScorers.filter(
    (player) => player.splGoals + player.durandGoals === topScorerGoals
  );

  const tableMap = new Map<number, {
    teamId: number;
    name: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }>();

  for (const match of allMatches) {
    const teams = [
      {
        id: match.home_team_id,
        name: match.home_team?.name || "Unknown",
        gf: match.home_score,
        ga: match.away_score,
      },
      {
        id: match.away_team_id,
        name: match.away_team?.name || "Unknown",
        gf: match.away_score,
        ga: match.home_score,
      },
    ];

    for (const team of teams) {
      const row = tableMap.get(team.id) || {
        teamId: team.id,
        name: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      };

      row.played++;
      row.goalsFor += team.gf;
      row.goalsAgainst += team.ga;

      if (team.gf > team.ga) {
        row.wins++;
        row.points += 3;
      } else if (team.gf === team.ga) {
        row.draws++;
        row.points += 1;
      } else {
        row.losses++;
      }

      tableMap.set(team.id, row);
    }
  }

  const leagueTable = Array.from(tableMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;

    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;

    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

    return a.name.localeCompare(b.name);
  });

  const langsningTableRow = leagueTable.find(
    (team) => team.teamId === LANGSNING_ID
  );

  const langsningPosition = langsningTableRow
    ? leagueTable.findIndex((team) => team.teamId === LANGSNING_ID) + 1
    : null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 pt-20">
      <div className="data-centre-content"><section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
            The Data Centre
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Team performance, scoring patterns and match trends calculated
            directly from recorded Shillong Premier League 2026 data.
          </p>
        </div>
      </section>

      <div className="data-centre-content mx-auto max-w-7xl px-5 py-8">
        <section>
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Langsning Snapshot
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Season at a glance
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-4">
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
            Table & Scoring
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            League position and leading scorer
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-black text-slate-950">
              2026 Shillong Premier League
            </h3>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pr-3">#</th>
                    <th className="pb-3 pr-3">Team</th>
                    <th className="pb-3 px-2 text-center">P</th>
                    <th className="pb-3 px-2 text-center">W</th>
                    <th className="pb-3 px-2 text-center">D</th>
                    <th className="pb-3 px-2 text-center">L</th>
                    <th className="pb-3 px-2 text-center">GD</th>
                    <th className="pb-3 pl-2 text-center">Pts</th>
                  </tr>
                </thead>

                <tbody>
                  {leagueTable.map((team, index) => {
                    const isLangsning = team.teamId === LANGSNING_ID;
                    const goalDifference =
                      team.goalsFor - team.goalsAgainst;

                    return (
                      <tr
                        key={team.teamId}
                        className={
                          isLangsning
                            ? "border-b border-red-200 bg-red-50 font-black text-slate-950"
                            : "border-b border-slate-100 text-slate-700"
                        }
                      >
                        <td className="py-3 pr-3">
                          {index + 1}
                        </td>

                        <td className="py-3 pr-3">
                          {team.name}
                          {isLangsning && (
                            <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                              Langsning
                            </span>
                          )}
                        </td>

                        <td className="px-2 py-3 text-center">
                          {team.played}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {team.wins}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {team.draws}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {team.losses}
                        </td>
                        <td className="px-2 py-3 text-center">
                          {goalDifference > 0
                            ? `+${goalDifference}`
                            : goalDifference}
                        </td>
                        <td className="pl-2 py-3 text-center">
                          {team.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
              Calculated from recorded 2026 Shillong Premier League matches in Supabase.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-black text-slate-950">
              Top scorer
            </h3>

            {topScorerPlayers.length ? (
              <div className="mt-5 space-y-4">
                {topScorerPlayers.map((player) => {
                  const total =
                    player.splGoals + player.durandGoals;

                  return (
                    <div
                      key={player.playerId}
                      className="flex items-center gap-4"
                    >
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">
                          —
                        </div>
                      )}

                      <div>
                        <p className="text-2xl font-black tracking-tight text-slate-950">
                          {player.name}
                        </p>

                        <p className="mt-1 text-sm font-bold text-red-600">
                          {total} total goals
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          SPL: {player.splGoals} · Durand Cup: {player.durandGoals}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <p className="pt-2 text-xs font-medium text-slate-400">
                  Shillong Premier League + Durand Cup · 2026
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                No recorded goal scorers.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Results & Consistency
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              How Langsning have performed
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Scoring Patterns
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              When Langsning score
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-5">
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
                          className="h-full rounded-full bg-red-600"
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

          <div className="mt-5 grid grid-cols-4 gap-4">
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Match Behaviour
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              What happens during matches
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-4">
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

        <section className="mt-10 pb-12">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">
              Records
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Langsning records
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-4">
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
      </div>
      </main>
    </>
  );
}
