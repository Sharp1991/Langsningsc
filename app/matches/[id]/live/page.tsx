"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  label: string;
  enabled: boolean;
};

type VoiceColor =
  | "RED"
  | "GREEN"
  | "PINK"
  | "BLUE"
  | "YELLOW"
  | "WHITE"
  | "BLACK"
  | "ORANGE"
  | "PURPLE";

type VoicePlayer = {
  player_id: number;
  team_id: number;
  jersey_number: number;
  player_name: string;
};

type VoiceTeam = {
  team_id: number;
  team_name: string;
  color: VoiceColor;
};

type VoiceEventCandidate = {
  team_color:
    | VoiceColor
    | null;

  event_type:
    | EventType
    | null;

  jersey_number:
    | number
    | null;

  assist_jersey_number:
    | number
    | null;

  confidence: number;
};





const DEFAULT_KEY_MAP: Record<string, KeyMapping> = {
  f: {
    team: "Langsning",
    event: "PASS_COMPLETED",
    label: "Pass completed",
    enabled: true,
  },
  c: {
    team: "Langsning",
    event: "PASS_MISSED",
    label: "Pass missed",
    enabled: true,
  },
  r: {
    team: "Langsning",
    event: "SHOT_ON_TARGET",
    label: "Shot on target",
    enabled: true,
  },
  e: {
    team: "Langsning",
    event: "SHOT_MISSED",
    label: "Shot missed",
    enabled: true,
  },
  d: {
    team: "Langsning",
    event: "CLEARANCE",
    label: "Clearance",
    enabled: true,
  },
  s: {
    team: "Langsning",
    event: "INTERCEPTION",
    label: "Interception",
    enabled: true,
  },
  w: {
    team: "Langsning",
    event: "GK_SAVE",
    label: "Goalkeeper save",
    enabled: true,
  },

  j: {
    team: "Opponent",
    event: "PASS_COMPLETED",
    label: "Pass completed",
    enabled: true,
  },
  m: {
    team: "Opponent",
    event: "PASS_MISSED",
    label: "Pass missed",
    enabled: true,
  },
  u: {
    team: "Opponent",
    event: "SHOT_ON_TARGET",
    label: "Shot on target",
    enabled: true,
  },
  i: {
    team: "Opponent",
    event: "SHOT_MISSED",
    label: "Shot missed",
    enabled: true,
  },
  k: {
    team: "Opponent",
    event: "CLEARANCE",
    label: "Clearance",
    enabled: true,
  },
  l: {
    team: "Opponent",
    event: "INTERCEPTION",
    label: "Interception",
    enabled: true,
  },
  o: {
    team: "Opponent",
    event: "GK_SAVE",
    label: "Goalkeeper save",
    enabled: true,
  },
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

function voiceColorStorageKey(matchId: number) {
  return `langsning-voice-colors-${matchId}`;
}

const VOICE_COLORS: VoiceColor[] = [
  "RED",
  "GREEN",
  "PINK",
  "BLUE",
  "YELLOW",
  "WHITE",
  "BLACK",
  "ORANGE",
  "PURPLE",
];



export default function LiveMatchLogger() {
  const params = useParams();
  const matchId = Number(params.id);

  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [events, setEvents] = useState<MatchEvent[]>([]);

  const [availableEvents, setAvailableEvents] = useState<
    { id: number; code: EventType; name: string }[]
  >([]);
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
  // MATCH TEAMS
  // -----------------------------------------

  const [teamAName, setTeamAName] =
    useState("Team A");

  const [teamBName, setTeamBName] =
    useState("Team B");

  // -----------------------------------------
  // VOICE TEAM / PLAYER MAPPING
  // -----------------------------------------

  const [voiceTeams, setVoiceTeams] =
    useState<VoiceTeam[]>([]);

  const [voicePlayers, setVoicePlayers] =
    useState<VoicePlayer[]>([]);

  const [voiceColorMap, setVoiceColorMap] =
    useState<Record<VoiceColor, number | null>>({
      RED: null,
      GREEN: null,
      PINK: null,
      BLUE: null,
      YELLOW: null,
      WHITE: null,
      BLACK: null,
      ORANGE: null,
      PURPLE: null,
    });

  const [mappingStatus, setMappingStatus] =
    useState("Loading match teams...");



  // -----------------------------------------
  // VOICE LOGGER
  // -----------------------------------------

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const audioContextRef =
    useRef<AudioContext | null>(null);

  const analyserRef =
    useRef<AnalyserNode | null>(null);

  const speechCheckRef =
    useRef<ReturnType<typeof setInterval> | null>(null);

  const speechStartedRef =
    useRef(false);

  const speechStartTimeRef =
    useRef(0);

  const lastSpeechTimeRef =
    useRef(0);

  const segmentStoppingRef =
    useRef(false);



  const voiceChunksRef =
    useRef<Blob[]>([]);

  const [micActive, setMicActive] =
    useState(false);

  const [voiceStatus, setVoiceStatus] =
    useState("Microphone off");

  const [voiceTranscript, setVoiceTranscript] =
    useState("");

  const [voiceEventCandidate, setVoiceEventCandidate] =
    useState<VoiceEventCandidate | null>(null);

  const [voiceEventQueue, setVoiceEventQueue] =
    useState<VoiceEventCandidate[]>([]);

  const [voiceParserStatus, setVoiceParserStatus] =
    useState("Waiting for transcript");



  const [voiceProcessing, setVoiceProcessing] =
    useState(false);

  const voiceRecorderMimeTypeRef =
    useRef<string>("");

  const voiceSegmentTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);





  // -----------------------------------------
  // VOICE MICROPHONE
  // -----------------------------------------


  // -----------------------------------------
  // TRANSCRIBE VOICE SEGMENT
  // -----------------------------------------


  // -----------------------------------------
  // PARSE VOICE TRANSCRIPT
  // -----------------------------------------

  const parseVoiceTranscript =
    useCallback(
      async (transcript: string) => {

        if (!transcript.trim()) {
          return;
        }

        try {

          setVoiceParserStatus(
            "Parsing event..."
          );

          const response =
            await fetch(
              "/api/parse-event",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  text: transcript,
                }),
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
              "Event parsing failed"
            );
          }

          const parsedEvents =
            Array.isArray(data?.events)
              ? data.events
              : [];

          const candidates:
            VoiceEventCandidate[] =
              parsedEvents.map((event: any) => ({
                team_color:
                  event?.team_color ?? null,

                event_type:
                  event?.event_type ?? null,

                jersey_number:
                  event?.jersey_number ?? null,

                assist_jersey_number:
                  event?.assist_jersey_number ?? null,

                confidence:
                  typeof event?.confidence ===
                  "number"
                    ? event.confidence
                    : 0,
              }));

          setVoiceEventQueue(
            (current) => [
              ...current,
              ...candidates,
            ]
          );

          // Keep the first event in the old
          // candidate state temporarily so the
          // existing UI does not break.

          setVoiceEventCandidate(
            candidates[0] ?? null
          );

          setVoiceParserStatus(
            candidates.length > 0
              ? `${candidates.length} event${
                  candidates.length === 1
                    ? ""
                    : "s"
                } parsed`
              : "No football event detected"
          );

          console.log(
            "VOICE EVENT QUEUE:",
            candidates
          );

        } catch (error) {

          console.error(
            "Voice parser error:",
            error
          );

          setVoiceParserStatus(
            "Event parsing failed"
          );

          setVoiceEventCandidate(
            null
          );
        }

      },
      []
    );

  const transcribeVoiceSegment =
    useCallback(
      async (blob: Blob) => {

        if (!blob.size) return;

        try {

          setVoiceProcessing(true);
          setVoiceStatus(
            "● Processing speech..."
          );

          const formData =
            new FormData();

          const extension =
            blob.type.includes("webm")
              ? "webm"
              : blob.type.includes("mp4")
              ? "mp4"
              : "audio";

          formData.append(
            "audio",
            blob,
            `voice-segment.${extension}`
          );

          const response =
            await fetch(
              "/api/transcribe",
              {
                method: "POST",
                body: formData,
              }
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.error ||
              "Transcription failed"
            );
          }

          const transcript =
            typeof data?.text === "string"
              ? data.text.trim()
              : "";

          if (transcript) {

            setVoiceTranscript(
              transcript
            );

            console.log(
              "VOICE TRANSCRIPT:",
              transcript
            );

            /*
             * Immediately send the transcript
             * to the football event parser.
             *
             * Nothing is written to Supabase here.
             */

            await parseVoiceTranscript(
              transcript
            );

          }

          setVoiceStatus(
            micActive
              ? "● Microphone recording"
              : "Microphone stopped"
          );

        } catch (error) {

          console.error(
            "Voice transcription error:",
            error
          );

          setVoiceStatus(
            "Transcription failed"
          );

        } finally {

          setVoiceProcessing(false);

        }

      },
      [
        micActive,
        parseVoiceTranscript,
      ]
    );

  const startVoiceRecording = useCallback(
    async () => {
      if (micActive) return;

      try {
        setVoiceStatus(
          "Requesting microphone..."
        );

        const stream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

        streamRef.current = stream;

        /*
         * Audio analyser is used only for speech detection.
         * MediaRecorder creates the actual audio file.
         */

        const AudioContextClass =
          window.AudioContext ||
          (window as any).webkitAudioContext;

        const audioContext =
          new AudioContextClass();

        const analyser =
          audioContext.createAnalyser();

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;

        const source =
          audioContext.createMediaStreamSource(
            stream
          );

        source.connect(analyser);

        audioContextRef.current =
          audioContext;

        analyserRef.current =
          analyser;

        speechStartedRef.current =
          false;

        speechStartTimeRef.current =
          0;

        lastSpeechTimeRef.current =
          0;

        segmentStoppingRef.current =
          false;

        /*
         * Create a recorder for one complete
         * audio segment.
         */

        const createRecorder = () => {

          if (!streamRef.current) return;

          let mimeType = "";

          if (
            MediaRecorder.isTypeSupported(
              "audio/webm;codecs=opus"
            )
          ) {
            mimeType =
              "audio/webm;codecs=opus";
          } else if (
            MediaRecorder.isTypeSupported(
              "audio/webm"
            )
          ) {
            mimeType =
              "audio/webm";
          } else if (
            MediaRecorder.isTypeSupported(
              "audio/mp4"
            )
          ) {
            mimeType =
              "audio/mp4";
          }

          const recorder =
            mimeType
              ? new MediaRecorder(
                  streamRef.current,
                  { mimeType }
                )
              : new MediaRecorder(
                  streamRef.current
                );

          const chunks: Blob[] = [];

          recorder.ondataavailable =
            (event) => {

              if (
                event.data &&
                event.data.size > 0
              ) {
                chunks.push(
                  event.data
                );
              }
            };

          recorder.onstop = async () => {

            /*
             * This recorder was stopped normally.
             * Its chunks now form a complete file.
             */

            if (!chunks.length) {
              segmentStoppingRef.current =
                false;
              return;
            }

            const type =
              recorder.mimeType ||
              "audio/webm";

            const blob =
              new Blob(
                chunks,
                { type }
              );

            console.log(
              "Complete voice segment:",
              blob.size,
              type
            );

            if (blob.size > 1000) {
              await transcribeVoiceSegment(
                blob
              );
            }

            segmentStoppingRef.current =
              false;

            /*
             * If the microphone is still active,
             * immediately start a new complete recorder.
             */

            if (
              streamRef.current &&
              micActive
            ) {
              createRecorder();
            }

          };

          recorder.onerror =
            (event) => {

              console.error(
                "MediaRecorder error:",
                event
              );

              segmentStoppingRef.current =
                false;

              setVoiceStatus(
                "Microphone recording error"
              );
            };

          recorder.start();

          mediaRecorderRef.current =
            recorder;

          voiceRecorderMimeTypeRef.current =
            recorder.mimeType;
        };

        createRecorder();

        /*
         * Speech detector.
         *
         * We don't cut at a fixed duration.
         *
         * Speech starts when RMS crosses the
         * threshold and ends after a short period
         * of silence.
         */

        const data =
          new Uint8Array(
            analyser.fftSize
          );

        speechCheckRef.current =
          setInterval(() => {

            if (
              !analyserRef.current ||
              !mediaRecorderRef.current
            ) {
              return;
            }

            analyserRef.current
              .getByteTimeDomainData(data);

            let sum = 0;

            for (
              let i = 0;
              i < data.length;
              i++
            ) {
              const normalized =
                (data[i] - 128) / 128;

              sum +=
                normalized *
                normalized;
            }

            const rms =
              Math.sqrt(
                sum / data.length
              );

            const now =
              Date.now();

            /*
             * Threshold deliberately kept low
             * for normal speech.
             */

            /*
             * Speech detection is NOT time based.
             *
             * The microphone remains active for the
             * entire match. We only end an utterance
             * when the speaker has actually stopped.
             *
             * A short silence inside a sentence should
             * not immediately cut the recording.
             */

            const SPEECH_THRESHOLD = 0.018;

            /*
             * How long the audio must remain above the
             * speech threshold before we consider it
             * genuine speech.
             */
            const MIN_SPEECH_MS = 180;

            /*
             * Silence after speech which indicates that
             * the commentator has finished the command.
             *
             * This is deliberately short because football
             * commentary is fast.
             */
            const END_SILENCE_MS = 500;

            const speaking =
              rms > SPEECH_THRESHOLD;

            if (speaking) {

              if (
                !speechStartedRef.current
              ) {
                speechStartedRef.current =
                  true;

                speechStartTimeRef.current =
                  now;

                console.log(
                  "Speech started"
                );
              }

              /*
               * Every detected speech frame extends
               * the current utterance.
               */
              lastSpeechTimeRef.current =
                now;

            } else if (
              speechStartedRef.current
            ) {

              const silenceDuration =
                now -
                lastSpeechTimeRef.current;

              const speechDuration =
                lastSpeechTimeRef.current -
                speechStartTimeRef.current;

              /*
               * Only cut after genuine speech followed
               * by a real pause.
               *
               * There is NO maximum recording duration.
               */
              if (
                silenceDuration >=
                  END_SILENCE_MS &&
                speechDuration >=
                  MIN_SPEECH_MS &&
                !segmentStoppingRef.current &&
                mediaRecorderRef.current &&
                mediaRecorderRef.current
                  .state !== "inactive"
              ) {

                console.log(
                  "Natural speech boundary:",
                  speechDuration,
                  "ms speech +",
                  silenceDuration,
                  "ms silence"
                );

                segmentStoppingRef.current =
                  true;

                speechStartedRef.current =
                  false;

                mediaRecorderRef.current.stop();
              }
            }

          }, 100);

        setMicActive(true);

        setVoiceStatus(
          "● Microphone listening"
        );

      } catch (error) {

        console.error(
          "Microphone error:",
          error
        );

        setVoiceStatus(
          "Microphone unavailable"
        );
      }
    },
    [
      micActive,
      transcribeVoiceSegment,
    ]
  );

  const stopVoiceRecording =
    useCallback(() => {

      if (
        speechCheckRef.current
      ) {
        clearInterval(
          speechCheckRef.current
        );

        speechCheckRef.current =
          null;
      }

      speechStartedRef.current =
        false;

      segmentStoppingRef.current =
        false;

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.stop();
      }

      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      streamRef.current =
        null;

      mediaRecorderRef.current =
        null;

      analyserRef.current =
        null;

      if (
        audioContextRef.current
      ) {
        audioContextRef.current
          .close()
          .catch(() => {});

        audioContextRef.current =
          null;
      }

      setMicActive(false);

      setVoiceStatus(
        "Microphone stopped"
      );

    }, []);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);



  // -----------------------------------------
  // LOAD VOICE TEAM / PLAYER MAPPING
  // -----------------------------------------

  useEffect(() => {

    if (!matchId) return;

    async function loadVoiceMapping() {

      setMappingStatus(
        "Loading match teams..."
      );

      try {

        const { data: match, error: matchError } =
          await supabase
            .from("matches")
            .select(
              "home_team_id, away_team_id"
            )
            .eq("id", matchId)
            .single();

        if (matchError || !match) {

          console.error(
            "Could not load match teams:",
            matchError
          );

          setMappingStatus(
            "Could not load match teams"
          );

          return;
        }

        const teamIds = [
          match.home_team_id,
          match.away_team_id,
        ].filter(
          (id): id is number =>
            typeof id === "number"
        );

        if (teamIds.length === 0) {

          setMappingStatus(
            "No teams found for this match"
          );

          return;
        }

        const [
          { data: teams, error: teamsError },
          { data: lineup, error: lineupError },
        ] = await Promise.all([

          supabase
            .from("teams")
            .select("id, name")
            .in("id", teamIds),

          supabase
            .from("match_lineups")
            .select(
              `
              id,
              team_id,
              shirt_number,
              player_id,
              player:players(
                id,
                name
              )
              `
            )
            .eq("match_id", matchId)
            .in("team_id", teamIds)
            .order(
              "shirt_number",
              { ascending: true }
            ),

        ]);

        if (teamsError) {

          console.error(
            "Could not load teams:",
            teamsError
          );

        }

        if (lineupError) {

          console.error(
            "Could not load lineup:",
            lineupError
          );

        }

        setTeamAName(
          teams?.[0]?.name || "Team A"
        );

        setTeamBName(
          teams?.[1]?.name || "Team B"
        );

        const loadedTeams: VoiceTeam[] =
          (teams || []).map(
            (team, index) => ({

              team_id: team.id,

              team_name:
                team.name || `Team ${team.id}`,

              color:
                index === 0
                  ? "RED"
                  : "GREEN",

            })
          );

        const loadedPlayers: VoicePlayer[] =
          (lineup || [])
            .filter(
              (row) =>
                row.team_id &&
                row.shirt_number != null &&
                row.player
            )
            .map(
              (row) => ({

                player_id:
                  row.player_id ||
                  row.player?.[0]?.id,

                team_id:
                  row.team_id,

                jersey_number:
                  Number(row.shirt_number),

                player_name:
                  row.player?.[0]?.name ||
                  "Unknown player",

              })
            );

        setVoiceTeams(
          loadedTeams
        );

        setVoicePlayers(
          loadedPlayers
        );

        /*
         * Default:
         *
         * RED   = home team
         * GREEN = away team
         *
         * If a mapping was already saved for this
         * match, restore it instead.
         */

        const saved =
          localStorage.getItem(
            voiceColorStorageKey(matchId)
          );

        if (saved) {

          try {

            setVoiceColorMap(
              JSON.parse(saved)
            );

          } catch {

            console.error(
              "Could not restore voice colors"
            );

          }

        } else {

          const defaultMap: Record<
            VoiceColor,
            number | null
          > = {
            RED: null,
            GREEN: null,
            PINK: null,
            BLUE: null,
            YELLOW: null,
            WHITE: null,
            BLACK: null,
            ORANGE: null,
            PURPLE: null,
          };

          if (
            loadedTeams[0]
          ) {

            defaultMap.RED =
              loadedTeams[0].team_id;

          }

          if (
            loadedTeams[1]
          ) {

            defaultMap.GREEN =
              loadedTeams[1].team_id;

          }

          setVoiceColorMap(
            defaultMap
          );

          localStorage.setItem(
            voiceColorStorageKey(matchId),
            JSON.stringify(defaultMap)
          );

        }

        setMappingStatus(
          `${loadedPlayers.length} players loaded`
        );

      } catch (error) {

        console.error(
          "Voice mapping error:",
          error
        );

        setMappingStatus(
          "Voice mapping failed"
        );

      }

    }

    loadVoiceMapping();

  }, [matchId]);

  // Save color mapping locally.

  useEffect(() => {

    if (!matchId) return;

    localStorage.setItem(
      voiceColorStorageKey(matchId),
      JSON.stringify(voiceColorMap)
    );

  }, [
    matchId,
    voiceColorMap,
  ]);

  // Resolve a voice color to the actual team ID.

  const resolveVoiceTeam =
    useCallback(
      (color: VoiceColor) => {

        return (
          voiceColorMap[color] ??
          null
        );

      },
      [voiceColorMap]
    );

  // Resolve team + jersey number to player.

  const resolveVoicePlayer =
    useCallback(
      (
        color: VoiceColor,
        jerseyNumber: number | null
      ) => {

        if (
          jerseyNumber == null
        ) {
          return null;
        }

        const teamId =
          resolveVoiceTeam(color);

        if (!teamId) {
          return null;
        }

        return (
          voicePlayers.find(
            (player) =>
              player.team_id === teamId &&
              player.jersey_number ===
                jerseyNumber
          ) || null
        );

      },
      [
        resolveVoiceTeam,
        voicePlayers,
      ]
    );

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
  // LOAD EVENT TYPES
  // -----------------------------------------

  useEffect(() => {
    async function loadEventTypes() {
      const { data, error } = await supabase
        .from("event_types")
        .select("id, code, name")
        .eq("active", true)
        .order("id");

      if (error) {
        console.error(
          "Could not load event types:",
          error
        );
        return;
      }

      setAvailableEvents(
        (data ?? []) as {
          id: number;
          code: EventType;
          name: string;
        }[]
      );
    }

    loadEventTypes();
  }, []);

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
          label: EVENT_LABELS[waitingForKey.event],
          enabled: true,
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

                      <select
                      value={mapping.event}
                      onChange={(e) => {
                        const newEvent =
                          e.target.value as EventType;

                        setKeyMap((current) => ({
                          ...current,
                          [key]: {
                            ...current[key],
                            event: newEvent,
                            label: EVENT_LABELS[newEvent],
                          },
                        }));
                      }}
                      className="rounded-md border px-2 py-1"
                    >
                      {availableEvents.map((event) => (
                        <option
                          key={event.code}
                          value={event.code}
                        >
                          {event.name}
                        </option>
                      ))}
                    </select>
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


        {/* VOICE LOGGER */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <h2 className="text-2xl font-bold">
                🎙️ Voice Match Logger
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Speak naturally during the match.
              </p>

              <p className="mt-2 font-semibold">
                {voiceStatus}
              </p>
            </div>

            {!micActive ? (
              <button
                onClick={startVoiceRecording}
                className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white"
              >
                🎙️ START MIC
              </button>
            ) : (
              <button
                onClick={stopVoiceRecording}
                className="rounded-lg bg-gray-800 px-6 py-3 font-bold text-white"
              >
                ⏹ STOP MIC
              </button>
            )}

          </div>

        </div>



        {/* VOICE TEAM MAPPING */}

        <div className="mt-6 rounded-xl bg-white p-5 shadow">

          <div className="flex items-center justify-between gap-4">

            <div>
              <h2 className="text-xl font-bold">
                🎙️ Voice Team Mapping
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Say the color and jersey number during commentary.
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {mappingStatus}
            </span>

          </div>

          <div className="mt-4 grid gap-3">

            {VOICE_COLORS.map((color) => {

              const teamId =
                voiceColorMap[color];

              const team =
                voiceTeams.find(
                  (item) =>
                    item.team_id === teamId
                );

              return (
                <div
                  key={color}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >

                  <span className="w-24 font-bold">
                    {color}
                  </span>

                  <select
                    value={
                      teamId ?? ""
                    }
                    onChange={(event) => {

                      const value =
                        event.target.value;

                      setVoiceColorMap(
                        (current) => ({
                          ...current,
                          [color]:
                            value
                              ? Number(value)
                              : null,
                        })
                      );

                    }}
                    className="rounded-lg border px-3 py-2"
                  >

                    <option value="">
                      Not assigned
                    </option>

                    {voiceTeams.map(
                      (voiceTeam) => (
                        <option
                          key={
                            voiceTeam.team_id
                          }
                          value={
                            voiceTeam.team_id
                          }
                        >
                          {voiceTeam.team_name}
                        </option>
                      )
                    )}

                  </select>

                  {team && (
                    <span className="text-sm text-gray-600">
                      Team ID: {team.team_id}
                    </span>
                  )}

                </div>
              );

            })}

          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">

            <strong>Example:</strong>{" "}

            Red #5 → selected RED team → jersey #5 → player ID

          </div>

        </div>


        {/* VOICE TRANSCRIPT */}

        <div className="mt-4 rounded-xl bg-gray-50 p-5 shadow">

          <div className="flex items-center justify-between">

            <h3 className="font-bold">
              Live Voice Transcript
            </h3>

            {voiceProcessing && (
              <span className="text-sm text-gray-500">
                Processing...
              </span>
            )}

          </div>

          <div className="mt-3 min-h-[60px] rounded-lg bg-white p-4">

            {voiceTranscript ? (
              <p className="font-medium">
                “{voiceTranscript}”
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Start the microphone and speak.
              </p>
            )}

          </div>

        </div>


        {/* VOICE REVIEW QUEUE */}

        <div className="mt-4 rounded-xl bg-white p-5 shadow">

          <div className="flex items-center justify-between">

            <h3 className="font-bold">
              Voice Review Queue
            </h3>

            <span className="text-sm text-gray-500">
              {voiceEventQueue.length} pending
            </span>

          </div>

          {voiceEventQueue.length === 0 ? (

            <p className="mt-3 text-sm text-gray-400">
              No pending voice events.
            </p>

          ) : (

            <div className="mt-4 space-y-3">

              {voiceEventQueue.map(
                (event, index) => (

                  <div
                    key={`${index}-${event.team_color}-${event.event_type}`}
                    className="rounded-lg border p-4"
                  >

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div>

                        <div className="font-bold">
                          {event.team_color || "Unknown"}
                          {" — "}
                          {event.event_type || "Unknown"}
                        </div>

                        <div className="mt-1 text-sm text-gray-600">

                          Jersey:{" "}
                          {event.jersey_number ?? "—"}

                          {" • "}

                          Assist:{" "}
                          {event.assist_jersey_number ?? "—"}

                          {" • "}

                          Confidence:{" "}
                          {Math.round(
                            event.confidence * 100
                          )}
                          %

                        </div>

                      </div>

                      <div className="flex gap-2">

                        <button
                          type="button"
                          onClick={() => {
                            setVoiceEventQueue(
                              (current) =>
                                current.filter(
                                  (_, i) =>
                                    i !== index
                                )
                            );
                          }}
                          className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white"
                        >
                          APPROVE
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVoiceEventQueue(
                              (current) =>
                                current.filter(
                                  (_, i) =>
                                    i !== index
                                )
                            );
                          }}
                          className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
                        >
                          REJECT
                        </button>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>


        {/* VOICE EVENT CANDIDATE */}

        <div className="mt-4 rounded-xl bg-white p-5 shadow">

          <div className="flex items-center justify-between">

            <h3 className="font-bold">
              Parsed Event
            </h3>

            <span className="text-sm text-gray-500">
              {voiceParserStatus}
            </span>

          </div>

          {voiceEventCandidate ? (

            <div className="mt-4 grid gap-2 text-sm">

              <div>
                <strong>Team:</strong>{" "}
                {voiceEventCandidate.team_color ||
                  "Unknown"}
              </div>

              <div>
                <strong>Event:</strong>{" "}
                {voiceEventCandidate.event_type ||
                  "Unknown"}
              </div>

              <div>
                <strong>Jersey:</strong>{" "}
                {voiceEventCandidate.jersey_number ??
                  "—"}
              </div>

              <div>
                <strong>Assist:</strong>{" "}
                {voiceEventCandidate.assist_jersey_number ??
                  "—"}
              </div>

              <div>
                <strong>Confidence:</strong>{" "}
                {Math.round(
                  voiceEventCandidate.confidence *
                    100
                )}
                %
              </div>

            </div>

          ) : (

            <p className="mt-3 text-sm text-gray-400">
              No parsed event yet.
            </p>

          )}

        </div>

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
