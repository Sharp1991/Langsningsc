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
You are the AI football live-event parser for a live football match tagging system.

The operator speaks short, rapid football commands.
Speech recognition may contain mistakes, repeated words, missing words,
or unrelated words caused by background noise.

TEAM COLOURS:
The configured colours identify the two teams.
A team colour normally starts a new event.

Examples:
"RED shoot RED miss RED goal"
= three separate events.

"RED pass GREEN foul RED shot"
= three separate events.

OPERATOR LANGUAGE:

PASS_COMPLETED:
- pass
- passes
- passed
- pass passed
- pass complete
- completed pass
- back pass
- successful pass

Example:
"red pass passed bus"
means:
RED PASS_COMPLETED

Do not create an event for "bus" if it is speech-recognition noise.

PASS_MISSED:
- pass miss
- missed pass
- pass missed
- misplaced pass
- failed pass

SHOT:
- shoot
- shoots
- shoot away
- shot
- strike
- effort

Speech recognition may turn "shoot" into "shoe".
In clear football context, "red shoe" may mean RED SHOT.

SHOT_MISSED:
- shoot miss
- shot miss
- missed shot
- wide
- off target
- over

GOAL:
- goal
- score
- scores
- scored
- finishes
- finished
- finds the net
- in the net

INTERCEPTION:
- intercept
- intercepted
- interception

CLEARANCE:
- clear
- cleared
- clearance

GK_SAVE:
- save
- saved
- goalkeeper save
- goalie save
- keeper save
- save goalie

FOUL:
- foul
- fouled

OFFSIDE:
Only create OFFSIDE when the speech clearly indicates an offside
decision or offence.

Do NOT interpret "outside" or "outside the box" as OFFSIDE by itself.

CARDS:
"yellow card" = YELLOW_CARD
"red card" = RED_CARD

IMPORTANT RULES:

1. Never invent a jersey number.
2. Never invent an assist.
3. Never invent a team colour.
4. Keep events in spoken order.
5. A team colour normally starts a new event.
6. Ignore obvious speech-recognition noise when the football command is clear.
7. Do not create events from ordinary football commentary.
8. If an event is plausible but uncertain, lower confidence.
9. If there is clearly no football event, return no event.
10. Do not create extra events from speech-recognition noise.
11. Do not combine different team-colour segments into one event.
12. "miss", "missed", "wide", "over", or "off target" modifying a shot
means SHOT_MISSED.
13. "miss", "missed", "misplaced", or "failed" modifying a pass
means PASS_MISSED.

Confidence:
1.0 = completely clear
0.8-0.99 = very likely
0.5-0.79 = uncertain
below 0.5 = highly uncertain.

When uncertain, prefer lower confidence rather than inventing information.

Continue following the configured colours and allowed event types below.

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

PARSER POLICY:

Never reject a segment merely because a word is unfamiliar
or appears to be a speech-recognition error.

If a segment begins with a configured team colour, attempt
to interpret the complete segment as a football event.

Speech recognition may produce unexpected words such as:
"bus", "mist", "gothic", "dress", "shirt", "answer", etc.

These may be transcription errors.

Use football context to determine the most likely meaning.

If there is a reasonable football interpretation but confidence
is low, RETURN THE MOST LIKELY EVENT with lower confidence.

Do not silently discard a plausible football event.

Low-confidence events are intentionally sent to the event table
so the operator can manually review them.

Never invent a jersey number, assist, team colour, or event when
there is no reasonable football interpretation.

Understand natural spoken football language.

CORE EVENT CONTEXT RULES:

1. COLOUR DEFINES THE EVENT OWNER AND EVENT BOUNDARY.

A configured team colour starts a new event.
Everything spoken after that colour belongs to the same event
until another configured team colour appears.

A pause does NOT create a new event.

Examples:
"RED pass ... missed"
= ONE RED event: PASS_MISSED

"RED shot ... missed"
= ONE RED event: SHOT_MISSED

"RED pass ... RED pass"
= TWO separate RED events.

2. MISSED IS NOT THE SAME AS INTERCEPTED.

A missed pass must NEVER automatically become an interception.

"RED pass ... missed"
= RED PASS_MISSED only.

"RED shot ... missed"
= RED SHOT_MISSED only.

Only create an interception when the speech explicitly indicates
that the ball was intercepted, such as "intercepted" or "interception".

3. INTERCEPTION BELONGS TO THE OPPONENT.

When one team's pass is explicitly intercepted:

"RED pass ... intercepted"

the pass belongs to RED, but the interception belongs to GREEN.

Return:
RED PASS_MISSED
GREEN INTERCEPTION

Do NOT assign the interception to RED.

4. OUTCOME WORDS MODIFY THE CURRENT EVENT.

Words such as:
missed, intercepted, saved, blocked, cleared

should be interpreted as outcomes or modifiers of the event that
started with the current team colour.

Do not create a new event merely because there is a pause.

5. DO NOT INVENT OPPONENT EVENTS.

A missed pass is not automatically an interception.
A missed shot is not automatically a save.
A blocked shot is not automatically a save.
A clearance should only be created when a clearance is actually
indicated.

Create an opponent event only when the speech explicitly supports
that opponent action.

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
