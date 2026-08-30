"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TeamInfo = {
  id: number;
  name: string;
  short_name?: string | null;
  crest_url?: string | null;
};

type MatchInfo = {
  id: number;
  competition: string;
  season: string;
  date: string;
  venue?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  status?: string | null;
  time?: string | null;
  home_team?: TeamInfo | null;
  away_team?: TeamInfo | null;
};

type EventType = {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

type TagConfig = {
  id: number;
  match_id: number;
  team_id: number;
  event_type_id: number;
  label: string;
  keyboard_key: string | null;
  enabled: boolean;
  sort_order: number;
  event_type?: EventType;
  team?: TeamInfo;
};

type LocalEvent = {
  local_id: string;
  id?: number;
  match_id: number;
  match_time: number;
  team_id: number;
  team: string;
  event_type: string;
  created_at: string;
  synced: boolean;
};

type MatchStat = {
  id: number;
  stat_name: string;
  home_value: number | null;
  away_value: number | null;
  locked: boolean;
};

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function eventStorageKey(matchId: number) {
  return `langsning-tag-events-${matchId}`;
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
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

export default function LiveMatchLogger() {
  const params = useParams();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [configs, setConfigs] = useState<TagConfig[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [manualStats, setManualStats] = useState({
    home: {
      passCompleted: "",
      passMissed: "",
      shots: "",
      shotsOnTarget: "",
      shotsMissed: "",
      shotsInsideBox: "",
      shotsOutsideBox: "",
    },
    away: {
      passCompleted: "",
      passMissed: "",
      shots: "",
      shotsOnTarget: "",
      shotsMissed: "",
      shotsInsideBox: "",
      shotsOutsideBox: "",
    },
  });


  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [showSettings, setShowSettings] = useState(false);

  const [operator, setOperator] = useState<
    "Both" | "Home" | "Away"
  >("Both");

  const secondsRef = useRef(0);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  /*
   * ---------------------------------------------------------
   * CLOCK
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  /*
   * ---------------------------------------------------------
   * ONLINE / OFFLINE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const updateOnline = () => {
      setOnline(navigator.onLine);
    };

    updateOnline();

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */

  const loadMatch = useCallback(async () => {
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        competition,
        season,
        date,
        venue,
        home_score,
        away_score,
        status,
        time,
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
      .eq("id", matchId)
      .single();

    if (error) {
      console.error(error);
      setMessage("Could not load match.");
      return;
    }

    const matchData = data as any;

    setMatch({
      ...matchData,
      home_team: Array.isArray(matchData.home_team)
        ? matchData.home_team[0] ?? null
        : matchData.home_team ?? null,
      away_team: Array.isArray(matchData.away_team)
        ? matchData.away_team[0] ?? null
        : matchData.away_team ?? null,
    } as MatchInfo);
  }, [matchId]);

  const loadEventTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from("event_types")
      .select("id, code, name, active")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error(error);
      setMessage("Could not load event types.");
      return;
    }

    setEventTypes((data || []) as EventType[]);
  }, []);

  const loadConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from("match_tag_configs")
      .select(
        `
        id,
        match_id,
        team_id,
        event_type_id,
        label,
        keyboard_key,
        enabled,
        sort_order,
        event_type:event_types (
          id,
          code,
          name,
          active
        ),
        team:teams (
          id,
          name,
          short_name,
          crest_url
        )
      `
      )
      .eq("match_id", matchId)
      .order("sort_order");

    if (error) {
      console.error(error);
      setMessage("Could not load tagging settings.");
      return;
    }

    setConfigs((data || []) as TagConfig[]);
  }, [matchId]);

  const loadLocalEvents = useCallback(() => {
    try {
      const raw = localStorage.getItem(
        eventStorageKey(matchId)
      );

      if (!raw) {
        setEvents([]);
        return;
      }

      const parsed = JSON.parse(raw) as LocalEvent[];

      setEvents(
        parsed.sort(
          (a, b) => a.match_time - b.match_time
        )
      );
    } catch (error) {
      console.error(
        "LOCAL EVENTS LOAD ERROR:",
        error
      );
      setEvents([]);
    }
  }, [matchId]);

  const loadManualStats = useCallback(async () => {
    if (!matchId) return;

    const { data, error } = await supabase
      .from("match_stat_drafts")
      .select("team_id, stat_code, value")
      .eq("match_id", matchId);

    if (error) {
      console.error("MANUAL STATS LOAD ERROR:", error);
      return;
    }

    const homeId = match?.home_team?.id;
    const awayId = match?.away_team?.id;

    if (!homeId || !awayId) return;

    const home: Record<string, string> = {};
    const away: Record<string, string> = {};

    for (const row of data || []) {
      const value = String(row.value ?? "");

      if (row.team_id === homeId) {
        home[row.stat_code] = value;
      }

      if (row.team_id === awayId) {
        away[row.stat_code] = value;
      }
    }

    setManualStats((current) => ({
      home: {
        ...current.home,
        ...home,
      },
      away: {
        ...current.away,
        ...away,
      },
    }));
  }, [matchId, match]);

  const saveManualStat = useCallback(
    async (
      teamId: number,
      statCode: string,
      rawValue: string
    ) => {
      if (!matchId) return;

      const cleanValue = rawValue.trim();

      if (cleanValue === "") {
        const { error } = await supabase
          .from("match_stat_drafts")
          .delete()
          .eq("match_id", matchId)
          .eq("team_id", teamId)
          .eq("stat_code", statCode);

        if (error) {
          console.error("MANUAL STATS DELETE ERROR:", error);
        }

        return;
      }

      const numericValue = Number(cleanValue);

      if (!Number.isFinite(numericValue) || numericValue < 0) {
        return;
      }

      const { error } = await supabase
        .from("match_stat_drafts")
        .upsert(
          {
            match_id: matchId,
            team_id: teamId,
            stat_code: statCode,
            value: numericValue,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "match_id,team_id,stat_code",
          }
        );

      if (error) {
        console.error("MANUAL STATS SAVE ERROR:", error);
      }
    },
    [matchId]
  );

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!matchId || Number.isNaN(matchId)) return;

    async function load() {
      setLoading(true);

      await Promise.all([
        loadMatch(),
        loadEventTypes(),
        loadConfigs(),
      ]);

      loadLocalEvents();

      setLoading(false);
    }

    load();
  }, [
    matchId,
    loadMatch,
    loadEventTypes,
    loadConfigs,
    loadLocalEvents,
  ]);

  useEffect(() => {
    if (!loading && match?.home_team && match?.away_team) {
      loadManualStats();
    }
  }, [
    loading,
    match,
    loadManualStats,
  ]);

  /*
   * ---------------------------------------------------------
   * CREATE DEFAULT CONFIG
   *
   * If a match has no configuration yet, create one for every
   * active event and both teams.
   *
   * All events start ENABLED.
   * Keyboard keys start NULL.
   *
   * This means new events added in Supabase automatically
   * become available without changing this code.
   * ---------------------------------------------------------
   */

  const createMissingConfigs = useCallback(async () => {
    if (!match) return;

    if (configs.length > 0) return;

    const teams = [
      match.home_team,
      match.away_team,
    ].filter(Boolean) as TeamInfo[];

    if (!teams.length || !eventTypes.length) return;

    const rows = teams.flatMap((team) =>
      eventTypes.map((event, index) => ({
        match_id: match.id,
        team_id: team.id,
        event_type_id: event.id,
        label: event.name,
        keyboard_key: null,
        enabled: true,
        sort_order: index,
      }))
    );

    if (!rows.length) return;

    const { error } = await supabase
      .from("match_tag_configs")
      .insert(rows);

    if (error) {
      console.error(
        "CONFIG CREATE ERROR:",
        error
      );
      return;
    }

    await loadConfigs();
  }, [
    match,
    configs.length,
    eventTypes,
    loadConfigs,
  ]);

  useEffect(() => {
    if (
      !loading &&
      match &&
      eventTypes.length > 0 &&
      configs.length === 0
    ) {
      createMissingConfigs();
    }
  }, [
    loading,
    match,
    eventTypes,
    configs.length,
    createMissingConfigs,
  ]);

  /*
   * ---------------------------------------------------------
   * LOCAL STORAGE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!matchId) return;

    localStorage.setItem(
      eventStorageKey(matchId),
      JSON.stringify(events)
    );
  }, [events, matchId]);

  /*
   * ---------------------------------------------------------
   * SYNC
   * ---------------------------------------------------------
   */

  const syncEvents = useCallback(async () => {
    if (!navigator.onLine) return;

    const unsynced = events.filter(
      (event) => !event.synced
    );

    if (!unsynced.length) return;

    setSyncing(true);

    const successfulIds: string[] = [];

    for (const event of unsynced) {
      const { data, error } = await supabase
        .from("match_events_test")
        .insert({
          match_id: event.match_id,
          match_time: event.match_time,
          team: event.team,
          event_type: event.event_type,
          created_at: event.created_at,
          needs_review: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error(
          "EVENT SYNC ERROR:",
          error
        );
        continue;
      }

      successfulIds.push(event.local_id);

      setEvents((current) =>
        current.map((item) =>
          item.local_id === event.local_id
            ? {
                ...item,
                id: data.id,
                synced: true,
              }
            : item
        )
      );
    }

    if (successfulIds.length) {
      setMessage(
        `${successfulIds.length} event${
          successfulIds.length === 1 ? "" : "s"
        } synced.`
      );
    }

    setSyncing(false);
  }, [events]);

  useEffect(() => {
    if (!online) return;

    syncEvents();
  }, [online, syncEvents]);

  /*
   * ---------------------------------------------------------
   * TAG EVENT
   * ---------------------------------------------------------
   */

  function saveEventLocally(
    team: TeamInfo,
    event: EventType,
    config: TagConfig
  ) {
    const localEvent: LocalEvent = {
      local_id: makeLocalId(),
      match_id: matchId,
      match_time: secondsRef.current,
      team_id: team.id,
      team: team.name,
      event_type: event.code,
      created_at: new Date().toISOString(),
      synced: false,
    };

    setEvents((current) =>
      [...current, localEvent].sort(
        (a, b) => a.match_time - b.match_time
      )
    );

    setMessage(
      `${team.name}: ${config.label}`
    );
  }

  function recordEvent(config: TagConfig) {
    if (!config.enabled) return;

    const team = config.team;
    const event = config.event_type;

    if (!team || !event) return;

    saveEventLocally(team, event, config);
  }

  /*
   * ---------------------------------------------------------
   * UNDO
   * ---------------------------------------------------------
   */

  function undoLastEvent() {
    setEvents((current) => {
      if (!current.length) return current;

      const copy = [...current];
      copy.pop();

      return copy;
    });

    setMessage("Last local event removed.");
  }

  /*
   * ---------------------------------------------------------
   * KEYBOARD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        undoLastEvent();
        return;
      }

      const key = event.key.toLowerCase();

      if (key.length !== 1) return;

      const matches = configs.filter(
        (config) =>
          config.enabled &&
          config.keyboard_key?.toLowerCase() === key
      );

      if (!matches.length) return;

      let usable = matches;

      if (operator === "Home") {
        usable = matches.filter(
          (config) =>
            config.team_id ===
            match?.home_team?.id
        );
      }

      if (operator === "Away") {
        usable = matches.filter(
          (config) =>
            config.team_id ===
            match?.away_team?.id
        );
      }

      /*
       * If Both is selected and the same key is assigned
       * to more than one team, don't guess.
       */
      if (operator === "Both" && usable.length !== 1) {
        setMessage(
          `Key "${key}" is assigned to ${
            usable.length
          } events. Select Home/Away or change the key.`
        );
        return;
      }

      if (usable.length !== 1) return;

      event.preventDefault();
      recordEvent(usable[0]);
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    configs,
    match,
    operator,
  ]);

  /*
   * ---------------------------------------------------------
   * CONFIG UPDATE
   * ---------------------------------------------------------
   */

  async function updateConfig(
    config: TagConfig,
    changes: Partial<TagConfig>
  ) {
    const { error } = await supabase
      .from("match_tag_configs")
      .update(changes)
      .eq("id", config.id);

    if (error) {
      console.error(error);
      setMessage("Could not save setting.");
      return;
    }

    setConfigs((current) =>
      current.map((item) =>
        item.id === config.id
          ? { ...item, ...changes }
          : item
      )
    );
  }

  /*
   * ---------------------------------------------------------
   * VISIBLE BUTTONS
   * ---------------------------------------------------------
   */

  const visibleConfigs = useMemo(() => {
    return configs
      .filter((config) => config.enabled)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }

        return a.label.localeCompare(
          b.label
        );
      });
  }, [configs]);

  const homeButtons = visibleConfigs.filter(
    (config) =>
      config.team_id === match?.home_team?.id
  );

  const awayButtons = visibleConfigs.filter(
    (config) =>
      config.team_id === match?.away_team?.id
  );

  const liveCount = (
    teamId: number | null | undefined,
    eventType: string
  ) => {
    if (!teamId) return 0;

    return events.filter(
      (event) =>
        event.team_id === teamId &&
        event.event_type === eventType
    ).length;
  };

  const homeTeamId = match?.home_team?.id;
  const awayTeamId = match?.away_team?.id;

  const liveShots = (
    teamId: number | null | undefined
  ) =>
    liveCount(teamId, "SHOT_ON_TARGET") +
    liveCount(teamId, "SHOT_MISSED");

  const livePassAttempts = (
    teamId: number | null | undefined
  ) =>
    liveCount(teamId, "PASS_COMPLETED") +
    liveCount(teamId, "PASS_MISSED");

  const livePassAccuracy = (
    teamId: number | null | undefined
  ) => {
    const attempts = livePassAttempts(teamId);

    if (!attempts) return 0;

    return Math.round(
      (liveCount(teamId, "PASS_COMPLETED") /
        attempts) *
        100
    );
  };

  const liveShotAccuracy = (
    teamId: number | null | undefined
  ) => {
    const total = liveShots(teamId);

    if (!total) return 0;

    return Math.round(
      (liveCount(teamId, "SHOT_ON_TARGET") /
        total) *
        100
    );
  };

  function addManualStat(
    team: TeamInfo,
    eventType: string
  ) {
    const localEvent: LocalEvent = {
      local_id: makeLocalId(),
      match_id: matchId,
      match_time: secondsRef.current,
      team_id: team.id,
      team: team.name,
      event_type: eventType,
      created_at: new Date().toISOString(),
      synced: false,
    };

    setEvents((current) =>
      [...current, localEvent].sort(
        (a, b) => a.match_time - b.match_time
      )
    );

    setMessage(
      `${team.name}: ${eventType.replaceAll("_", " ")}`
    );
  }

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf8f4] p-6">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-8 text-center shadow">
          Loading tagging page...
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-[#faf8f4] p-6">
        <div className="mx-auto max-w-6xl rounded-xl bg-white p-8 text-center shadow">
          Match not found.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f4] px-4 py-6 text-[#1c1817]">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c8102e]">
                Langsning FC
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                Live Match Tagging
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                {match.competition} • {match.season}
              </p>
            </div>

            <div className="text-right">
              <div
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  match.status === "live"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {match.status || "Scheduled"}
              </div>

              <div className="mt-2 text-sm text-gray-500">
                Match #{match.id}
              </div>
            </div>

          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

            <div className="text-center">
              <div className="font-bold">
                {match.home_team?.name}
              </div>
            </div>

            <div className="rounded-xl bg-[#1c1817] px-5 py-3 text-xl font-bold text-white">
              {match.home_score ?? 0}
              <span className="mx-2">-</span>
              {match.away_score ?? 0}
            </div>

            <div className="text-center">
              <div className="font-bold">
                {match.away_team?.name}
              </div>
            </div>

          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            {formatDate(match.date)}
            {match.venue
              ? ` • ${match.venue}`
              : ""}
          </div>

        </div>

        {/* STATUS */}

        <div className="mb-5 grid gap-3 sm:grid-cols-3">

          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-xs font-bold uppercase text-gray-500">
              Connection
            </div>

            <div
              className={`mt-1 font-bold ${
                online
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {online
                ? "ONLINE"
                : "OFFLINE"}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-xs font-bold uppercase text-gray-500">
              Local Events
            </div>

            <div className="mt-1 text-xl font-bold">
              {events.length}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-xs font-bold uppercase text-gray-500">
              Sync
            </div>

            <div className="mt-1 font-bold">
              {syncing
                ? "SYNCING..."
                : events.filter(
                    (event) => !event.synced
                  ).length > 0
                ? `${
                    events.filter(
                      (event) => !event.synced
                    ).length
                  } PENDING`
                : "ALL SYNCED"}
            </div>
          </div>

        </div>

        {/* CLOCK */}

        <div className="mb-5 rounded-xl bg-[#1c1817] p-6 text-center text-white shadow">

          <div className="text-xs font-bold uppercase tracking-[0.25em] text-gray-300">
            Match Clock
          </div>

          <div className="my-2 text-5xl font-black tabular-nums">
            {formatClock(seconds)}
          </div>

          <div className="flex justify-center gap-2">

            <button
              onClick={() =>
                setRunning((value) => !value)
              }
              className="rounded-lg bg-white px-5 py-3 font-bold text-black"
            >
              {running ? "PAUSE" : "START"}
            </button>

            <button
              onClick={() => {
                setRunning(false);
                setSeconds(0);
              }}
              className="rounded-lg border border-white/30 px-5 py-3 font-bold"
            >
              RESET
            </button>

          </div>

        </div>

        {/* VOICE PLACEHOLDER */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <h2 className="text-xl font-bold">
            🎙️ Voice Match Logger
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Voice logger placeholder. Functionality will be
            rebuilt later.
          </p>

        </div>

        {/* TAGGING */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-2xl font-bold">
                Live Event Clicker
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Events are loaded from Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2">

              <span className="text-sm font-semibold">
                Keyboard:
              </span>

              <select
                value={operator}
                onChange={(event) =>
                  setOperator(
                    event.target.value as
                      | "Both"
                      | "Home"
                      | "Away"
                  )
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="Both">
                  Both
                </option>
                <option value="Home">
                  Home
                </option>
                <option value="Away">
                  Away
                </option>
              </select>

            </div>

          </div>

          {visibleConfigs.length === 0 ? (
            <div className="rounded-lg bg-gray-100 p-6 text-center text-gray-500">
              No events are enabled for this match.
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">

              {/* HOME */}

              <div>

                <h3 className="mb-3 text-lg font-bold">
                  {match.home_team?.name}
                </h3>

                <div className="grid grid-cols-2 gap-2">

                  {homeButtons.map((config) => (
                    <button
                      key={config.id}
                      onClick={() =>
                        recordEvent(config)
                      }
                      className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left font-bold transition hover:bg-gray-100 active:scale-95"
                    >
                      <div className="flex items-center justify-between gap-2">

                        <span>
                          {config.label}
                        </span>

                        {config.keyboard_key && (
                          <span className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                            {config.keyboard_key.toUpperCase()}
                          </span>
                        )}

                      </div>
                    </button>
                  ))}

                </div>

              </div>

              {/* AWAY */}

              <div>

                <h3 className="mb-3 text-lg font-bold">
                  {match.away_team?.name}
                </h3>

                <div className="grid grid-cols-2 gap-2">

                  {awayButtons.map((config) => (
                    <button
                      key={config.id}
                      onClick={() =>
                        recordEvent(config)
                      }
                      className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left font-bold transition hover:bg-gray-100 active:scale-95"
                    >
                      <div className="flex items-center justify-between gap-2">

                        <span>
                          {config.label}
                        </span>

                        {config.keyboard_key && (
                          <span className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                            {config.keyboard_key.toUpperCase()}
                          </span>
                        )}

                      </div>
                    </button>
                  ))}

                </div>

              </div>

            </div>
          )}

        </div>

        {/* CONTROLS */}

        <div className="mb-5 flex flex-wrap gap-2">

          <button
            onClick={undoLastEvent}
            disabled={!events.length}
            className="rounded-lg bg-gray-800 px-5 py-3 font-bold text-white disabled:opacity-40"
          >
            ↩ UNDO
          </button>

          <button
            onClick={syncEvents}
            disabled={
              syncing ||
              !online ||
              !events.some(
                (event) => !event.synced
              )
            }
            className="rounded-lg bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-40"
          >
            🔄 SYNC
          </button>

          <button
            onClick={() =>
              setShowSettings(
                (value) => !value
              )
            }
            className="rounded-lg bg-blue-700 px-5 py-3 font-bold text-white"
          >
            ⚙ SETTINGS
          </button>

        </div>

        {message && (
          <div className="mb-5 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">
            {message}
          </div>
        )}

        {/* SETTINGS */}

        {showSettings && (
          <div className="mb-5 rounded-xl bg-white p-5 shadow">

            <div className="mb-5">
              <h2 className="text-2xl font-bold">
                Tagging Settings
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Disable an event or remove its keyboard key.
                Changes are saved directly to Supabase.
              </p>
            </div>

            <div className="space-y-3">

              {configs.map((config) => (

                <div
                  key={config.id}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto_auto_auto]"
                >

                  <div>

                    <div className="font-bold">
                      {config.team?.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {config.label}
                    </div>

                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(event) =>
                        updateConfig(
                          config,
                          {
                            enabled:
                              event.target.checked,
                          }
                        )
                      }
                    />
                    Enabled
                  </label>

                  <input
                    value={
                      config.keyboard_key ?? ""
                    }
                    maxLength={1}
                    placeholder="—"
                    onChange={(event) =>
                      updateConfig(
                        config,
                        {
                          keyboard_key:
                            event.target.value
                              .trim()
                              .slice(0, 1) || null,
                        }
                      )
                    }
                    className="w-16 rounded-md border px-3 py-2 text-center font-bold"
                  />

                  <span className="self-center text-xs text-gray-400">
                    key
                  </span>

                </div>

              ))}

            </div>

          </div>
        )}

        {/* EVENTS */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-4 text-2xl font-bold">
            Tagged Events
          </h2>

          {!events.length ? (
            <p className="text-sm text-gray-500">
              No events tagged yet.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">

              <div className="space-y-2">

                {[...events]
                  .reverse()
                  .map((event) => (

                    <div
                      key={event.local_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >

                      <div>

                        <span className="mr-3 font-mono font-bold">
                          {formatClock(
                            event.match_time
                          )}
                        </span>

                        <span className="font-bold">
                          {event.team}
                        </span>

                        <span className="mx-2">
                          —
                        </span>

                        <span>
                          {event.event_type}
                        </span>

                      </div>

                      <span
                        className={`text-xs font-bold ${
                          event.synced
                            ? "text-green-600"
                            : "text-orange-600"
                        }`}
                      >
                        {event.synced
                          ? "SYNCED"
                          : "LOCAL"}
                      </span>

                    </div>

                  ))}

              </div>

            </div>
          )}

        </div>

        {/* MANUAL PASS / SHOT ENTRY */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-2 text-2xl font-bold">
            Manual Pass & Shot Statistics
          </h2>

          <p className="mb-5 text-sm text-gray-500">
            Enter the numbers manually after reviewing the match.
          </p>

          <div className="grid gap-6 md:grid-cols-2">

            {/* HOME */}

            <div className="rounded-xl border p-4">

              <h3 className="mb-4 text-lg font-bold">
                {match?.home_team?.name || "Home"}
              </h3>

              <div className="space-y-3">

                {[
                  ["passCompleted", "Pass completed"],
                  ["passMissed", "Pass missed"],
                  ["shotsOnTarget", "Shots on target"],
                  ["shotsMissed", "Shots missed"],
                  ["shotsInsideBox", "Shots inside box"],
                  ["shotsOutsideBox", "Shots outside box"],
                ].map(([key, label]) => (

                  <div
                    key={key}
                    className="flex items-center justify-between gap-4"
                  >

                    <label className="font-semibold">
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={
                        manualStats.home[
                          key as keyof typeof manualStats.home
                        ]
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        setManualStats((current) => ({
                          ...current,
                          home: {
                            ...current.home,
                            [key]: value,
                          },
                        }));
                      }}
                      onBlur={(e) => {
                        if (match?.home_team) {
                          saveManualStat(
                            match.home_team.id,
                            key,
                            e.target.value
                          );
                        }
                      }}
                      className="w-24 rounded-lg border px-3 py-2 text-center font-bold"
                    />

                  </div>

                ))}

              </div>

            </div>

            {/* AWAY */}

            <div className="rounded-xl border p-4">

              <h3 className="mb-4 text-lg font-bold">
                {match?.away_team?.name || "Away"}
              </h3>

              <div className="space-y-3">

                {[
                  ["passCompleted", "Pass completed"],
                  ["passMissed", "Pass missed"],
                  ["shotsOnTarget", "Shots on target"],
                  ["shotsMissed", "Shots missed"],
                  ["shotsInsideBox", "Shots inside box"],
                  ["shotsOutsideBox", "Shots outside box"],
                ].map(([key, label]) => (

                  <div
                    key={key}
                    className="flex items-center justify-between gap-4"
                  >

                    <label className="font-semibold">
                      {label}
                    </label>

                    <input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={
                        manualStats.away[
                          key as keyof typeof manualStats.away
                        ]
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        setManualStats((current) => ({
                          ...current,
                          away: {
                            ...current.away,
                            [key]: value,
                          },
                        }));
                      }}
                      onBlur={(e) => {
                        if (match?.away_team) {
                          saveManualStat(
                            match.away_team.id,
                            key,
                            e.target.value
                          );
                        }
                      }}
                      className="w-24 rounded-lg border px-3 py-2 text-center font-bold"
                    />

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

        {/* LIVE STATISTICS */}

        <div className="mb-5 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-5 text-2xl font-bold">
            Live Statistics
          </h2>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[600px] border-collapse text-center">

              <thead>
                <tr className="border-b-2">

                  <th className="p-3 text-left">
                    Statistic
                  </th>

                  <th className="p-3">
                    {match?.home_team?.short_name ||
                      match?.home_team?.name ||
                      "Home"}
                  </th>

                  <th className="p-3">
                    {match?.away_team?.short_name ||
                      match?.away_team?.name ||
                      "Away"}
                  </th>

                </tr>
              </thead>

              <tbody>

                {/* PASSING */}

                <tr className="border-b bg-gray-50">
                  <td
                    colSpan={3}
                    className="p-2 text-left text-sm font-bold uppercase"
                  >
                    Passing
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Pass completed
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.passCompleted || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.passCompleted || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Pass missed
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.passMissed || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.passMissed || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Pass attempts
                  </td>
                  <td className="p-3 font-bold">
                    {(Number(manualStats.home.passCompleted) || 0) +
                      (Number(manualStats.home.passMissed) || 0)}
                  </td>
                  <td className="p-3 font-bold">
                    {(Number(manualStats.away.passCompleted) || 0) +
                      (Number(manualStats.away.passMissed) || 0)}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Pass accuracy
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const completed =
                        Number(manualStats.home.passCompleted) || 0;
                      const missed =
                        Number(manualStats.home.passMissed) || 0;
                      const attempts = completed + missed;

                      return attempts
                        ? `${Math.round((completed / attempts) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const completed =
                        Number(manualStats.away.passCompleted) || 0;
                      const missed =
                        Number(manualStats.away.passMissed) || 0;
                      const attempts = completed + missed;

                      return attempts
                        ? `${Math.round((completed / attempts) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Possession (pass based)
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const home =
                        Number(manualStats.home.passCompleted) || 0;
                      const away =
                        Number(manualStats.away.passCompleted) || 0;
                      const total = home + away;

                      return total
                        ? `${Math.round((home / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const home =
                        Number(manualStats.home.passCompleted) || 0;
                      const away =
                        Number(manualStats.away.passCompleted) || 0;
                      const total = home + away;

                      return total
                        ? `${Math.round((away / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                {/* SHOOTING */}

                <tr className="border-b bg-gray-50">
                  <td
                    colSpan={3}
                    className="p-2 text-left text-sm font-bold uppercase"
                  >
                    Shooting
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots
                  </td>
                  <td className="p-3 font-bold">
                    {(Number(manualStats.home.shotsOnTarget) || 0) +
                      (Number(manualStats.home.shotsMissed) || 0)}
                  </td>
                  <td className="p-3 font-bold">
                    {(Number(manualStats.away.shotsOnTarget) || 0) +
                      (Number(manualStats.away.shotsMissed) || 0)}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots on target
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.shotsOnTarget || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.shotsOnTarget || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots missed
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.shotsMissed || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.shotsMissed || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shot accuracy
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const onTarget =
                        Number(manualStats.home.shotsOnTarget) || 0;
                      const missed =
                        Number(manualStats.home.shotsMissed) || 0;
                      const total = onTarget + missed;

                      return total
                        ? `${Math.round((onTarget / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const onTarget =
                        Number(manualStats.away.shotsOnTarget) || 0;
                      const missed =
                        Number(manualStats.away.shotsMissed) || 0;
                      const total = onTarget + missed;

                      return total
                        ? `${Math.round((onTarget / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    On-target shot %
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const onTarget =
                        Number(manualStats.home.shotsOnTarget) || 0;
                      const missed =
                        Number(manualStats.home.shotsMissed) || 0;
                      const total = onTarget + missed;

                      return total
                        ? `${Math.round((onTarget / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const onTarget =
                        Number(manualStats.away.shotsOnTarget) || 0;
                      const missed =
                        Number(manualStats.away.shotsMissed) || 0;
                      const total = onTarget + missed;

                      return total
                        ? `${Math.round((onTarget / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots inside box
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.shotsInsideBox || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.shotsInsideBox || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots outside box
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.home.shotsOutsideBox || "—"}
                  </td>
                  <td className="p-3 font-bold">
                    {manualStats.away.shotsOutsideBox || "—"}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots inside box %
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const inside =
                        Number(manualStats.home.shotsInsideBox) || 0;
                      const total =
                        (Number(manualStats.home.shotsOnTarget) || 0) +
                        (Number(manualStats.home.shotsMissed) || 0);

                      return total
                        ? `${Math.round((inside / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const inside =
                        Number(manualStats.away.shotsInsideBox) || 0;
                      const total =
                        (Number(manualStats.away.shotsOnTarget) || 0) +
                        (Number(manualStats.away.shotsMissed) || 0);

                      return total
                        ? `${Math.round((inside / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                <tr className="border-b">
                  <td className="p-3 text-left font-semibold">
                    Shots outside box %
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const outside =
                        Number(manualStats.home.shotsOutsideBox) || 0;
                      const total =
                        (Number(manualStats.home.shotsOnTarget) || 0) +
                        (Number(manualStats.home.shotsMissed) || 0);

                      return total
                        ? `${Math.round((outside / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                  <td className="p-3 font-bold">
                    {(() => {
                      const outside =
                        Number(manualStats.away.shotsOutsideBox) || 0;
                      const total =
                        (Number(manualStats.away.shotsOnTarget) || 0) +
                        (Number(manualStats.away.shotsMissed) || 0);

                      return total
                        ? `${Math.round((outside / total) * 100)}%`
                        : "—";
                    })()}
                  </td>
                </tr>

                {/* ENABLED EVENT STATISTICS */}

                {Array.from(
                  new Map(
                    configs
                      .filter(
                        (config) =>
                          config.enabled &&
                          config.event_type?.code &&
                          ![
                            "PASS_COMPLETED",
                            "PASS_MISSED",
                            "SHOT_ON_TARGET",
                            "SHOT_MISSED",
                          ].includes(config.event_type.code)
                      )
                      .map((config) => [
                        config.event_type!.code,
                        config.event_type!.name || config.label,
                      ])
                  ).entries()
                ).map(([code, label]) => (

                  <tr
                    key={code}
                    className="border-b"
                  >

                    <td className="p-3 text-left font-semibold">
                      {label}
                    </td>

                    <td className="p-3 font-bold">
                      {liveCount(homeTeamId, code)}
                    </td>

                    <td className="p-3 font-bold">
                      {liveCount(awayTeamId, code)}
                    </td>

                  </tr>

                ))}

                {/* DERIVED EVENT STATISTICS */}

                {configs.some(
                  (config) =>
                    config.enabled &&
                    config.event_type?.code === "GOAL"
                ) && (
                  <tr className="border-b">
                    <td className="p-3 text-left font-semibold">
                      Goal conversion
                    </td>

                    <td className="p-3 font-bold">
                      {(() => {
                        const goals =
                          liveCount(homeTeamId, "GOAL");
                        const shots =
                          (Number(manualStats.home.shotsOnTarget) || 0) +
                          (Number(manualStats.home.shotsMissed) || 0);

                        return shots
                          ? `${Math.round((goals / shots) * 100)}%`
                          : "—";
                      })()}
                    </td>

                    <td className="p-3 font-bold">
                      {(() => {
                        const goals =
                          liveCount(awayTeamId, "GOAL");
                        const shots =
                          (Number(manualStats.away.shotsOnTarget) || 0) +
                          (Number(manualStats.away.shotsMissed) || 0);

                        return shots
                          ? `${Math.round((goals / shots) * 100)}%`
                          : "—";
                      })()}
                    </td>
                  </tr>
                )}

                {configs.some(
                  (config) =>
                    config.enabled &&
                    config.event_type?.code === "GK_SAVE"
                ) && (
                  <tr className="border-b">
                    <td className="p-3 text-left font-semibold">
                      Save %
                    </td>

                    <td className="p-3 font-bold">
                      {(() => {
                        const saves =
                          liveCount(homeTeamId, "GK_SAVE");
                        const opponentGoals =
                          liveCount(awayTeamId, "GOAL");

                        const total =
                          saves + opponentGoals;

                        return total
                          ? `${Math.round((saves / total) * 100)}%`
                          : "—";
                      })()}
                    </td>

                    <td className="p-3 font-bold">
                      {(() => {
                        const saves =
                          liveCount(awayTeamId, "GK_SAVE");
                        const opponentGoals =
                          liveCount(homeTeamId, "GOAL");

                        const total =
                          saves + opponentGoals;

                        return total
                          ? `${Math.round((saves / total) * 100)}%`
                          : "—";
                      })()}
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </div>

        <div className="pb-10 text-center text-xs text-gray-400">
          Live tagging writes only to match_events_test.
          match_stats remains separate.
        </div>

      </div>
    </main>
  );
}
