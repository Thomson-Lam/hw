import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchSessions, RoadSummary } from "./api";
import { C, F, Mountains, T, Window } from "./hw";

const PIPE: Record<RoadSummary["pipe"], string> = { finance: "Money futures", explore: "Choices", concept: "Lesson", find: "Finding", intro: "Not started" };

function when(ms: number) {
  const d = new Date(ms), now = new Date();
  const time = d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return days === 0 ? `Today ${time}` : days === 1 ? `Yesterday ${time}` : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function PastRoads({ open, back }: { open: (sessionId: string) => void; back: () => void }) {
  const insets = useSafeAreaInsets();
  const [roads, setRoads] = useState<RoadSummary[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetchSessions()
      .then(setRoads)
      .catch(() => setErr("Couldn’t load past roads."));
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Mountains />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          testID="past-roads-back"
          hitSlop={8}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            minHeight: 48,
            justifyContent: "center",
            paddingHorizontal: 14,
            borderRadius: 999,
            backgroundColor: "rgba(244,245,248,0.95)",
            borderWidth: 1,
            borderColor: C.border,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>← Home</Text>
        </Pressable>

        <Window title="Past roads" testID="your-roads" onClose={back}>
          {err ? <Text style={[T.p, { color: "#8a2b20" }]}>{err}</Text> : null}
          {!err && !roads.length ? <Text style={T.p}>No roads yet. Start one from home.</Text> : null}
          <View>
            {roads.map((r, i) => (
              <Pressable
                key={r.id}
                onPress={() => open(r.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open road: ${r.label}`}
                testID={`road-${i}`}
                style={({ pressed }) => [
                  { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#dfe2e6" },
                  pressed && { backgroundColor: "#e6e8eb" },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: F.head, fontSize: 16, lineHeight: 24, color: C.ink }}>
                    {r.label.charAt(0).toUpperCase() + r.label.slice(1)}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>
                    {PIPE[r.pipe]} · {r.stops} {r.stops === 1 ? "stop" : "stops"} · {when(r.created_at)}
                  </Text>
                </View>
                <Text style={{ fontFamily: F.body, fontSize: 20, color: C.sub }}>›</Text>
              </Pressable>
            ))}
          </View>
        </Window>
      </ScrollView>
    </View>
  );
}
