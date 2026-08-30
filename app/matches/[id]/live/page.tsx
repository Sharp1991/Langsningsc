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
  const [stats, setStats] = useState<MatchStat[]>([]);

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

    setMatch(data as MatchInfo);
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

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase
      .from("match_stats")
      .select(
        "id, stat_name, home_value, away_value, locked"
      )
      .eq("match_id", matchId)
      .order("id");

    if (error) {
      console.error(error);
      return;
    }

    setStats((data || []) as MatchStat[]);
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
        loadStats(),
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
    loadStats,
    loadLocalEvents,
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

  const lockedStats = stats.filter(
    (stat) => stat.locked
  );

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

        <div className="pb-10 text-center text-xs text-gray-400">
          Live tagging writes only to match_events_test.
          match_stats remains separate.
        </div>

      </div>
    </main>
  );
}
