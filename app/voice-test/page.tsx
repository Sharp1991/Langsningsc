"use client";

import { useEffect, useRef, useState } from "react";

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: unknown;
  [key: string]: unknown;
};

const TEAM_COLORS = [
  "RED",
  "BLUE",
  "GREEN",
  "YELLOW",
  "WHITE",
  "BLACK",
  "ORANGE",
  "PINK",
  "PURPLE",
  "GREY",
  "NAVY",
  "MAROON",
  "GOLD",
  "SKY BLUE",
] as const;

export default function VoiceTestPage() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText] = useState("");
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState("");
  const [teamColorA, setTeamColorA] = useState("RED");
  const [teamColorB, setTeamColorB] = useState("GREEN");

  const parserBufferRef = useRef("");
  const parserProcessedRef = useRef("");


  const [events, setEvents] = useState<
    {
      id: string;
      team_color: string | null;
      event_type: string | null;
      jersey_number: number | null;
      assist_jersey_number: number | null;
      confidence: number;
      detected_by: string;
      manual_review: boolean;
    }[]
  >([]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  function feedParserDelta(delta: string) {
    if (!delta.trim()) return;

    parserBufferRef.current =
      `${parserBufferRef.current} ${delta}`.trim();

    const buffer = parserBufferRef.current;

    const colorPattern =
      [teamColorA, teamColorB]
        .map((color) =>
          color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        )
        .join("|");

    const matches = [
      ...buffer.matchAll(
        new RegExp(`\\b(${colorPattern})\\b`, "gi")
      ),
    ];

    if (matches.length < 2) return;

    const segments: string[] = [];

    for (let i = 0; i < matches.length - 1; i++) {
      const startIndex = matches[i].index ?? 0;
      const endIndex = matches[i + 1].index ?? 0;

      const segment = buffer
        .slice(startIndex, endIndex)
        .trim();

      if (segment) {
        segments.push(segment);
      }
    }

    const lastStart =
      matches[matches.length - 1].index ?? 0;

    parserBufferRef.current =
      buffer.slice(lastStart).trim();

    for (const segment of segments) {
      if (segment !== parserProcessedRef.current) {
        parserProcessedRef.current = segment;
        void parseEventText(segment);
      }
    }
  }

  async function parseEventText(text: string) {
    try {
      const response = await fetch("/api/parse-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          team_colors: [teamColorA, teamColorB],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Parser error:", data);
        return;
      }

      const parserSource = data.parser_source;

      const detectedBy =
        parserSource === "fast"
          ? "FAST_RULE"
          : parserSource === "gpt"
            ? "GPT-5.6-LUNA"
            : "MANUAL";

      if (!Array.isArray(data.events)) {
        return;
      }

      const newEvents = data.events.map((event: any) => ({
        id: `evt_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`,
        team_color: event.team_color ?? null,
        event_type: event.event_type ?? null,
        jersey_number: event.jersey_number ?? null,
        assist_jersey_number:
          event.assist_jersey_number ?? null,
        confidence:
          typeof event.confidence === "number"
            ? event.confidence
            : 0,
        detected_by: detectedBy,
        manual_review:
          Boolean(data.manual_review) ||
          !event.team_color ||
          !event.event_type ||
          event.confidence < 0.8,
      }));

      if (newEvents.length > 0) {
        setEvents((current) => [
          ...current,
          ...newEvents,
        ]);
      }
    } catch (error) {
      console.error(
        "Event parser request failed:",
        error
      );
    }
  }

  async function startListening() {
    try {
      setTranscript("");
      setLiveText("");
      setStatus("Creating realtime session...");

      const response = await fetch(
        "/api/realtime-transcription",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not create realtime session."
        );
      }

      const clientSecret =
        data?.client_secret;

      if (!clientSecret) {
        throw new Error(
          "No realtime client secret returned."
        );
      }

      setStatus("Requesting microphone...");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;

      const pc =
        new RTCPeerConnection();

      peerRef.current = pc;

      pc.onconnectionstatechange = () => {
        console.log(
          "WebRTC:",
          pc.connectionState
        );

        if (
          pc.connectionState === "connected"
        ) {
          setStatus("● Live transcription");
          setListening(true);
        }

        if (
          pc.connectionState === "failed"
        ) {
          setStatus(
            "Realtime connection failed."
          );
        }
      };

      const track =
        stream.getAudioTracks()[0];

      pc.addTrack(track, stream);

      const channel =
        pc.createDataChannel("oai-events");

      channelRef.current = channel;

      channel.onopen = () => {
        console.log(
          "Realtime data channel OPEN"
        );

        /*
         * Explicitly tell the realtime session
         * that we want input audio transcription.
         *
         * No turn detection is enabled here.
         */
        channel.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "transcription",
              audio: {
                input: {
                  transcription: {
                    model:
                      "gpt-live-transcribe",
                    language: "en",
                  },
                },
              },
            },
          })
        );

        setStatus(
          "● Live transcription"
        );
      };

      channel.onmessage = (
        event
      ) => {
        try {
          const message =
            JSON.parse(
              event.data
            ) as RealtimeEvent;

          console.log(
            "OPENAI REALTIME EVENT TYPE:",
            message.type,
            message
          );

          setLastRealtimeEvent(
            message.type || "unknown"
          );

          /*
           * Live partial transcription.
           */
          if (
            message.type ===
            "conversation.item.input_audio_transcription.delta"
          ) {
            const delta =
              message.delta || "";

            if (delta) {
              setLiveText(
                (current) =>
                  current + delta
              );

              // Feed the same live transcription delta
              // directly into the event segmentation layer.
              feedParserDelta(delta);
            }

            setStatus(
              "● Transcribing..."
            );
          }

          /*
           * Completed transcription segment.
           */
          if (
            message.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            const completed =
              message.transcript?.trim() ||
              "";

            if (completed) {
              setTranscript(
                (current) =>
                  `${current} ${completed}`.trim()
              );

              // Send this completed segment immediately to the parser.
              void parseEventText(completed);
            }

            setLiveText("");
            setStatus(
              "● Live transcription"
            );
          }

          /*
           * Transcription failure.
           */
          if (
            message.type ===
            "conversation.item.input_audio_transcription.failed"
          ) {
            console.error(
              "Transcription failed:",
              message
            );

            setStatus(
              "Transcription error."
            );
          }

          /*
           * Useful for debugging any server-side
           * realtime errors.
           */
          if (
            message.type === "error"
          ) {
            console.error(
              "OpenAI realtime error:",
              message
            );

            setStatus(
              "OpenAI realtime error."
            );
          }
        } catch (error) {
          console.error(
            "Could not parse realtime event:",
            error
          );
        }
      };

      channel.onerror = (error) => {
        console.error(
          "Realtime channel error:",
          error
        );

        setStatus(
          "Realtime channel error."
        );
      };

      const offer =
        await pc.createOffer();

      await pc.setLocalDescription(
        offer
      );

      if (
        !pc.localDescription?.sdp
      ) {
        throw new Error(
          "Could not create SDP offer."
        );
      }

      setStatus(
        "Connecting to OpenAI..."
      );

      const sdpResponse =
        await fetch(
          "https://api.openai.com/v1/realtime/calls",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${clientSecret}`,
              "Content-Type":
                "application/sdp",
            },
            body:
              pc.localDescription.sdp,
          }
        );

      if (!sdpResponse.ok) {
        const errorText =
          await sdpResponse.text();

        throw new Error(
          `Realtime connection failed: ${errorText}`
        );
      }

      const answer =
        await sdpResponse.text();

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answer,
      });

      setListening(true);
      setStatus(
        "● Live transcription"
      );
    } catch (error) {
      console.error(
        "Realtime transcription error:",
        error
      );

      cleanup();

      setStatus(
        error instanceof Error
          ? error.message
          : "Realtime transcription failed."
      );
    }
  }

  function cleanup() {
    const channel =
      channelRef.current;

    if (channel) {
      try {
        channel.close();
      } catch {}
    }

    channelRef.current = null;

    const stream =
      streamRef.current;

    if (stream) {
      stream
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
    }

    streamRef.current = null;

    const pc =
      peerRef.current;

    if (pc) {
      try {
        pc.close();
      } catch {}
    }

    peerRef.current = null;

    setListening(false);
  }

  function stopListening() {
    cleanup();
    setLiveText("");
    setStatus("Microphone stopped.");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="mx-auto max-w-3xl">

        <h1 className="mb-6 text-3xl font-bold">
          🎙️ Langsning Live AI Transcription
        </h1>

        <div className="rounded-xl bg-white p-6 shadow">

          <div className="mb-6 rounded-lg border bg-white p-5">
            <div className="mb-3 text-sm font-bold text-gray-500">
              TEAM COLOURS
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <div className="mb-1 text-sm font-semibold">
                  TEAM A
                </div>
                <select
                  value={teamColorA}
                  onChange={(e) =>
                    setTeamColorA(e.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-3 font-semibold"
                >
                  {TEAM_COLORS.map((color) => (
                    <option
                      key={color}
                      value={color}
                      disabled={color === teamColorB}
                    >
                      {color}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="mb-1 text-sm font-semibold">
                  TEAM B
                </div>
                <select
                  value={teamColorB}
                  onChange={(e) =>
                    setTeamColorB(e.target.value)
                  }
                  className="w-full rounded-lg border px-3 py-3 font-semibold"
                >
                  {TEAM_COLORS.map((color) => (
                    <option
                      key={color}
                      value={color}
                      disabled={color === teamColorA}
                    >
                      {color}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-gray-50 p-5">
            <div className="mb-2 text-sm font-bold text-gray-500">
              STATUS
            </div>

            <div className="text-lg font-semibold">
              {status}
            </div>
          </div>

          {!listening ? (
            <button
              onClick={startListening}
              className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white"
            >
              🎙️ START LIVE TRANSCRIPTION
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="w-full rounded-lg bg-gray-800 px-6 py-4 text-lg font-bold text-white"
            >
              ⏹ STOP
            </button>
          )}

          <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-xs text-gray-600">
            Last realtime event:
            <span className="ml-2 font-mono font-bold">
              {lastRealtimeEvent || "Waiting..."}
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-500">
              LIVE CAPTION
            </div>

            <div className="min-h-20 rounded-lg border bg-gray-50 p-5 text-xl leading-relaxed">
              {liveText ||
                "Start speaking..."}
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-gray-500">
                LIVE EVENT TABLE
              </div>

              <div className="text-sm font-semibold">
                {events.length} event{events.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[850px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border-b p-3">#</th>
                    <th className="border-b p-3">Team</th>
                    <th className="border-b p-3">Event</th>
                    <th className="border-b p-3">Player</th>
                    <th className="border-b p-3">Assist</th>
                    <th className="border-b p-3">Confidence</th>
                    <th className="border-b p-3">Detected by</th>
                    <th className="border-b p-3">Review</th>
                  </tr>
                </thead>

                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-gray-500"
                      >
                        Events will appear here immediately.
                      </td>
                    </tr>
                  ) : (
                    events.map((event, index) => (
                      <tr key={event.id} className="border-b last:border-b-0">
                        <td className="p-3 font-semibold">
                          {index + 1}
                        </td>

                        <td className="p-3 font-bold">
                          {event.team_color || "—"}
                        </td>

                        <td className="p-3 font-semibold">
                          {event.event_type || "—"}
                        </td>

                        <td className="p-3">
                          {event.jersey_number !== null
                            ? `#${event.jersey_number}`
                            : "—"}
                        </td>

                        <td className="p-3">
                          {event.assist_jersey_number !== null
                            ? `#${event.assist_jersey_number}`
                            : "—"}
                        </td>

                        <td className="p-3">
                          {Math.round(event.confidence * 100)}%
                        </td>

                        <td className="p-3 font-semibold">
                          {event.detected_by}
                        </td>

                        <td className="p-3">
                          {event.manual_review ? (
                            <span className="font-bold text-amber-600">
                              ⚠️ REVIEW
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-500">
              TRANSCRIPT
            </div>

            <div className="min-h-40 rounded-lg border bg-white p-5 text-xl leading-relaxed">
              {transcript ||
                "Nothing captured yet..."}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
