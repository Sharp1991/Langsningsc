"use client";

import { useCallback, useEffect, useState } from "react";
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
  | "INJURY";

type MatchEvent = {
  id: number;
  match_id: number;
  match_time: number;
  team: Team;
  event_type: EventType;
  created_at?: string;
};

const KEY_MAP: Record<string, { team: Team; event: EventType }> = {
  f: { team: "Langsning", event: "PASS_COMPLETED" },
  n: { team: "Langsning", event: "PASS_MISSED" },
  d: { team: "Langsning", event: "CLEARANCE" },
  s: { team: "Langsning", event: "INTERCEPTION" },
  a: { team: "Langsning", event: "SHOT_ON_TARGET" },
  v: { team: "Langsning", event: "SHOT_MISSED" },

  j: { team: "Opponent", event: "PASS_COMPLETED" },
  k: { team: "Opponent", event: "PASS_MISSED" },
  l: { team: "Opponent", event: "CLEARANCE" },
  ";": { team: "Opponent", event: "INTERCEPTION" },
  p: { team: "Opponent", event: "SHOT_ON_TARGET" },
  u: { team: "Opponent", event: "SHOT_MISSED" },
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
};

export default function LiveMatchLogger() {
  const params = useParams();
  const matchId = Number(params.id);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<MatchEvent | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTime, setEditTime] = useState(false);
  const [minuteInput, setMinuteInput] = useState("0");
  const [secondInput, setSecondInput] = useState("0");

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
  // RECORD EVENT
  // -----------------------------------------

  const recordEvent = useCallback(
    async (team: Team, event: EventType) => {
      if (!matchId || saving) return;

      setSaving(true);

      const { data, error } = await supabase
        .from("match_events_test")
        .insert({
          match_id: matchId,
          match_time: seconds,
          team,
          event_type: event,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        alert("Could not save event.");
        setSaving(false);
        return;
      }

      setEvents((current) => [data, ...current]);
      setLastEvent(data);

      setSaving(false);
    },
    [matchId, saving, seconds]
  );

  // -----------------------------------------
  // KEYBOARD
  // -----------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!running) return;

      const key = e.key.toLowerCase();
      const mapping = KEY_MAP[key];

      if (!mapping) return;

      e.preventDefault();

      recordEvent(mapping.team, mapping.event);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [running, recordEvent]);

  // -----------------------------------------
  // TIME
  // -----------------------------------------

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  function openTimeEditor() {
    setMinuteInput(String(Math.floor(seconds / 60)));
    setSecondInput(String(seconds % 60));
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

    setSeconds(minute * 60 + second);
    setEditTime(false);
  }

  function changeMinute(amount: number) {
    setSeconds((current) => Math.max(0, current + amount * 60));
  }

  // -----------------------------------------
  // UNDO
  // -----------------------------------------

  async function undoLast() {
    if (events.length === 0) return;

    const event = events[0];

    const { error } = await supabase
      .from("match_events_test")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.error(error);
      alert("Could not undo event.");
      return;
    }

    setEvents((current) => current.slice(1));
    setLastEvent(events.length > 1 ? events[1] : null);
  }

  // -----------------------------------------
  // RESET CLOCK
  // -----------------------------------------

  function resetClock() {
    if (
      !confirm(
        "Reset the match clock? Existing database events will NOT be deleted."
      )
    ) {
      return;
    }

    setRunning(false);
    setSeconds(0);
  }

  // -----------------------------------------
  // STATISTICS
  // -----------------------------------------

  function count(team: Team, event: EventType) {
    return events.filter(
      (item) => item.team === team && item.event_type === event
    ).length;
  }

  function passAttempts(team: Team) {
    return (
      count(team, "PASS_COMPLETED") +
      count(team, "PASS_MISSED")
    );
  }

  function passAccuracy(team: Team) {
    const attempts = passAttempts(team);

    if (attempts === 0) return "0.0";

    return ((count(team, "PASS_COMPLETED") / attempts) * 100).toFixed(1);
  }

  function shots(team: Team) {
    return (
      count(team, "SHOT_ON_TARGET") +
      count(team, "SHOT_MISSED")
    );
  }

  function shotAccuracy(team: Team) {
    const total = shots(team);

    if (total === 0) return "0.0";

    return ((count(team, "SHOT_ON_TARGET") / total) * 100).toFixed(1);
  }

  const langsningGoals = count("Langsning", "GOAL");
  const opponentGoals = count("Opponent", "GOAL");

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-5">
          <h1 className="text-3xl font-bold">
            Live Match Logger
          </h1>

          <p className="text-gray-600">
            Match ID: {matchId}
          </p>
        </div>

        {/* SCORE + CLOCK */}
        <div className="rounded-xl bg-white p-6 text-center shadow">

          <div className="text-lg font-semibold">
            LANGSNING FC
            <span className="mx-4 text-4xl">
              {langsningGoals} - {opponentGoals}
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
                onChange={(e) => setMinuteInput(e.target.value)}
                className="w-24 rounded-lg border p-3 text-center text-xl"
                placeholder="Min"
              />

              <span className="p-3 text-xl font-bold">:</span>

              <input
                type="number"
                min="0"
                max="59"
                value={secondInput}
                onChange={(e) => setSecondInput(e.target.value)}
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
                onClick={() => setEditTime(false)}
                className="rounded-lg bg-gray-500 px-5 py-3 font-bold text-white"
              >
                CANCEL
              </button>

            </div>
          ) : (
            <div className="mt-5 flex flex-wrap justify-center gap-2">

              <button
                onClick={() => changeMinute(-1)}
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
                onClick={() => changeMinute(1)}
                className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-white"
              >
                +1 MIN
              </button>

            </div>
          )}

          <div className="mt-4 flex justify-center gap-3">

            <button
              onClick={() => setRunning(true)}
              className="rounded-lg bg-green-600 px-6 py-3 font-bold text-white"
            >
              START
            </button>

            <button
              onClick={() => setRunning(false)}
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

        {/* LIVE STATISTICS */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-5 text-2xl font-bold">
            Live Statistics
          </h2>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[650px] border-collapse text-center">

              <thead>
                <tr className="border-b-2">
                  <th className="p-3 text-left">Statistic</th>
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
                  home={passAttempts("Langsning")}
                  away={passAttempts("Opponent")}
                />

                <StatRow
                  label="Pass completed"
                  home={count("Langsning", "PASS_COMPLETED")}
                  away={count("Opponent", "PASS_COMPLETED")}
                />

                <StatRow
                  label="Pass missed"
                  home={count("Langsning", "PASS_MISSED")}
                  away={count("Opponent", "PASS_MISSED")}
                />

                <StatRow
                  label="Pass accuracy"
                  home={`${passAccuracy("Langsning")}%`}
                  away={`${passAccuracy("Opponent")}%`}
                />

                <StatRow
                  label="Shots"
                  home={shots("Langsning")}
                  away={shots("Opponent")}
                />

                <StatRow
                  label="Shots on target"
                  home={count("Langsning", "SHOT_ON_TARGET")}
                  away={count("Opponent", "SHOT_ON_TARGET")}
                />

                <StatRow
                  label="Shots missed"
                  home={count("Langsning", "SHOT_MISSED")}
                  away={count("Opponent", "SHOT_MISSED")}
                />

                <StatRow
                  label="Shot accuracy"
                  home={`${shotAccuracy("Langsning")}%`}
                  away={`${shotAccuracy("Opponent")}%`}
                />

                <StatRow
                  label="Clearances"
                  home={count("Langsning", "CLEARANCE")}
                  away={count("Opponent", "CLEARANCE")}
                />

                <StatRow
                  label="Interceptions"
                  home={count("Langsning", "INTERCEPTION")}
                  away={count("Opponent", "INTERCEPTION")}
                />

                <StatRow
                  label="Corners"
                  home={count("Langsning", "CORNER")}
                  away={count("Opponent", "CORNER")}
                />

                <StatRow
                  label="Offsides"
                  home={count("Langsning", "OFFSIDE")}
                  away={count("Opponent", "OFFSIDE")}
                />

                <StatRow
                  label="Fouls"
                  home={count("Langsning", "FOUL")}
                  away={count("Opponent", "FOUL")}
                />

                <StatRow
                  label="Yellow cards"
                  home={count("Langsning", "YELLOW_CARD")}
                  away={count("Opponent", "YELLOW_CARD")}
                />

                <StatRow
                  label="Red cards"
                  home={count("Langsning", "RED_CARD")}
                  away={count("Opponent", "RED_CARD")}
                />

                <StatRow
                  label="Substitutions"
                  home={count("Langsning", "SUBSTITUTION")}
                  away={count("Opponent", "SUBSTITUTION")}
                />

                <StatRow
                  label="Injuries"
                  home={count("Langsning", "INJURY")}
                  away={count("Opponent", "INJURY")}
                />

                <StatRow
                  label="Penalties"
                  home={count("Langsning", "PENALTY")}
                  away={count("Opponent", "PENALTY")}
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
          />

          <TeamPanel
            team="Opponent"
            color="blue"
            recordEvent={recordEvent}
          />

        </div>

        {/* OTHER EVENTS */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <h2 className="mb-5 text-2xl font-bold">
            Other Match Events
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

            {(
              [
                ["GOAL", "⚽ Goal"],
                ["PENALTY", "🥅 Penalty"],
                ["CORNER", "🚩 Corner"],
                ["OFFSIDE", "🚫 Offside"],
                ["FOUL", "⚠️ Foul"],
                ["YELLOW_CARD", "🟨 Yellow Card"],
                ["RED_CARD", "🟥 Red Card"],
                ["SUBSTITUTION", "🔄 Substitution"],
                ["INJURY", "🩹 Injury"],
              ] as [EventType, string][]
            ).map(([event, label]) => (
              <div key={event} className="grid grid-cols-2 gap-1">

                <button
                  onClick={() =>
                    recordEvent("Langsning", event)
                  }
                  className="rounded-lg bg-green-700 p-3 text-sm font-bold text-white"
                >
                  L {label}
                </button>

                <button
                  onClick={() =>
                    recordEvent("Opponent", event)
                  }
                  className="rounded-lg bg-blue-700 p-3 text-sm font-bold text-white"
                >
                  O {label}
                </button>

              </div>
            ))}

          </div>
        </div>

        {/* LAST EVENT */}
        <div className="mt-6 rounded-xl bg-white p-5 text-center shadow">

          <div className="text-sm font-semibold uppercase text-gray-500">
            Last Event
          </div>

          {lastEvent ? (
            <div className="mt-2 text-2xl font-bold">
              {formatTime(lastEvent.match_time)}
              {" — "}
              {lastEvent.team}
              {" — "}
              {EVENT_LABELS[lastEvent.event_type]}
            </div>
          ) : (
            <div className="mt-2 text-gray-400">
              No events recorded
            </div>
          )}

          {saving && (
            <div className="mt-2 text-sm text-blue-600">
              Saving...
            </div>
          )}

        </div>

        {/* TIMELINE */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-2xl font-bold">
              Event Timeline
            </h2>

            <button
              onClick={undoLast}
              disabled={events.length === 0}
              className="rounded-lg bg-gray-800 px-5 py-3 font-bold text-white disabled:opacity-40"
            >
              UNDO LAST
            </button>

          </div>

          {events.length === 0 ? (
            <p className="text-gray-400">
              No events yet.
            </p>
          ) : (
            <div className="space-y-2">

              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >

                  <span className="font-mono font-bold">
                    {formatTime(event.match_time)}
                  </span>

                  <span className="font-semibold">
                    {event.team}
                  </span>

                  <span>
                    {EVENT_LABELS[event.event_type]}
                  </span>

                </div>
              ))}

            </div>
          )}

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
}: {
  team: Team;
  color: "green" | "blue";
  recordEvent: (team: Team, event: EventType) => void;
}) {
  const isLangsning = team === "Langsning";

  const buttons = isLangsning
    ? [
        ["F", "Pass completed", "PASS_COMPLETED"],
        ["N", "Pass missed", "PASS_MISSED"],
        ["A", "Shot on target", "SHOT_ON_TARGET"],
        ["V", "Shot missed", "SHOT_MISSED"],
        ["D", "Clearance", "CLEARANCE"],
        ["S", "Interception", "INTERCEPTION"],
      ]
    : [
        ["J", "Pass completed", "PASS_COMPLETED"],
        ["K", "Pass missed", "PASS_MISSED"],
        ["P", "Shot on target", "SHOT_ON_TARGET"],
        ["U", "Shot missed", "SHOT_MISSED"],
        ["L", "Clearance", "CLEARANCE"],
        [";", "Interception", "INTERCEPTION"],
      ];

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

        {buttons.map(([key, label, event]) => (
          <button
            key={key}
            onClick={() =>
              recordEvent(team, event as EventType)
            }
            className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-left transition hover:bg-gray-100 active:scale-95"
          >

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-900 font-bold text-white">
              {key}
            </span>

            <span className="font-semibold">
              {label}
            </span>

          </button>
        ))}

      </div>
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

      <td className="p-3 text-lg font-bold">
        {home}
      </td>

      <td className="p-3 text-lg font-bold">
        {away}
      </td>

    </tr>
  );
}
