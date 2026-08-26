import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EVENT_TYPES = [
  "PASS_COMPLETED",
  "PASS_MISSED",
  "CLEARANCE",
  "INTERCEPTION",
  "SHOT",
  "SHOT_ON_TARGET",
  "SHOT_MISSED",
  "GOAL",
  "PENALTY",
  "CORNER",
  "OFFSIDE",
  "FOUL",
  "YELLOW_CARD",
  "RED_CARD",
  "SUBSTITUTION",
  "INJURY",
  "GK_SAVE",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

type ParsedEvent = {
  team_color: string | null;
  event_type: EventType | null;
  jersey_number: number | null;
  assist_jersey_number: number | null;
  confidence: number;
};

function normalizeColor(value: string) {
  return value.trim().toUpperCase();
}

function getConfiguredColors(body: any): string[] {
  if (!Array.isArray(body.team_colors)) {
    return [];
  }

  return body.team_colors
    .filter(
      (value: unknown): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .map(normalizeColor);
}

function findTeamColor(
  text: string,
  colors: string[]
): string | null {
  const lower = text.toLowerCase();

  for (const color of colors) {
    const escaped = color
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = new RegExp(
      `\\b${escaped}\\b`,
      "i"
    );

    if (pattern.test(lower)) {
      return color;
    }
  }

  return null;
}

function findNumberAfter(
  text: string,
  patterns: RegExp[]
): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const number = Number(match[1]);

      if (
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 99
      ) {
        return number;
      }
    }
  }

  return null;
}

function parseFast(
  text: string,
  colors: string[]
): ParsedEvent[] | null {
  const normalized = text
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return [];
  }

  const teamColor =
    findTeamColor(normalized, colors);

  /*
   * No configured team colour means the
   * fast parser cannot safely identify the team.
   */
  if (!teamColor) {
    return null;
  }

  /*
   * Player number:
   *
   * "number 5"
   * "no 5"
   * "number five" is intentionally not handled
   * here yet; GPT can handle natural number words.
   */
  const jerseyNumber =
    findNumberAfter(normalized, [
      /\bnumber\s+(\d{1,2})\b/i,
      /\bno\.?\s*(\d{1,2})\b/i,
      /\bplayer\s+(\d{1,2})\b/i,
    ]);

  const assistJerseyNumber =
    findNumberAfter(normalized, [
      /\bassist\s+(?:number\s+|no\.?\s*)?(\d{1,2})\b/i,
      /\bassisted\s+by\s+(?:number\s+|no\.?\s*)?(\d{1,2})\b/i,
    ]);

  /*
   * Goal must be checked before generic "shot".
   */
  if (
    /\b(score|scores|scored|goal|goals|finish|finishes|finished|net)\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "GOAL",
        jersey_number: jerseyNumber,
        assist_jersey_number:
          assistJerseyNumber,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(pass|passes|passed|passing)\b/i.test(
      normalized
    )
  ) {
    if (
      /\b(missed|misses|misplaced|failed)\b/i.test(
        normalized
      )
    ) {
      return [
        {
          team_color: teamColor,
          event_type: "PASS_MISSED",
          jersey_number: jerseyNumber,
          assist_jersey_number: null,
          confidence: 1,
        },
      ];
    }

    return [
      {
        team_color: teamColor,
        event_type: "PASS_COMPLETED",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(shot|shoot|shoots|shot\s+away)\b/i.test(
      normalized
    )
  ) {
    if (
      /\b(on\s+target|saved|save)\b/i.test(
        normalized
      )
    ) {
      return [
        {
          team_color: teamColor,
          event_type: "SHOT_ON_TARGET",
          jersey_number: jerseyNumber,
          assist_jersey_number: null,
          confidence: 1,
        },
      ];
    }

    if (
      /\b(missed|misses|wide|over|off\s+target)\b/i.test(
        normalized
      )
    ) {
      return [
        {
          team_color: teamColor,
          event_type: "SHOT_MISSED",
          jersey_number: jerseyNumber,
          assist_jersey_number: null,
          confidence: 1,
        },
      ];
    }

    return [
      {
        team_color: teamColor,
        event_type: "SHOT",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(corner|corners)\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "CORNER",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(interception|intercepted)\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "INTERCEPTION",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(clearance|cleared)\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "CLEARANCE",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\b(offside)\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "OFFSIDE",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\bfoul\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "FOUL",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\byellow\s+card\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "YELLOW_CARD",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\bred\s+card\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "RED_CARD",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  if (
    /\bpenalty\b/i.test(
      normalized
    )
  ) {
    return [
      {
        team_color: teamColor,
        event_type: "PENALTY",
        jersey_number: jerseyNumber,
        assist_jersey_number: null,
        confidence: 1,
      },
    ];
  }

  /*
   * null means:
   * "The fast parser doesn't know safely."
   *
   * This is deliberately different from []:
   *
   * [] = clearly not a football event
   * null = send to GPT
   */
  return null;
}

async function parseWithGPT(
  text: string,
  colors: string[]
): Promise<ParsedEvent[]> {
  const allowedColors =
    colors.length > 0
      ? colors.join(", ")
      : "No configured colours";

  const response =
    await openai.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "system",

          content: `
You are a football live-event parser.

Convert spoken football commentary into one or more structured football events.

The currently configured team colour aliases are:

${allowedColors}

IMPORTANT:
Only use one of the configured colours above.
Do not invent team colours.

The colours are aliases selected by the operator.
They identify teams in the current match.

Jersey numbers identify players.
Never invent player IDs.

A transcript can contain multiple football commands.

For example:

"red pass, red shoot, red score"

must produce:

1. RED PASS_COMPLETED
2. RED SHOT
3. RED GOAL

Keep events in spoken order.

Another example:

"red number 5 scores, assist number 6"

is ONE event:

RED GOAL
jersey 5
assist jersey 6

Understand natural spoken football language.

Allowed event types:

${EVENT_TYPES.join("\n")}

If the speech is clearly not a football event:

{
  "events": []
}

If the speech is football-related but ambiguous, lower confidence.

Confidence rules:

1.0 = completely clear
0.8-0.99 = very likely
0.5-0.79 = uncertain
below 0.5 = highly uncertain

Return ONLY valid JSON:

{
  "events": [
    {
      "team_color": "CONFIGURED_COLOUR" | null,
      "event_type": "EVENT_TYPE" | null,
      "jersey_number": number | null,
      "assist_jersey_number": number | null,
      "confidence": number
    }
  ]
}

Do not add explanations.
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

  const output =
    response.output_text?.trim();

  if (!output) {
    throw new Error(
      "Parser returned empty output."
    );
  }

  const parsed =
    JSON.parse(output);

  if (
    !parsed ||
    !Array.isArray(parsed.events)
  ) {
    throw new Error(
      "Parser returned invalid event list."
    );
  }

  return parsed.events;
}

function needsManualReview(
  events: ParsedEvent[]
): boolean {
  if (!events.length) {
    return false;
  }

  return events.some(
    (event) =>
      !event.team_color ||
      !event.event_type ||
      event.confidence < 0.8
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const text =
      body.text;

    if (
      !text ||
      typeof text !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "No text provided.",
        },
        {
          status: 400,
        }
      );
    }

    const teamColors =
      getConfiguredColors(body);

    /*
     * STEP 1
     *
     * Try the fast local parser.
     */
    const fastResult =
      parseFast(
        text,
        teamColors
      );

    let events: ParsedEvent[];
    let parserSource:
      | "fast"
      | "gpt"
      | "none";

    /*
     * Fast parser succeeded.
     */
    if (fastResult !== null) {
      events = fastResult;
      parserSource =
        events.length > 0
          ? "fast"
          : "none";
    }

    /*
     * STEP 2
     *
     * Fast parser is uncertain.
     * Send the transcript to GPT.
     */
    else {
      try {
        events =
          await parseWithGPT(
            text,
            teamColors
          );

        parserSource = "gpt";
      } catch (error) {
        console.error(
          "GPT parser error:",
          error
        );

        return NextResponse.json(
          {
            error:
              "AI parsing failed.",
            events: [],
            parser_source: "gpt",
            manual_review: true,
          },
          {
            status: 500,
          }
        );
      }
    }

    const manualReview =
      needsManualReview(events);

    const first =
      events[0] ?? null;

    return NextResponse.json({
      events,

      /*
       * Temporary compatibility fields
       * for the existing live page.
       */
      team_color:
        first?.team_color ??
        null,

      event_type:
        first?.event_type ??
        null,

      jersey_number:
        first?.jersey_number ??
        null,

      assist_jersey_number:
        first?.assist_jersey_number ??
        null,

      confidence:
        typeof first?.confidence ===
        "number"
          ? first.confidence
          : 0,

      parser_source:
        parserSource,

      manual_review:
        manualReview,
    });
  } catch (error) {
    console.error(
      "Event parser error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Event parsing failed.",
        events: [],
        manual_review: true,
      },
      {
        status: 500,
      }
    );
  }
}
