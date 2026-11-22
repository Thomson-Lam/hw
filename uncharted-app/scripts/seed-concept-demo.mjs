// Adds a sample "how do LLMs work" road (storyboard, dial, flashcards) to the local database,
// so the concept widgets can be tried before the concept agent exists. Open it from "Your roads".
// Usage (from uncharted-app/): node scripts/seed-concept-demo.mjs
import { randomUUID as id } from "node:crypto";
import { openDb } from "../server/db.mjs";
const db = openDb(process.env.UNCHARTED_DB ?? new URL("../uncharted.sqlite", import.meta.url).pathname);
const now = Date.now();
const sid = id();
db.prepare("INSERT INTO sessions (id,seed_json,created_at) VALUES (?,?,?)").run(sid, JSON.stringify({ label: "how do LLMs work", rules: [{ kind: "set", key: "goal", value: "how do LLMs work" }] }), now);
const els = [
  { type: "ask", prompt: "Where do you want to go?", placeholder: "", examples: [] },
  { type: "story", title: "What happens when you send a message", steps: [
    { caption: "Your sentence is cut into tokens: small pieces of words.", viz: { kind: "chips", items: ["The", " cat", " sat", " on", " the"] } },
    { caption: "Each token becomes a list of numbers that captures its meaning.", viz: { kind: "flow", items: ["cat", "[0.21, -0.7, …]", "meaning"] } },
    { caption: "Attention lets each token look at the others. Here “cat” matters most for what comes next.", viz: { kind: "chips", items: ["The", " cat", " sat", " on", " the"], highlight: [1] } },
    { caption: "The model scores every possible next token and picks one.", viz: { kind: "bars", unit: "%", items: [{ label: "mat", value: 62 }, { label: "floor", value: 18 }, { label: "sofa", value: 11 }, { label: "moon", value: 1 }] } },
  ] },
  { type: "dial", title: "Temperature: how adventurous the next word is", prompt: "Drag the knob and watch the odds for “The cat sat on the ___”.", knob: { label: "Temperature", min: 0, max: 2, step: 0.1 }, frames: [
    { at: 0, caption: "At 0 it always picks the top word: predictable, sometimes dull.", viz: { kind: "bars", unit: "%", items: [{ label: "mat", value: 100 }, { label: "floor", value: 0 }, { label: "sofa", value: 0 }, { label: "moon", value: 0 }] } },
    { at: 1, caption: "At 1 it samples by the model's own odds: the usual setting.", viz: { kind: "bars", unit: "%", items: [{ label: "mat", value: 62 }, { label: "floor", value: 18 }, { label: "sofa", value: 11 }, { label: "moon", value: 1 }] } },
    { at: 2, caption: "At 2 the odds flatten: surprising, and more often wrong.", viz: { kind: "bars", unit: "%", items: [{ label: "mat", value: 34 }, { label: "floor", value: 24 }, { label: "sofa", value: 21 }, { label: "moon", value: 9 }] } },
  ] },
  { type: "deck", title: "Remember these", cards: [
    "An LLM predicts the next token, one at a time.",
    "Tokens are pieces of words, not whole words.",
    "Attention decides which earlier tokens matter most.",
    "Temperature controls how random the next pick is.",
    "Training means adjusting billions of numbers to predict text better.",
  ] },
  { type: "story", title: "How training works", steps: [{ caption: "The model guesses the next token in real text, then nudges its numbers toward the right answer.", viz: { kind: "flow", items: ["guess", "compare", "nudge"] } }] },
];
let parent = null;
els.forEach((el, depth) => {
  const nid = id();
  db.prepare("INSERT INTO nodes (id,session_id,parent_id,option_index,depth,state,status,source,element_json,message,context_json,created_at,ready_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(nid, sid, parent, null, depth, "taken", "ready", depth ? "agent" : "fixed", JSON.stringify(el), depth ? "" : "Your words from the title screen.", "{}", now + depth, now + depth);
  if (depth === 0) db.prepare("INSERT INTO answers (id,node_id,label,option_index,value_json,created_at) VALUES (?,?,?,?,?,?)").run(id(), nid, "how do LLMs work", null, "null", now);
  parent = nid;
});
console.log(`Added "how do LLMs work" (${sid}). Open it from Your roads on the home screen.`);
