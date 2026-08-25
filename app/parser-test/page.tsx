"use client";

import { useState } from "react";

export default function ParserTestPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function parseEvent() {
    if (!text.trim()) return;

    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/parse-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Parser failed"
        );
      }

      setResult(
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error(error);

      setResult("Parser failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-3xl font-bold">
          ⚽ Event Parser Test
        </h1>

        <div className="rounded-xl bg-white p-6 shadow">

          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Describe what happened..."
            className="mb-4 min-h-32 w-full rounded-lg border p-4 text-lg"
          />

          <button
            onClick={parseEvent}
            disabled={loading}
            className="w-full rounded-lg bg-black px-6 py-4 text-lg font-bold text-white disabled:opacity-50"
          >
            {loading
              ? "Parsing..."
              : "PARSE EVENT"}
          </button>

          <div className="mt-6">
            <div className="mb-2 text-sm font-bold text-gray-500">
              PARSED RESULT
            </div>

            <pre className="min-h-32 overflow-auto rounded-lg bg-gray-50 p-4">
              {result || "Nothing yet..."}
            </pre>
          </div>

        </div>
      </div>
    </main>
  );
}
