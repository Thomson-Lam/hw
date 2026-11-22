import Constants from "expo-constants";
import { Platform } from "react-native";
import { Element, Rule } from "./contract";

const host = Platform.OS === "web" ? globalThis.location?.hostname : Constants.expoConfig?.hostUri?.split(":")[0];
export const API = `http://${host ?? "localhost"}:8787`;

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(API + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error ?? `${path} ${res.status}`);
  return j;
}
const get = async <T,>(path: string): Promise<T> => (await fetch(API + path)).json();

export type Seed = { label: string; rules: Rule[] } | null;
export type RuleView = { id: string; text: string; key: string };
export type NodeView = { id: string; element: Element; message: string; source: "agent" | "sim" | "fixed" | "fallback"; blocks: boolean; answer: { label: string; option_index: number | null; rules: RuleView[] } | null };
export type Road = { session_id: string; trip: { pipe: "intro" | "explore" | "finance" | "concept" | "find"; goal: string; scenario: string | null }; paving: boolean; stopped: string | null; rules: RuleView[]; nodes: NodeView[]; log: string };

// What a pick sends. The server turns it into rules, so the client never writes a rule itself.
export type AnswerPayload = { option_index: number } | { value: number } | { verdict: "save" } | { verdict: "skip" } | { verdict: "nope"; tag: string } | { text: string } | { verdict: "done" | "remind" | "not_now" };

export const startSession = (seed: Seed) => post<Road>("/api/session", { seed });
export const fetchRoad = (sid: string) => get<Road>(`/api/session/${sid}/road`);
export const sendAnswer = (sid: string, nid: string, p: AnswerPayload) => post<Road>(`/api/node/${nid}/answer`, { session_id: sid, ...p });
export const sendChange = (sid: string, nid: string) => post<Road>(`/api/node/${nid}/change`, { session_id: sid });
export const sendRetry = (sid: string, nid: string) => post<Road>(`/api/node/${nid}/retry`, { session_id: sid });
export const sendErase = (sid: string, rid: string) => post<Road>(`/api/rule/${rid}/erase`, { session_id: sid });

// Every node the server made for this session, including paths not taken. See server/tree.mjs → tree().
export type TreeNode = {
  id: string; parent_id: string | null; option_index: number | null; depth: number;
  state: "taken" | "speculative" | "not_taken" | "stale"; status: "pending" | "ready";
  source: NodeView["source"] | null; element: Element | null; message: string | null;
  answer: { label: string; option_index: number | null } | null;
  seen?: boolean; // was on the person's road at some point (not just pre-built)
};
export const fetchTree = (sid: string) => get<TreeNode[]>(`/api/session/${sid}/tree`);

export type Persona = { name: string; income: number; essentials: number; savings: number; saving: number; ei: boolean };
export type Meta = { personas: Record<string, Persona>; scenarios: Record<string, { kind: string; label: string; chip: string }> };
export const fetchMeta = () => post<Meta>("/api/meta");

// Prior roads for the home screen (server/tree.mjs → sessions()).
export type RoadSummary = { id: string; label: string; created_at: number; pipe: "intro" | "explore" | "finance" | "concept" | "find"; stops: number };
export const fetchSessions = () => get<RoadSummary[]>("/api/sessions");
