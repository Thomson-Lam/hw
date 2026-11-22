// Picks the road for what someone typed, with the Gemini Decisions API (gemini-decision-1).
// Benchmarked in scripts/bench-route.mjs: 98% on 40 labeled queries, about 0.3 s.
//   concept     -> lesson road (story, dial, flashcards; few forks)
//   goal        -> choice road (the explore pipeline)
//   money_worry -> money futures simulator (Canada Life track)
// If the API is slow or down, a keyword fallback answers so the title screen never hangs.
const BASE = process.env.UNCHARTED_GEMINI_BASE ?? "https://generativelanguage.googleapis.com";
let KEY = "";
export const setRouteKey = (k) => { KEY = k; };

export const ROAD_CRITERIA = {
  concept: "They want to understand or learn about a topic, an idea, or how something works. They want an explanation, not a plan for their life.",
  goal: "They want to do, achieve, get good at, choose, decide or plan something in their own life: a move, a skill, a project, a purchase, a hobby, a trip, quitting to travel, going back to school.",
  money_worry: "They are worried or uncertain about their own money or financial future: losing income or a job, hours cut, rent or prices rising, not saving enough, debt, whether they can afford something.",
};
export const ROAD_QUESTION = "A person typed this into an app that builds a step-by-step road for them. What kind of road do they want?";

// Second question in the same request, used when the road is a goal.
export const GOAL_CRITERIA = {
  find: "They want to find or buy something: a product, gear, a tool, a place or a service (e.g. find me headphones, a beginner bike, a laptop).",
  make: "They want to make, build or create something themselves (e.g. make a podcast, build a bookshelf, make an app).",
  do: "They want to do, decide, change or get good at something in their life (e.g. move to another country, run a marathon, learn guitar).",
};
export const GOAL_QUESTION = "If this is a goal, which kind of goal is it?";

const MONEY = /\b(sav(e|ing)|money|debt|rent|layoff|laid off|fired|lose my job|hours|inflation|prices?|afford|paycheque|paycheck|broke|bills)\b|\$/i;
const CONCEPT = /^(how|what|why|explain|teach|who|when)\b|\b(basics|explained|work\??)$/i;
function fallback(text) {
  if (MONEY.test(text)) return "money_worry";
  if (CONCEPT.test(text.trim())) return "concept";
  return "goal";
}

export async function classifyRoad(text) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/v1beta/decisions`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ model: "gemini-decision-1", input: text, questions: {
        road: { type: "choice", instructions: ROAD_QUESTION, criteria: ROAD_CRITERIA },
        goal_kind: { type: "choice", instructions: GOAL_QUESTION, criteria: GOAL_CRITERIA },
      } }),
      signal: AbortSignal.timeout(2500),
    });
    const j = await res.json().catch(() => ({}));
    const a = j.answers?.road;
    if (!res.ok || !a?.choice || !(a.choice in ROAD_CRITERIA)) throw new Error(j.error?.message ?? `http ${res.status}`);
    const g = j.answers?.goal_kind;
    return { road: a.choice, confidence: a.confidence ?? null, probabilities: a.probabilities ?? null, goal_kind: g?.choice in GOAL_CRITERIA ? g.choice : "do", goal_confidence: g?.confidence ?? null, via: "decisions", ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { road: fallback(text), confidence: null, probabilities: null, goal_kind: /\b(find|buy|best|recommend|which)\b/i.test(text) ? "find" : /\b(make|build|create|diy)\b/i.test(text) ? "make" : "do", via: "fallback", error: String(e.message ?? e), ms: Math.round(performance.now() - t0) };
  }
}
