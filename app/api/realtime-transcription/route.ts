import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST() {
  try {
    const session =
      await openai.realtime.clientSecrets.create({
        session: {
          type: "transcription",
          audio: {
            input: {
              transcription: {
                model: "gpt-live-transcribe",
                language: "en",
              },
            },
          },
        },
      });

    return NextResponse.json({
      client_secret: session.value,
      session: session.session,
    });
  } catch (error) {
    console.error(
      "Realtime client secret error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create realtime client secret.",
      },
      {
        status: 500,
      }
    );
  }
}
