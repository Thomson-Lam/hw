import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rule } from "./contract";
import { C, F, Mountains, Pill, T, Window } from "./hw";
import { post, Seed } from "./api";

export function Title({ go }: { go: (seed: Seed) => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    const goal = text.trim();
    if (!goal) return;
    try {
      const r = await post<{ pipe: "explore" | "finance"; scenario: string | null; kind?: string }>("/api/route", { goal });
      const rules: Rule[] = r.pipe === "explore"
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
        <Window title="You have a message">
          <Text style={T.h}>Where do you want to go?</Text>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={submit} placeholder="a goal, a worry, or a dare" placeholderTextColor={C.faint} testID="goal-input" returnKeyType="go"
            style={{ fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: "#fff", borderWidth: 1, borderColor: "#b9bcc2", borderRadius: 10, paddingHorizontal: 12, minHeight: 48 }} />
          <Pill label="Start the road" onPress={submit} testID="start" />
          <Pill label="Just explore" onPress={() => go(null)} testID="just-explore" />
          {err ? <Text style={[T.p, { color: "#8a2b20" }]}>{err}</Text> : null}
        </Window>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
