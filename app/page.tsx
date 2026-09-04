import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import NextMatch from "@/components/NextMatch";
import LatestStories from "@/components/LatestStories";
import AboutClub from "@/components/AboutClub";
import Footer from "@/components/Footer";
import QuickInfo from "@/components/QuickInfo";
import { supabase } from "@/lib/supabase";

const LANGSNING_ID = 1;

export default async function Home() {
  const [
    { data: articles },
    { data: matches },
    { data: goals },
    { data: players },
    { data: teams },
  ] = await Promise.all([
    supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(4),

    supabase
      .from("matches")
      .select(
        "id,date,competition,season,home_team_id,away_team_id,home_score,away_score,status"
      )
      .eq("season", "2026")
      .or(
        `home_team_id.eq.${LANGSNING_ID},away_team_id.eq.${LANGSNING_ID}`
      )
      .order("date", { ascending: false }),

    supabase
      .from("match_events")
      .select("match_id,player_id,player_name_raw,type")
      .eq("team_id", LANGSNING_ID),

    supabase
      .from("players")
      .select("id,name,photo_url"),

    supabase
      .from("teams")
      .select("id,name,crest_url"),

  ]);

  const safeMatches = matches || [];
  const safeGoals = goals || [];
  const safePlayers = players || [];
  const safeTeams = teams || [];

  const finishedMatches = safeMatches.filter(
    (match) =>
      match.status === "finished"
  );

  const finishedMatchIds = new Set(
    finishedMatches.map((match) => match.id)
  );

  const teamGoalsFor = finishedMatches.reduce((total, match) => {
    if (match.home_team_id === LANGSNING_ID) {
      return total + (match.home_score || 0);
    }
    return total + (match.away_score || 0);
  }, 0);

  const teamGoalsAgainst = finishedMatches.reduce((total, match) => {
    if (match.home_team_id === LANGSNING_ID) {
      return total + (match.away_score || 0);
    }
    return total + (match.home_score || 0);
  }, 0);

  type Scorer = {
    playerId: number | null;
    name: string;
    goals: number;
    imageUrl: string | null;
  };

  function calculateTopScorers(
    competition?: string
  ): Scorer[] {
    const counts = new Map<string, Scorer>();

    for (const goal of safeGoals) {
      if (
        !goal.type ||
        goal.type.toLowerCase() !== "goal"
      ) {
        continue;
      }

      if (!finishedMatchIds.has(goal.match_id)) {
        continue;
      }

      const match = safeMatches.find(
        (item) => item.id === goal.match_id
      );

      if (!match) continue;

      if (
        competition &&
        match.competition !== competition
      ) {
        continue;
      }

      const key =
        goal.player_id !== null
          ? `player-${goal.player_id}`
          : `name-${(
              goal.player_name_raw || "unknown"
            )
              .trim()
              .toLowerCase()}`;

      const existing = counts.get(key);

      if (existing) {
        existing.goals += 1;
        continue;
      }

      const player = safePlayers.find(
        (p) => p.id === goal.player_id
      );

      counts.set(key, {
        playerId: goal.player_id,
        name:
          player?.name?.trim() ||
          goal.player_name_raw?.trim() ||
          "Unknown",
        goals: 1,
        imageUrl: player?.photo_url ?? null,
      });
    }

    const scorers = Array.from(counts.values());

    if (scorers.length === 0) {
      return [];
    }

    const highestGoals = Math.max(
      ...scorers.map((scorer) => scorer.goals)
    );

    return scorers
      .filter(
        (scorer) =>
          scorer.goals === highestGoals
      )
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );
  }

  const splTopScorers = calculateTopScorers(
    "Shillong Premier League"
  );

  const durandTopScorers = calculateTopScorers(
    "IndianOil Durand Cup"
  );

  const overallTopScorers = calculateTopScorers();

  const form = finishedMatches
    .map((match) => {
      const isHome =
        match.home_team_id === LANGSNING_ID;

      const langsningScore = isHome
        ? match.home_score
        : match.away_score;

      const opponentScore = isHome
        ? match.away_score
        : match.home_score;

      if (
        langsningScore === null ||
        opponentScore === null
      ) {
        return null;
      }

      if (langsningScore > opponentScore) {
        return "W";
      }

      if (langsningScore < opponentScore) {
        return "L";
      }

      return "D";
    })
    .filter(Boolean) as string[];

  const formWins = form.filter((result) => result === "W").length;
  const formDraws = form.filter((result) => result === "D").length;
  const formLosses = form.filter((result) => result === "L").length;
  const formGames = form.length;

  const winPercentage =
    formGames > 0
      ? Math.round((formWins / formGames) * 1000) / 10
      : 0;

  let biggestWin: {
    score: string;
    opponent: string;
    competition: string;
    langsningCrestUrl: string | null;
    opponentCrestUrl: string | null;
    goalDifference: number;
  } | null = null;

  for (const match of finishedMatches) {
    const isHome =
      match.home_team_id === LANGSNING_ID;

    const langsningScore = isHome
      ? match.home_score
      : match.away_score;

    const opponentScore = isHome
      ? match.away_score
      : match.home_score;

    if (
      langsningScore === null ||
      opponentScore === null
    ) {
      continue;
    }

    const difference =
      langsningScore - opponentScore;

    if (
      difference > 0 &&
      (!biggestWin ||
        difference >
          biggestWin.goalDifference)
    ) {
      const opponentId = isHome
        ? match.away_team_id
        : match.home_team_id;

      const opponentTeam = safeTeams.find(
        (team) => team.id === opponentId
      );

      const opponent =
        opponentTeam?.name || "Opponent";

      const langsningTeam = safeTeams.find(
        (team) => team.id === LANGSNING_ID
      );

      biggestWin = {
        score: `${langsningScore}–${opponentScore}`,
        opponent,
        competition: match.competition,
        langsningCrestUrl:
          langsningTeam?.crest_url || null,
        opponentCrestUrl:
          opponentTeam?.crest_url || null,
        goalDifference: difference,
      };
    }
  }

  const quickInfo = {
    topScorer: {
      teamGoalsFor: teamGoalsFor,
      teamGoalsAgainst: teamGoalsAgainst,
      teamCrestUrl:
        safeTeams.find((team) => team.id === LANGSNING_ID)?.crest_url || null,
      spl: splTopScorers.map((scorer) => ({
        playerId: scorer.playerId,
        name: scorer.name,
        goals: scorer.goals,
        imageUrl: scorer.imageUrl,
      })),

      durand: durandTopScorers.map((scorer) => ({
        playerId: scorer.playerId,
        name: scorer.name,
        goals: scorer.goals,
        imageUrl: scorer.imageUrl,
      })),

      overall: overallTopScorers.map((scorer) => ({
        playerId: scorer.playerId,
        name: scorer.name,
        goals: scorer.goals,
        imageUrl: scorer.imageUrl,
      })),
    },

    form: {
      results: form,
      games: formGames,
      wins: formWins,
      draws: formDraws,
      losses: formLosses,
      winPercentage,
    },

    biggestWin: biggestWin
      ? {
          score: biggestWin.score,
          opponent: biggestWin.opponent,
          competition: biggestWin.competition,
          langsningCrestUrl:
            biggestWin.langsningCrestUrl,
          opponentCrestUrl:
            biggestWin.opponentCrestUrl,
        }
      : null,
  };

  return (
    <>
      <Navbar />

      <Hero articles={articles || []} />

      <NextMatch />

      <section className="px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <QuickInfo data={quickInfo} />
        </div>
      </section>

      <LatestStories />

      <AboutClub />

      <Footer />
    </>
  );
}
