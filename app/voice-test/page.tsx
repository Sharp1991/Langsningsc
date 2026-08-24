"use client";

import { useRef, useState } from "react";

export default function VoiceTestPage() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [text, setText] = useState("");

  async function startRecording() {
    try {
      setText("");
      setStatus("Requesting microphone...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(
          chunksRef.current,
          { type: recorder.mimeType }
        );

        setStatus("Sending audio for transcription...");

        const formData = new FormData();

        formData.append(
          "audio",
          audioBlob,
          "voice.webm"
        );

        try {
          const response = await fetch(
            "/api/transcribe",
            {
              method: "POST",
              body: formData,
            }
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.error || "Transcription failed"
            );
          }

          setText(result.text || "");
          setStatus("Transcription complete.");
        } catch (error) {
          console.error(error);
          setStatus("Transcription failed.");
        }
      };

      mediaRecorderRef.current = recorder;

      recorder.start();

      setRecording(true);
      setStatus("● Recording...");

    } catch (error) {
      console.error(error);
      setStatus(
        "Microphone permission was denied or unavailable."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setStatus("Processing...");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="mx-auto max-w-xl">

        <h1 className="mb-6 text-3xl font-bold">
          🎙️ Langsning Voice Test
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

          {!recording ? (
            <button
              onClick={startRecording}
              className="w-full rounded-lg bg-red-600 px-6 py-4 text-lg font-bold text-white"
            >
              🎙️ START RECORDING
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-full rounded-lg bg-gray-800 px-6 py-4 text-lg font-bold text-white"
            >
              ⏹ STOP RECORDING
            </button>
          )}

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-500">
              TRANSCRIPTION
            </div>

            <div className="min-h-24 rounded-lg border p-4 text-xl">
              {text || "Nothing yet..."}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
