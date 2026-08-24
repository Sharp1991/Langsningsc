"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Team = "Langsning" | "Opponent";

type EventType =
  | "PASS_COMPLETED"
  | "PASS_MISSED"
  | "CLEARANCE"
  | "INTERCEPTION"
  | "SHOT_ON_TARGET"
  | "SHOT_MISSED"
  | "GOAL"
  | "PENALTY"
  | "CORNER"
  | "OFFSIDE"
  | "FOUL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "INJURY"
  | "GK_SAVE";

type MatchEvent = {
  id: number;
  match_id: number;
  match_time: number;
  team: Team;
  event_type: EventType;
  player_name?: string;
  created_at?: string;
  local_id?: string;
  synced?: boolean;
};

type KeyMapping = {
  team: Team;
  event: EventType;
};

const DEFAULT_KEY_MAP: Record<string, KeyMapping> = {
  f: { team: "Langsning", event: "PASS_COMPLETED" },
  c: { team: "Langsning", event: "PASS_MISSED" },
  r: { team: "Langsning", event: "SHOT_ON_TARGET" },
  e: { team: "Langsning", event: "SHOT_MISSED" },
  d: { team: "Langsning", event: "CLEARANCE" },
  s: { team: "Langsning", event: "INTERCEPTION" },
  w: { team: "Langsning", event: "GK_SAVE" },

  j: { team: "Opponent", event: "PASS_COMPLETED" },
  m: { team: "Opponent", event: "PASS_MISSED" },
  u: { team: "Opponent", event: "SHOT_ON_TARGET" },
  i: { team: "Opponent", event: "SHOT_MISSED" },
  k: { team: "Opponent", event: "CLEARANCE" },
  l: { team: "Opponent", event: "INTERCEPTION" },
  o: { team: "Opponent", event: "GK_SAVE" },
};

const EVENT_LABELS: Record<EventType, string> = {
  PASS_COMPLETED: "Pass completed",
  PASS_MISSED: "Pass missed",
  CLEARANCE: "Clearance",
  INTERCEPTION: "Interception",
  SHOT_ON_TARGET: "Shot on target",
  SHOT_MISSED: "Shot missed",
  GOAL: "Goal",
  PENALTY: "Penalty",
  CORNER: "Corner",
  OFFSIDE: "Offside",
  FOUL: "Foul",
  YELLOW_CARD: "Yellow card",
  RED_CARD: "Red card",
  SUBSTITUTION: "Substitution",
  INJURY: "Injury",
  GK_SAVE: "Goalkeeper save",
};

const SPECIAL_PLAYER_EVENTS: EventType[] = [
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
  "INJURY",
];

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function storageKey(matchId: number) {
  return `langsning-live-events-${matchId}`;
}

function keyMapStorageKey(matchId: number) {
  return `langsning-key-map-${matchId}`;
}

export default function LiveMatchLogger() {
  const params = useParams();
  const matchId = Number(params.id);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<MatchEvent | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(true);

  const [editTime, setEditTime] = useState(false);
  const [minuteInput, setMinuteInput] = useState("0");
  const [secondInput, setSecondInput] = useState("0");

  const [showSettings, setShowSettings] = useState(false);
  const [keyMap, setKeyMap] =
    useState<Record<string, KeyMapping>>(DEFAULT_KEY_MAP);

  const [waitingForKey, setWaitingForKey] = useState<{
    oldKey: string;
    team: Team;
    event: EventType;
  } | null>(null);

  const [operator, setOperator] =
    useState<"Both" | Team>("Both");

  // -----------------------------------------
  // ONLINE STATUS
  // -----------------------------------------

  useEffect(() => {
    setOnline(navigator.onLine);

    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  // -----------------------------------------
  // LOAD KEY SETTINGS
  // -----------------------------------------

  useEffect(() => {
    if (!matchId) return;

    const saved = localStorage.getItem(keyMapStorageKey(matchId));

    if (saved) {
      try {
        setKeyMap(JSON.parse(saved));
      } catch {
        setKeyMap(DEFAULT_KEY_MAP);
      }
    }
  }, [matchId]);

  // -----------------------------------------
  // SAVE KEY SETTINGS
  // -----------------------------------------

  useEffect(() => {
    if (!matchId) return;

    localStorage.setItem(
      keyMapStorageKey(matchId),
      JSON.stringify(keyMap)
    );
  }, [keyMap, matchId]);

  // -----------------------------------------
  // LOAD LOCAL EVENTS
  // -----------------------------------------

  useEffect(() => {
    if (!matchId) return;

    const saved = localStorage.getItem(storageKey(matchId));

    if (!saved) return;

    try {
      const localEvents: MatchEvent[] = JSON.parse(saved);
      setEvents(localEvents);
      setLastEvent(localEvents[0] || null);
    } catch {
      console.error("Could not load local events");
    }
  }, [matchId]);

  // -----------------------------------------
  // SAVE LOCAL EVENTS
  // -----------------------------------------

  const saveLocalEvents = useCallback(
    (newEvents: MatchEvent[]) => {
      if (!matchId) return;

      localStorage.setItem(
        storageKey(matchId),
        JSON.stringify(newEvents)
      );
    },
    [matchId]
  );

  // -----------------------------------------
  // MATCH CLOCK
  // -----------------------------------------

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  // -----------------------------------------
  // LOAD SERVER EVENTS
  // -----------------------------------------

  useEffect(() => {
    async function loadEvents() {
      if (!matchId) return;

      const { data, error } = await supabase
        .from("match_events_test")
        .select("*")
        .eq("match_id", matchId)
        .order("id", { ascending: false });

      if (error) {
        console.error("Could not load server events:", error);
        return;
      }

      if (!data) return;

      const serverEvents: MatchEvent[] = data.map((event) => ({
        ...event,
        synced: true,
      }));

      setEvents((current) => {
        const localPending = current.filter(
          (event) => !event.synced
        );

        const merged = [
          ...localPending,
          ...serverEvents,
        ];

        const unique = Array.from(
          new Map(
            merged.map((event) => [
              event.id > 0
                ? `server-${event.id}`
                : `local-${event.local_id}`,
              event,
            ])
          ).values()
        );

        unique.sort(
          (a, b) => b.match_time - a.match_time
        );

        saveLocalEvents(unique);

        setLastEvent(unique[0] || null);

        return unique;
      });
    }

    loadEvents();
  }, [matchId, saveLocalEvents]);

  // -----------------------------------------
  // SYNC EVENTS
  // -----------------------------------------

  const syncEvents = useCallback(async () => {
    if (!matchId || syncing || !navigator.onLine) return;

    const pending = events.filter(
      (event) => !event.synced
    );

    if (pending.length === 0) return;

    setSyncing(true);

    const successfullySynced: string[] = [];

    for (const event of pending) {
      const { data, error } = await supabase
        .from("match_events_test")
        .insert({
          match_id: event.match_id,
          match_time: event.match_time,
          team: event.team,
          event_type: event.event_type,
        })
        .select()
        .single();

      if (error) {
        console.error("Sync failed:", error);
        continue;
      }

      setEvents((current) =>
        current.map((item) =>
          item.local_id === event.local_id
            ? {
                ...data,
                synced: true,
              }
            : item
        )
      );

      successfullySynced.push(event.local_id || "");
    }

    setEvents((current) => {
      const updated = current.map((event) => {
        if (
          event.local_id &&
          successfullySynced.includes(event.local_id)
        ) {
          return {
            ...event,
            synced: true,
          };
        }

        return event;
      });

      saveLocalEvents(updated);

      return updated;
    });

    setSyncing(false);
  }, [events, matchId, saveLocalEvents, syncing]);

  // -----------------------------------------
  // AUTOMATIC SYNC
  // -----------------------------------------

  useEffect(() => {
    if (!online) return;

    syncEvents();
  }, [online, syncEvents]);

  // -----------------------------------------
  // RECORD EVENT
  // -----------------------------------------

  const recordEvent = useCallback(
    async (
      team: Team,
      event: EventType,
      playerName?: string
    ) => {
      if (!matchId) return;

      if (
        operator !== "Both" &&
        operator !== team
      ) {
        return;
      }

      let selectedPlayer = playerName;

      if (
        !selectedPlayer &&
        SPECIAL_PLAYER_EVENTS.includes(event)
      ) {
        const answer = window.prompt(
          `${EVENT_LABELS[event]} - enter player name`
        );

        if (answer === null) return;

        selectedPlayer = answer.trim();

        if (!selectedPlayer) {
          alert("Player name is required.");
          return;
        }
      }

      const localEvent: MatchEvent = {
        id: -Date.now(),
        local_id: makeLocalId(),
        match_id: matchId,
        match_time: seconds,
        team,
        event_type: event,
        player_name: selectedPlayer,
        synced: false,
      };

      const updated = [localEvent, ...events];

      setEvents(updated);
      setLastEvent(localEvent);
      saveLocalEvents(updated);

      setSaving(true);

      setTimeout(() => {
        setSaving(false);
      }, 150);

      if (navigator.onLine) {
        setTimeout(() => {
          syncEvents();
        }, 100);
      }
    },
    [
      matchId,
      operator,
      seconds,
      events,
      saveLocalEvents,
      syncEvents,
    ]
  );

  // -----------------------------------------
  // KEYBOARD
  // -----------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Backspace while typing must remain normal
      if (typing) return;

      // Settings key assignment
      if (waitingForKey) {
        e.preventDefault();

        const newKey = e.key.toLowerCase();

        if (
          newKey === "backspace" ||
          newKey === "escape"
        ) {
          setWaitingForKey(null);
          return;
        }

        if (newKey.length !== 1) {
          alert("Please press a normal keyboard key.");
          return;
        }

        const duplicate = Object.entries(keyMap).find(
          ([key, mapping]) =>
            key === newKey &&
            !(
              mapping.team === waitingForKey.team &&
              mapping.event === waitingForKey.event
            )
        );

        if (duplicate) {
          alert(
            `"${newKey.toUpperCase()}" is already assigned to ${EVENT_LABELS[duplicate[1].event]}.`
          );
          return;
        }

        const updated = { ...keyMap };

        delete updated[waitingForKey.oldKey];

        updated[newKey] = {
          team: waitingForKey.team,
          event: waitingForKey.event,
        };

        setKeyMap(updated);
        setWaitingForKey(null);

        return;
      }

      if (!running) {
        // Backspace still works when clock is paused
        if (e.key === "Backspace") {
          e.preventDefault();
          undoLast();
        }

        return;
      }

      // UNIVERSAL UNDO
      if (e.key === "Backspace") {
        e.preventDefault();
        undoLast();
        return;
      }

      const key = e.key.toLowerCase();
      const mapping = keyMap[key];

      if (!mapping) return;

      e.preventDefault();

      recordEvent(
        mapping.team,
        mapping.event
      );
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    running,
    keyMap,
    recordEvent,
    waitingForKey,
  ]);

  // -----------------------------------------
  // TIME
  // -----------------------------------------

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  function openTimeEditor() {
    setMinuteInput(
      String(Math.floor(seconds / 60))
    );

    setSecondInput(
      String(seconds % 60)
    );

    setEditTime(true);
  }

  function saveManualTime() {
    const minute = Number(minuteInput);
    const second = Number(secondInput);

    if (
      !Number.isFinite(minute) ||
      !Number.isFinite(second) ||
      minute < 0 ||
      second < 0 ||
      second > 59
    ) {
      alert("Enter a valid time.");
      return;
    }

    setSeconds(
      minute * 60 + second
    );

    setEditTime(false);
  }

  function changeMinute(amount: number) {
    setSeconds((current) =>
      Math.max(
        0,
        current + amount * 60
      )
    );
  }

  // -----------------------------------------
  // UNDO
  // -----------------------------------------

  async function undoLast() {
    if (events.length === 0) return;

    const event = events[0];

    // Local unsynced event
    if (!event.synced) {
      const updated = events.slice(1);

      setEvents(updated);
      setLastEvent(updated[0] || null);
      saveLocalEvents(updated);

      return;
    }

    // Already synced event
    const { error } = await supabase
      .from("match_events_test")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.error(error);
      alert("Could not undo event.");
      return;
    }

    const updated = events.slice(1);

    setEvents(updated);
    setLastEvent(updated[0] || null);
    saveLocalEvents(updated);
  }

  // -----------------------------------------
  // RESET CLOCK
  // -----------------------------------------

  function resetClock() {
    if (
      !confirm(
        "Reset the match clock? Existing events will NOT be deleted."
      )
    ) {
      return;
    }

    setRunning(false);
    setSeconds(0);
  }

  // -----------------------------------------
  // KEY SETTINGS
  // -----------------------------------------

  const mappingRows = useMemo(() => {
    return Object.entries(keyMap).sort(
      ([a], [b]) =>
        a.localeCompare(b)
    );
  }, [keyMap]);

  function startKeyChange(
    key: string,
    mapping: KeyMapping
  ) {
    setWaitingForKey({
      oldKey: key,
      team: mapping.team,
      event: mapping.event,
    });
  }

  function resetKeySettings() {
    if (
      !confirm(
        "Reset all keyboard mappings to default?"
      )
    ) {
      return;
    }

    setKeyMap(DEFAULT_KEY_MAP);
  }

  // -----------------------------------------
  // STATISTICS
  // -----------------------------------------

  function count(
    team: Team,
    event: EventType
  ) {
    return events.filter(
      (item) =>
        item.team === team &&
        item.event_type === event
    ).length;
  }

  function passAttempts(team: Team) {
    return (
      count(
        team,
        "PASS_COMPLETED"
      ) +
      count(
        team,
        "PASS_MISSED"
      )
    );
  }

  function passAccuracy(team: Team) {
    const attempts =
      passAttempts(team);

    if (attempts === 0)
      return "0.0";

    return (
      (count(
        team,
        "PASS_COMPLETED"
      ) /
        attempts) *
      100
    ).toFixed(1);
  }

  function shots(team: Team) {
    return (
      count(
        team,
        "SHOT_ON_TARGET"
      ) +
      count(
        team,
        "SHOT_MISSED"
      )
    );
  }

  function shotAccuracy(team: Team) {
    const total = shots(team);

    if (total === 0)
      return "0.0";

    return (
      (count(
        team,
        "SHOT_ON_TARGET"
      ) /
        total) *
      100
    ).toFixed(1);
  }

  const langsningGoals =
    count("Langsning", "GOAL");

  const opponentGoals =
    count("Opponent", "GOAL");

  const pendingCount =
    events.filter(
      (event) => !event.synced
    ).length;

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

          <div>
            <h1 className="text-3xl font-bold">
              Live Match Logger
            </h1>

            <p className="text-gray-600">
              Match ID: {matchId}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <div
              className={`rounded-lg px-4 py-2 font-bold ${
                online
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {online
                ? "● ONLINE"
                : "● OFFLINE"}
            </div>

            <button
              onClick={() =>
                setShowSettings(
                  !showSettings
                )
              }
              className="rounded-lg bg-gray-800 px-4 py-2 font-bold text-white"
            >
              ⚙ SETTINGS
            </button>

          </div>

        </div>

        {/* OPERATOR */}

        <div className="mb-5 rounded-xl bg-white p-4 shadow">

          <div className="flex flex-wrap items-center gap-3">

            <span className="font-bold">
              Operator:
            </span>

            {(
              [
                "Both",
                "Langsning",
                "Opponent",
              ] as const
            ).map((item) => (
              <button
                key={item}
                onClick={() =>
                  setOperator(item)
                }
                className={`rounded-lg px-4 py-2 font-bold ${
                  operator === item
                    ? "bg-black text-white"
                    : "bg-gray-200"
                }`}
              >
                {item}
              </button>
            ))}

          </div>

          <p className="mt-2 text-sm text-gray-500">
            In two-operator mode, select the team
            being recorded on this device.
          </p>

        </div>

        {/* KEYBOARD SETTINGS */}

        {showSettings && (
          <div className="mb-6 rounded-xl bg-white p-5 shadow">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

              <h2 className="text-2xl font-bold">
                Keyboard Settings
              </h2>

              <button
                onClick={resetKeySettings}
                className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
              >
                RESET KEYS
              </button>

            </div>

            {waitingForKey && (
              <div className="mb-4 rounded-lg bg-yellow-100 p-4 font-bold text-yellow-900">
                Press the new key for{" "}
                {waitingForKey.team} —{" "}
                {
                  EVENT_LABELS[
                    waitingForKey.event
                  ]
                }
                <br />
                Press Escape to cancel.
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-2">

              {mappingRows.map(
                ([key, mapping]) => (
                  <div
                    key={`${key}-${mapping.event}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >

                    <div>
                      <span className="font-bold">
                        {mapping.team}
                      </span>

                      <span className="mx-2">
                        —
                      </span>

                      <span>
                        {
                          EVENT_LABELS[
                            mapping.event
                          ]
                        }
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        startKeyChange(
                          key,
                          mapping
                        )
                      }
                      className="rounded-md bg-gray-800 px-3 py-2 font-bold text-white"
                    >
                      {key.toUpperCase()}
                      {"  "}
                      CHANGE
                    </button>

                  </div>
                )
              )}

            </div>

            <div className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
              <strong>Backspace:</strong>{" "}
              Undo the most recent event.
              <br />
              Backspace still works normally
              inside player-name fields.
            </div>

          </div>
        )}

        {/* SCORE + CLOCK */}

        <div className="rounded-xl bg-white p-6 text-center shadow">

          <div className="text-lg font-semibold">

            LANGSNING FC

            <span className="mx-4 text-4xl">
              {langsningGoals} -{" "}
              {opponentGoals}
            </span>

            OPPONENT

          </div>

          <div className="mt-5 text-7xl font-bold tracking-wider">
            {formatTime(seconds)}
          </div>

          {editTime ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">

              <input
                type="number"
                min="0"
                value={minuteInput}
                onChange={(e) =>
                  setMinuteInput(
                    e.target.value
                  )
                }
                className="w-24 rounded-lg border p-3 text-center text-xl"
                placeholder="Min"
              />

              <span className="p-3 text-xl font-bold">
                :
              </span>

              <input
                type="number"
                min="0"
                max="59"
                value={secondInput}
                onChange={(e) =>
                  setSecondInput(
                    e.target.value
                  )
                }
                className="w-24 rounded-lg border p-3 text-center text-xl"
                placeholder="Sec"
              />

              <button
                onClick={saveManualTime}
                className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white"
              >
                SAVE TIME
              </button>

              <button
                onClick={() =>
                  setEditTime(false)
                }
                className="rounded-lg bg-gray-500 px-5 py-3 font-bold text-white"
              >
                CANCEL
              </button>

            </div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-center gap-2">

              <button
                onClick={() =>
                  changeMinute(-1)
                }
                className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-white"
              >
                -1 MIN
              </button>

              <button
                onClick={openTimeEditor}
                className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white"
              >
                EDIT TIME
              </button>

              <button
                onClick={() =>
                  changeMinute(1)
                }
                className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-white"
              >
                +1 MIN
              </button>

            </div>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-3">

            <button
              onClick={() =>
                setRunning(true)
              }
              className="rounded-lg bg-green-600 px-6 py-3 font-bold text-white"
            >
              START
            </button>

            <button
              onClick={() =>
                setRunning(false)
              }
              className="rounded-lg bg-yellow-500 px-6 py-3 font-bold text-white"
            >
              PAUSE
            </button>

            <button
              onClick={resetClock}
              className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white"
            >
              RESET CLOCK
            </button>

          </div>

        </div>

        {/* SYNC STATUS */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <div className="flex flex-wrap items-center justify-between gap-3">

            <div>
              <h2 className="text-xl font-bold">
                Data Synchronization
              </h2>

              <p className="text-sm text-gray-600">
                {pendingCount} event
                {pendingCount !== 1
                  ? "s"
                  : ""}{" "}
                waiting to sync
              </p>
            </div>

            <button
              onClick={syncEvents}
              disabled={
                syncing ||
                pendingCount === 0 ||
                !online
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              {syncing
                ? "SYNCING..."
                : "SYNC NOW"}
            </button>

          </div>

        </div>

        {/* LIVE STATISTICS */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-5 text-2xl font-bold">
            Live Statistics
          </h2>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[650px] border-collapse text-center">

              <thead>
                <tr className="border-b-2">
                  <th className="p-3 text-left">
                    Statistic
                  </th>

                  <th className="p-3 text-green-700">
                    Langsning
                  </th>

                  <th className="p-3 text-blue-700">
                    Opponent
                  </th>
                </tr>
              </thead>

              <tbody>

                <StatRow
                  label="Pass attempts"
                  home={passAttempts(
                    "Langsning"
                  )}
                  away={passAttempts(
                    "Opponent"
                  )}
                />

                <StatRow
                  label="Pass completed"
                  home={count(
                    "Langsning",
                    "PASS_COMPLETED"
                  )}
                  away={count(
                    "Opponent",
                    "PASS_COMPLETED"
                  )}
                />

                <StatRow
                  label="Pass missed"
                  home={count(
                    "Langsning",
                    "PASS_MISSED"
                  )}
                  away={count(
                    "Opponent",
                    "PASS_MISSED"
                  )}
                />

                <StatRow
                  label="Pass accuracy"
                  home={`${passAccuracy(
                    "Langsning"
                  )}%`}
                  away={`${passAccuracy(
                    "Opponent"
                  )}%`}
                />

                <StatRow
                  label="Shots"
                  home={shots(
                    "Langsning"
                  )}
                  away={shots(
                    "Opponent"
                  )}
                />

                <StatRow
                  label="Shots on target"
                  home={count(
                    "Langsning",
                    "SHOT_ON_TARGET"
                  )}
                  away={count(
                    "Opponent",
                    "SHOT_ON_TARGET"
                  )}
                />

                <StatRow
                  label="Shots missed"
                  home={count(
                    "Langsning",
                    "SHOT_MISSED"
                  )}
                  away={count(
                    "Opponent",
                    "SHOT_MISSED"
                  )}
                />

                <StatRow
                  label="Shot accuracy"
                  home={`${shotAccuracy(
                    "Langsning"
                  )}%`}
                  away={`${shotAccuracy(
                    "Opponent"
                  )}%`}
                />

                <StatRow
                  label="Clearances"
                  home={count(
                    "Langsning",
                    "CLEARANCE"
                  )}
                  away={count(
                    "Opponent",
                    "CLEARANCE"
                  )}
                />

                <StatRow
                  label="Interceptions"
                  home={count(
                    "Langsning",
                    "INTERCEPTION"
                  )}
                  away={count(
                    "Opponent",
                    "INTERCEPTION"
                  )}
                />

                <StatRow
                  label="Goalkeeper saves"
                  home={count(
                    "Langsning",
                    "GK_SAVE"
                  )}
                  away={count(
                    "Opponent",
                    "GK_SAVE"
                  )}
                />

                <StatRow
                  label="Corners"
                  home={count(
                    "Langsning",
                    "CORNER"
                  )}
                  away={count(
                    "Opponent",
                    "CORNER"
                  )}
                />

                <StatRow
                  label="Offsides"
                  home={count(
                    "Langsning",
                    "OFFSIDE"
                  )}
                  away={count(
                    "Opponent",
                    "OFFSIDE"
                  )}
                />

                <StatRow
                  label="Fouls"
                  home={count(
                    "Langsning",
                    "FOUL"
                  )}
                  away={count(
                    "Opponent",
                    "FOUL"
                  )}
                />

                <StatRow
                  label="Yellow cards"
                  home={count(
                    "Langsning",
                    "YELLOW_CARD"
                  )}
                  away={count(
                    "Opponent",
                    "YELLOW_CARD"
                  )}
                />

                <StatRow
                  label="Red cards"
                  home={count(
                    "Langsning",
                    "RED_CARD"
                  )}
                  away={count(
                    "Opponent",
                    "RED_CARD"
                  )}
                />

                <StatRow
                  label="Substitutions"
                  home={count(
                    "Langsning",
                    "SUBSTITUTION"
                  )}
                  away={count(
                    "Opponent",
                    "SUBSTITUTION"
                  )}
                />

                <StatRow
                  label="Injuries"
                  home={count(
                    "Langsning",
                    "INJURY"
                  )}
                  away={count(
                    "Opponent",
                    "INJURY"
                  )}
                />

                <StatRow
                  label="Penalties"
                  home={count(
                    "Langsning",
                    "PENALTY"
                  )}
                  away={count(
                    "Opponent",
                    "PENALTY"
                  )}
                />

              </tbody>

            </table>

          </div>

        </div>

        {/* CORE EVENT CONTROLS */}

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <TeamPanel
            team="Langsning"
            color="green"
            recordEvent={recordEvent}
            keyMap={keyMap}
          />

          <TeamPanel
            team="Opponent"
            color="blue"
            recordEvent={recordEvent}
            keyMap={keyMap}
          />

        </div>

        {/* OTHER EVENTS */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-5 text-2xl font-bold">
            Other Match Events
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">

            {(
              [
                ["GOAL", "⚽ Goal"],
                ["PENALTY", "🥅 Penalty"],
                ["CORNER", "🚩 Corner"],
                ["OFFSIDE", "🚫 Offside"],
                ["FOUL", "⚠️ Foul"],
                [
                  "YELLOW_CARD",
                  "🟨 Yellow Card",
                ],
                [
                  "RED_CARD",
                  "🟥 Red Card",
                ],
                [
                  "SUBSTITUTION",
                  "🔄 Substitution",
                ],
                [
                  "INJURY",
                  "🩹 Injury",
                ],
              ] as [
                EventType,
                string
              ][]
            ).map(
              ([event, label]) => (
                <div
                  key={event}
                  className="grid grid-cols-2 gap-1"
                >

                  <button
                    onClick={() =>
                      recordEvent(
                        "Langsning",
                        event
                      )
                    }
                    className="rounded-lg bg-green-700 p-3 text-sm font-bold text-white"
                  >
                    L {label}
                  </button>

                  <button
                    onClick={() =>
                      recordEvent(
                        "Opponent",
                        event
                      )
                    }
                    className="rounded-lg bg-blue-700 p-3 text-sm font-bold text-white"
                  >
                    O {label}
                  </button>

                </div>
              )
            )}

          </div>

        </div>

        {/* LAST EVENT */}

        <div className="mt-6 rounded-xl bg-white p-5 text-center shadow">

          <div className="text-sm font-semibold uppercase text-gray-500">
            Last Event
          </div>

          {lastEvent ? (
            <div className="mt-2 text-2xl font-bold">

              {formatTime(
                lastEvent.match_time
              )}

              {" — "}

              {lastEvent.team}

              {" — "}

              {
                EVENT_LABELS[
                  lastEvent.event_type
                ]
              }

              {lastEvent.player_name && (
                <div className="text-lg text-gray-600">
                  Player:{" "}
                  {lastEvent.player_name}
                </div>
              )}

            </div>
          ) : (
            <div className="mt-2 text-gray-400">
              No events recorded
            </div>
          )}

          {saving && (
            <div className="mt-2 text-sm text-blue-600">
              Saved locally
            </div>
          )}

        </div>

        {/* TIMELINE */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <h2 className="text-2xl font-bold">
              Event Timeline
            </h2>

            <button
              onClick={undoLast}
              disabled={
                events.length === 0
              }
              className="rounded-lg bg-gray-800 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              ↩ UNDO LAST
            </button>

          </div>

          {events.length === 0 ? (
            <p className="text-gray-400">
              No events yet.
            </p>
          ) : (
            <div className="space-y-2">

              {events.map(
                (event, index) => (
                  <div
                    key={
                      event.local_id ||
                      event.id
                    }
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                  >

                    <span className="font-mono font-bold">
                      {formatTime(
                        event.match_time
                      )}
                    </span>

                    <span className="font-semibold">
                      {event.team}
                    </span>

                    <span>
                      {
                        EVENT_LABELS[
                          event.event_type
                        ]
                      }
                    </span>

                    {event.player_name && (
                      <span className="text-gray-600">
                        {event.player_name}
                      </span>
                    )}

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
                )
              )}

            </div>
          )}

        </div>

        {/* BOTTOM SYNC */}

        <div className="mt-6 mb-10 rounded-xl bg-gray-900 p-5 text-center text-white">

          <div className="text-lg font-bold">
            {pendingCount === 0
              ? "✓ All events synchronized"
              : `${pendingCount} event${
                  pendingCount !== 1
                    ? "s"
                    : ""
                } waiting to sync`}
          </div>

          <button
            onClick={syncEvents}
            disabled={
              syncing ||
              pendingCount === 0 ||
              !online
            }
            className="mt-3 rounded-lg bg-white px-6 py-3 font-bold text-black disabled:opacity-40"
          >
            {syncing
              ? "SYNCHRONIZING..."
              : "SYNC NOW"}
          </button>

        </div>

      </div>
    </main>
  );
}

// -----------------------------------------
// TEAM PANEL
// -----------------------------------------

function TeamPanel({
  team,
  color,
  recordEvent,
  keyMap,
}: {
  team: Team;
  color: "green" | "blue";
  recordEvent: (
    team: Team,
    event: EventType
  ) => void;
  keyMap: Record<string, KeyMapping>;
}) {
  const teamMappings = Object.entries(
    keyMap
  )
    .filter(
      ([, mapping]) =>
        mapping.team === team
    )
    .sort(([a], [b]) =>
      a.localeCompare(b)
    );

  return (
    <div className="rounded-xl bg-white p-5 shadow">

      <h2
        className={`mb-4 text-2xl font-bold ${
          color === "green"
            ? "text-green-700"
            : "text-blue-700"
        }`}
      >
        {team}
      </h2>

      <div className="grid grid-cols-2 gap-3">

        {teamMappings.map(
          ([key, mapping]) => (
            <button
              key={`${key}-${mapping.event}`}
              onClick={() =>
                recordEvent(
                  team,
                  mapping.event
                )
              }
              className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-left transition hover:bg-gray-100 active:scale-95"
            >

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-900 font-bold text-white">
                {key.toUpperCase()}
              </span>

              <span className="font-semibold">
                {
                  EVENT_LABELS[
                    mapping.event
                  ]
                }
              </span>

            </button>
          )
        )}

      </div>

      <p className="mt-4 text-sm text-gray-500">
        Keyboard shortcuts are also active
        while the match is running.
      </p>

    </div>
  );
}

// -----------------------------------------
// STAT ROW
// -----------------------------------------

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: string | number;
  away: string | number;
}) {
  return (
    <tr className="border-b">

      <td className="p-3 text-left font-semibold">
        {label}
      </td>

      <td className="p-3 font-bold">
        {home}
      </td>

      <td className="p-3 font-bold">
        {away}
      </td>

    </tr>
  );
}
