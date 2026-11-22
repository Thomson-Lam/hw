import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rule } from "./contract";
import { C, F, Folder, Mountains, Pill, T, Window } from "./hw";
import { fetchSessions, post, Seed } from "./api";

// The demo path. Each chip maps straight to a scenario, so it works even when the Gemini router is down.
const CHIPS = [
  { label: "Prices keep rising", scenario: "inflation" },
  { label: "My rent is going up", scenario: "rent_spike" },
  { label: "Layoffs in my field", scenario: "layoff" },
  { label: "My hours got cut", scenario: "hours_cut" },
];

export function Title({ go, onPast }: { go: (seed: Seed) => void; onPast: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [hasRoads, setHasRoads] = useState(false);
  useEffect(() => { fetchSessions().then((r) => setHasRoads(r.length > 0)).catch(() => {}); }, []);
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
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand owns the sky. Tight pair, then open mountain before the desk. */}
        <View style={{ gap: 8, marginBottom: 48 }}>
          <Text style={{ fontFamily: F.head, fontSize: 52, lineHeight: 56, color: "#fff", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 12 }}>
            Uncharted
          </Text>
          <Text
            style={{ fontFamily: F.body, fontSize: 16, lineHeight: 22, color: "rgba(255,255,255,0.88)", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 8, maxWidth: 400 }}
            testID="purpose"
          >
            Tell us what’s stressing you about finances. See how the next five years could go, and what a small weekly buffer would change.
          </Text>
        </View>

        <View style={{ flexGrow: 1, minHeight: 24 }} />

        {/* Desk: past-roads folder, then the primary New road window. */}
        <View style={{ gap: 24 }}>
          {hasRoads ? <Folder label="Past roads" onPress={onPast} testID="roads-folder" /> : null}

          <Window title="New road">
            <Text style={T.h}>What money news is stressing you out?</Text>
            <View style={{ gap: 12 }}>
              {CHIPS.map((c) => <Pill key={c.scenario} label={c.label} testID={`chip-${c.scenario}`} onPress={() => worry(c.label, c.scenario)} />)}
            </View>
            <Text style={T.k}>Or type anything</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={submit}
              placeholder="a headline, a goal, or something to learn"
              placeholderTextColor={C.faint}
              testID="goal-input"
              returnKeyType="go"
              style={{ fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: "#fff", borderWidth: 1, borderColor: "#b9bcc2", borderRadius: 10, paddingHorizontal: 12, minHeight: 48 }}
            />
            {text.trim() ? <Pill label="Start the road" onPress={submit} testID="start" /> : null}
            {err ? <Text style={[T.p, { color: "#8a2b20" }]}>{err}</Text> : null}
          </Window>
        </View>

        <Text
          style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 32, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6 }}
          testID="home-disclaimer"
        >
          Simulated outcomes. An educational tool, not financial advice. Nothing moves money.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
