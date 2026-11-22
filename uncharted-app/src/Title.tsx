import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rule } from "./contract";
import { C, F, Mountains, Pill, T, Window } from "./hw";
import { fetchSessions, post, RoadSummary, Seed } from "./api";

const PIPE: Record<RoadSummary["pipe"], string> = { finance: "Money futures", explore: "Choices", concept: "Lesson", find: "Finding", intro: "Not started" };
// The demo path. Each chip maps straight to a scenario, so it works even when the Gemini router is down.
const CHIPS = [
  { label: "Prices keep rising", scenario: "inflation" },
  { label: "My rent is going up", scenario: "rent_spike" },
  { label: "Layoffs in my field", scenario: "layoff" },
  { label: "My hours got cut", scenario: "hours_cut" },
];
function when(ms: number) {
  const d = new Date(ms), now = new Date();
  const time = d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return days === 0 ? `Today ${time}` : days === 1 ? `Yesterday ${time}` : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function Title({ go, open }: { go: (seed: Seed) => void; open: (sessionId: string) => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [roads, setRoads] = useState<RoadSummary[]>([]);
  const [all, setAll] = useState(false);
  useEffect(() => { fetchSessions().then(setRoads).catch(() => {}); }, []);
  const shownRoads = all ? roads : roads.slice(0, 4);
  // Chips: the money road straight away (the demo path, works even when the Gemini router is down).
  const worry = (label: string, scenario: string | null) =>
    go({ label, rules: [{ kind: "set", key: "kind", value: "worry" }, ...(scenario ? [{ kind: "set", key: "scenario", value: scenario } as Rule] : [])] });
  // Free text: the server's router (Gemini Decisions API) picks the road: money futures, lesson, finding, or choices.
  const submit = async () => {
    const goal = text.trim();
    if (!goal) return;
    setErr("");
    try {
      const r = await post<{ pipe: "explore" | "finance" | "concept" | "find"; mode?: "find" | "make"; scenario: string | null; kind?: string }>("/api/route", { goal });
      const rules: Rule[] = r.pipe === "concept"
        ? [{ kind: "set", key: "concept", value: goal }]
        : r.pipe === "find"
        ? [{ kind: "set", key: "find", value: goal }, { kind: "set", key: "mode", value: r.mode ?? "find" }]
        : r.pipe === "explore"
        ? [{ kind: "set", key: "goal", value: goal }]
        : [{ kind: "set", key: "kind", value: r.kind ?? "worry" }, ...(r.scenario ? [{ kind: "set", key: "scenario", value: r.scenario } as Rule] : [])];
      go({ label: goal, rules });
    } catch { setErr("Road server not reachable. Start it with: node server/server.mjs"); }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Mountains />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, gap: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: F.head, fontSize: 48, lineHeight: 52, color: "#fff", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 12 }}>Uncharted</Text>
        <Text style={{ fontFamily: F.body, fontSize: 18, lineHeight: 25, color: "#fff", textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 10 }} testID="purpose">Money news got to you? See your own futures at their real odds, and what $25 a week would change.</Text>
        {roads.length ? (
          <Window title="Your roads" testID="your-roads">
            <View>
              {shownRoads.map((r, i) => (
                <Pressable key={r.id} onPress={() => open(r.id)} accessibilityRole="button" accessibilityLabel={`Open road: ${r.label}`} testID={`road-${i}`}
                  style={({ pressed }) => [{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#dfe2e6" }, pressed && { backgroundColor: "#e6e8eb" }]}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: F.head, fontSize: 16, lineHeight: 24, color: C.ink }}>{r.label.charAt(0).toUpperCase() + r.label.slice(1)}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>{PIPE[r.pipe]} · {r.stops} {r.stops === 1 ? "stop" : "stops"} · {when(r.created_at)}</Text>
                  </View>
                  <Text style={{ fontFamily: F.body, fontSize: 20, color: C.sub }}>›</Text>
                </Pressable>
              ))}
            </View>
            {roads.length > 4 ? (
              <Pressable onPress={() => setAll(!all)} accessibilityRole="button" testID="roads-all" style={{ minHeight: 48, justifyContent: "center" }}>
                <Text style={[T.link, { paddingVertical: 0 }]}>{all ? "Show fewer" : `Show all ${roads.length} roads`}</Text>
              </Pressable>
            ) : null}
          </Window>
        ) : null}
        <Window title="New road">
          <Text style={T.h}>What money news is stressing you out?</Text>
          <View style={{ gap: 12 }}>
            {CHIPS.map((c) => <Pill key={c.scenario} label={c.label} testID={`chip-${c.scenario}`} onPress={() => worry(c.label, c.scenario)} />)}
          </View>
          <Text style={T.k}>Or type anything</Text>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={submit} placeholder="a headline, a goal, or something to learn" placeholderTextColor={C.faint} testID="goal-input" returnKeyType="go"
            style={{ fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: "#fff", borderWidth: 1, borderColor: "#b9bcc2", borderRadius: 10, paddingHorizontal: 12, minHeight: 48 }} />
          {text.trim() ? <Pill label="Start the road" onPress={submit} testID="start" /> : null}
          {err ? <Text style={[T.p, { color: "#8a2b20" }]}>{err}</Text> : null}
          <Text style={[T.p, { fontSize: 13 }]}>Sample numbers, simulated futures. Educational, not financial advice.</Text>
        </Window>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
