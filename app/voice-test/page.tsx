"use client";

import { useEffect, useRef, useState } from "react";

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: unknown;
  [key: string]: unknown;
};

export default function VoiceTestPage() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [transcript, setTranscript] = useState("");
  const [liveText, setLiveText] = useState("");

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

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
            "OpenAI realtime event:",
            message
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

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-500">
              LIVE CAPTION
            </div>

            <div className="min-h-20 rounded-lg border bg-gray-50 p-5 text-xl leading-relaxed">
              {liveText ||
                "Start speaking..."}
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
