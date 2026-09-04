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
        "id,date,competition,season,home_team_id,away_team_id,home_score,away_score"
      )
      .eq("status", "finished")
      .eq("season", "2026")
      .or(
        `home_team_id.eq.${LANGSNING_ID},away_team_id.eq.${LANGSNING_ID}`
      )
      .order("date", { ascending: false }),

    supabase
      .from("match_events")
      .select("match_id,player_id,player_name_raw")
      .eq("team_id", LANGSNING_ID)
      .eq("type", "GOAL"),

    supabase
      .from("players")
      .select("id,name"),

    supabase
      .from("teams")
      .select("id,name"),
  ]);

  const safeMatches = matches || [];
  const safeGoals = goals || [];
  const safePlayers = players || [];
  const safeTeams = teams || [];

  const finishedMatchIds = new Set(
    safeMatches.map((match) => match.id)
  );

  // --------------------------------------------------
  // TOP SCORER
  // --------------------------------------------------

  type Scorer = {
    playerId: number | null;
    name: string;
    goals: number;
  };

  function calculateTopScorer(
    competition?: string
  ): Scorer | null {
    const counts = new Map<string, Scorer>();

    for (const goal of safeGoals) {
      // Only count goals from finished 2026 matches
      if (!finishedMatchIds.has(goal.match_id)) {
        continue;
      }

      const match = safeMatches.find(
        (item) => item.id === goal.match_id
      );

      if (!match) continue;

      // Competition-specific calculation
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
              goal.player_name_raw || "Unknown"
            ).toLowerCase()}`;

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
          player?.name ||
          goal.player_name_raw ||
          "Unknown",
        goals: 1,
      });
    }

    return (
      Array.from(counts.values()).sort(
        (a, b) => b.goals - a.goals
      )[0] || null
    );
  }

  const splTopScorer = calculateTopScorer(
    "Shillong Premier League"
  );

  const durandTopScorer = calculateTopScorer(
    "IndianOil Durand Cup"
  );

  const overallTopScorer = calculateTopScorer();

  // --------------------------------------------------
  // CURRENT FORM
  // --------------------------------------------------

  const form = safeMatches
    .slice(0, 5)
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

      if (langsningScore > opponentScore) return "W";
      if (langsningScore < opponentScore) return "L";

      return "D";
    })
    .filter(Boolean) as string[];

  // --------------------------------------------------
  // BIGGEST WIN
  // --------------------------------------------------

  let biggestWin: {
    score: string;
    opponent: string;
    goalDifference: number;
  } | null = null;

  for (const match of safeMatches) {
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
        difference > biggestWin.goalDifference)
    ) {
      const opponentId = isHome
        ? match.away_team_id
        : match.home_team_id;

      const opponent =
        safeTeams.find(
          (team) => team.id === opponentId
        )?.name || "Opponent";

      biggestWin = {
        score: `${langsningScore}–${opponentScore}`,
        opponent,
        goalDifference: difference,
      };
    }
  }

  // --------------------------------------------------
  // QUICK INFO DATA
  // --------------------------------------------------

  const quickInfo = {
    topScorer: {
      spl: splTopScorer
        ? {
            name: splTopScorer.name,
            goals: splTopScorer.goals,
          }
        : null,

      durand: durandTopScorer
        ? {
            name: durandTopScorer.name,
            goals: durandTopScorer.goals,
          }
        : null,

      overall: overallTopScorer
        ? {
            name: overallTopScorer.name,
            goals: overallTopScorer.goals,
          }
        : null,
    },

    form,

    biggestWin: biggestWin
      ? {
          score: biggestWin.score,
          opponent: biggestWin.opponent,
        }
      : null,
  };

  return (
    <>
      <Navbar />

      <Hero articles={articles || []} />

      <NextMatch />

      {/* CLUB UPDATE */}
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
