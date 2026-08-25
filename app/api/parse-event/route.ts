import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "No text provided." },
        { status: 400 }
      );
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "system",

          content: `
You are a football live-event parser.

Convert spoken football commentary into ONE OR MORE structured football events.

Teams are identified ONLY by colour:

RED
GREEN
PINK

These colours are aliases selected by the operator.
They do NOT represent specific club names.

The match clock is supplied separately by the live logger.
Never invent a match time.

Jersey numbers identify players.
Never invent player IDs.

IMPORTANT:
A transcript can contain multiple football commands.

For example:

"red pass, red shoot, red score"

must produce THREE separate events in the same spoken order:

1. RED PASS_COMPLETED
2. RED SHOT
3. RED GOAL

Do NOT discard earlier events.

Another example:

"red number 5 scores, assist number 6"

is ONE event:

RED GOAL
jersey 5
assist jersey 6

Understand natural speech such as:

"red pass"
"red shoot"
"red shot"
"red missed"
"red score"
"red goal"
"red number 5 scores"
"red number 5 scores assist number 6"
"green no 8 yellow"
"pink number 10 shoots on target"
"red corner"
"pink offside number 9"

Allowed event types:

PASS_COMPLETED
PASS_MISSED
CLEARANCE
INTERCEPTION
SHOT
SHOT_ON_TARGET
SHOT_MISSED
GOAL
PENALTY
CORNER
OFFSIDE
FOUL
YELLOW_CARD
RED_CARD
SUBSTITUTION
INJURY
GK_SAVE

Return ONLY valid JSON.

Return exactly:

{
  "events": [
    {
      "team_color": "RED" | "GREEN" | "PINK" | null,
      "event_type": "EVENT_TYPE" | null,
      "jersey_number": number | null,
      "assist_jersey_number": number | null,
      "confidence": number
    }
  ]
}

Events must be in chronological spoken order.

If the speech is not clearly a football event, return:

{
  "events": []
}

confidence must be between 0 and 1.

Do not add explanations.
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    const output = response.output_text?.trim();

    if (!output) {
      return NextResponse.json(
        { error: "Parser returned empty output." },
        { status: 500 }
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch {
      console.error(
        "Parser returned invalid JSON:",
        output
      );

      return NextResponse.json(
        { error: "Parser returned invalid JSON." },
        { status: 500 }
      );
    }

    if (
      !parsed ||
      !Array.isArray(parsed.events)
    ) {
      return NextResponse.json(
        { error: "Parser returned invalid event list." },
        { status: 500 }
      );
    }

    /*
     * Keep the old fields temporarily.
     * The current live page can still display the
     * first event while we build the multi-event queue.
     */

    const first = parsed.events[0] ?? null;

    return NextResponse.json({
      events: parsed.events,

      team_color:
        first?.team_color ?? null,

      event_type:
        first?.event_type ?? null,

      jersey_number:
        first?.jersey_number ?? null,

      assist_jersey_number:
        first?.assist_jersey_number ?? null,

      confidence:
        typeof first?.confidence === "number"
          ? first.confidence
          : 0,
    });

  } catch (error) {
    console.error(
      "Event parser error:",
      error
    );

    return NextResponse.json(
      { error: "Event parsing failed." },
      { status: 500 }
    );
  }
}
