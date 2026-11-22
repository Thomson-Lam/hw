// Find / make road widgets.
//   Compare  2-3 real listings (photo, price, store, why it fits); choose one to plan for
//   Kit      how to make it: steps, what to buy, the total
//   Savings  the simulator's answer: in how many of 5,000 futures you reach the price, per weekly amount
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { AnswerPayload } from "./api";
import { Element, Product, Segment, WebSource } from "./contract";
import { C, F, Pill, T, Window } from "./hw";

type Of<K extends Element["type"]> = Extract<Element, { type: K }>;
const cad = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

function Sources({ sources }: { sources?: WebSource[] }) {
  if (!sources?.length) return null;
  const names = [...new Set(sources.map((s) => (s.title ?? "").replace(/^www\./, "")).filter(Boolean))].slice(0, 4);
  return <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.sub }}>Found with Google Search{names.length ? `: ${names.join(", ")}` : ""}</Text>;
}

function Photo({ item, height }: { item: Product; height: number }) {
  if (!item.image) return null;
  return <Image source={{ uri: item.image }} style={{ width: "100%", height, borderRadius: 8, backgroundColor: "#fff" }} contentFit="contain" transition={200} accessibilityLabel={item.name} />;
}

function StoreLink({ item }: { item: Product }) {
  if (!item.url) return item.store ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>{item.store}</Text> : null;
  return (
    <Pressable onPress={() => Linking.openURL(item.url!)} accessibilityRole="link" hitSlop={8} style={{ minHeight: 32, justifyContent: "center" }}>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sel, textDecorationLine: "underline" }}>View at {item.store ?? "store"}</Text>
    </Pressable>
  );
}

export function Compare({ seg, answer, change }: { seg: Segment; answer: (p: AnswerPayload) => void; change: () => void }) {
  const e = seg.el as Of<"compare">;
  const chosen = seg.answer?.option_index ?? -1;
  return (
    <Window title="Real listings">
      <Text style={T.h2}>{e.title}</Text>
      <View style={{ gap: 12 }}>
        {e.items.map((it, i) => {
          const on = chosen === i, dim = chosen >= 0 && !on;
          return (
            <View key={i} testID={`compare-${i}`} style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? C.sel : "#d5d8dc", padding: 12, gap: 8, opacity: dim ? 0.55 : 1 }}>
              <Photo item={it} height={150} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: F.head, fontSize: 16, lineHeight: 22, color: C.ink }}>{on ? "✓ " : ""}{it.name}</Text>
                <Text style={{ fontFamily: F.head, fontSize: 18, lineHeight: 22, color: C.ink }}>{cad(it.price_cad)}</Text>
              </View>
              {it.why ? <Text style={[T.p, { color: C.ink }]}>{it.why}</Text> : null}
              {it.specs.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {it.specs.map((s) => <View key={s} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#b9bcc2", paddingHorizontal: 10, minHeight: 28, justifyContent: "center" }}><Text style={{ fontFamily: F.body, fontSize: 13, color: C.sub }}>{s}</Text></View>)}
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {chosen < 0 ? <Pill label="Plan for this one" testID={`choose-${i}`} onPress={() => answer({ option_index: i })} /> : <View />}
                <StoreLink item={it} />
              </View>
            </View>
          );
        })}
      </View>
      {e.note ? <Text style={T.p}>{e.note}</Text> : null}
      {chosen >= 0 ? (
        <Pressable onPress={change} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center" }} testID={`change-${seg.id}`}>
          <Text style={[T.link, { paddingVertical: 0 }]}>Choose a different one</Text>
        </Pressable>
      ) : null}
      <Sources sources={e.sources} />
    </Window>
  );
}

export function Kit({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"kit">;
  return (
    <Window title="Your plan to make it">
      <Text style={T.h2}>{e.title}</Text>
      <View style={{ gap: 8 }}>
        {e.steps.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.sel, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.head, fontSize: 13, color: "#fff" }}>{i + 1}</Text></View>
            <Text style={[T.p, { flex: 1, color: C.ink }]}>{s}</Text>
          </View>
        ))}
      </View>
      <Text style={[T.h2, { marginTop: 4 }]}>What to buy</Text>
      <View>
        {e.items.map((it, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#dfe2e6" }} testID={`kit-item-${i}`}>
            {it.image ? <Image source={{ uri: it.image }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#fff" }} contentFit="contain" /> : <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#e6e8eb" }} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{it.name}</Text>
              {it.why ? <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.sub }}>{it.why}</Text> : null}
              <StoreLink item={it} />
            </View>
            <Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>{cad(it.price_cad)}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: C.ink, paddingTop: 8 }}>
        <Text style={T.h2}>Total</Text>
        <Text style={T.h2} testID="kit-total">{cad(e.total)}</Text>
      </View>
      {e.note ? <Text style={T.p}>{e.note}</Text> : null}
      <Sources sources={e.sources} />
    </Window>
  );
}

export function Savings({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"savings">;
  const [why, setWhy] = useState(false);
  return (
    <Window title="Can you get there?">
      <Text style={T.h2}>{e.goal}: {cad(e.target)}</Text>
      <Text style={T.p}>{e.persona.split(",").slice(0, 2).join(",")} · within {e.horizon} months · {e.total.toLocaleString("en-CA")} simulated futures</Text>
      <View style={{ gap: 12 }}>
        {e.rows.map((r) => (
          <View key={r.weekly} style={{ gap: 4 }} testID={`odds-${r.weekly}`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{r.weekly ? `Put aside $${r.weekly} a week` : "Keep going as you are"}</Text>
              <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{Math.round((100 * r.reached) / e.total)}%</Text>
            </View>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: "#dfe2e6", overflow: "hidden" }}>
              <View style={{ height: 12, width: `${(100 * r.reached) / e.total}%`, borderRadius: 6, backgroundColor: C.sel }} />
            </View>
            <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>
              {r.reached.toLocaleString("en-CA")} of {e.total.toLocaleString("en-CA")} futures{r.month ? ` · usually by month ${r.month}` : ""}
            </Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center" }}>
        <Text style={[T.link, { paddingVertical: 0 }]}>{why ? "Hide" : "Show"} how this was worked out</Text>
      </Pressable>
      {why ? e.assumptions.map((a) => <Text key={a} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>· {a}</Text>) : null}
    </Window>
  );
}

// Money road result: what the person's decisions change, across the same 5,000 futures.
const OUTCOME = { fine: "Fine", rough_recovered: "Rough, recovered", hard: "Hard stretch" } as const;
function TallyRow({ label, t, total }: { label: string; t: { fine: number; rough_recovered: number; hard: number }; total: number }) {
  const pct = (n: number) => Math.round((100 * n) / total);
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{label}</Text>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: "#dfe2e6" }}>
        <View style={{ width: `${pct(t.fine)}%`, backgroundColor: C.sel }} />
        <View style={{ width: `${pct(t.rough_recovered)}%`, backgroundColor: "#7d8794" }} />
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>● Fine {t.fine.toLocaleString("en-CA")} · ◐ Rough {t.rough_recovered.toLocaleString("en-CA")} · ○ Hard {t.hard.toLocaleString("en-CA")}</Text>
    </View>
  );
}

export function MoneyPlan({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"moneyplan">;
  const [why, setWhy] = useState(false);
  const gained = e.after.fine - e.before.fine;
  return (
    <Window title="Your plan, tested">
      <Text style={T.h2}>{gained > 0 ? `${gained.toLocaleString("en-CA")} more futures end fine` : "Your choices barely move these futures"}</Text>
      <Text style={T.p}>{e.worry} · {e.persona.split(",").slice(0, 2).join(",")} · {e.total.toLocaleString("en-CA")} futures</Text>
      {e.choices.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{e.choices.map((c) => <View key={c} style={{ borderRadius: 999, borderWidth: 1, borderColor: C.sel, paddingHorizontal: 10, minHeight: 28, justifyContent: "center" }}><Text style={{ fontFamily: F.body, fontSize: 13, color: C.ink }}>✓ {c}</Text></View>)}</View> : null}
      <TallyRow label="As things are" t={e.before} total={e.total} />
      <TallyRow total={e.total} label={`With your choices${e.monthly ? ` (about $${e.monthly.toLocaleString("en-CA")} a month)` : ""}`} t={e.after} />
      {e.examples.length ? <Text style={[T.h2, { marginTop: 4 }]}>Futures that changed</Text> : null}
      {e.examples.map((x) => (
        <View key={x.future_id} style={{ borderTopWidth: 1, borderTopColor: "#dfe2e6", paddingTop: 8, gap: 2 }}>
          <Text style={{ fontFamily: F.head, fontSize: 14, lineHeight: 20, color: C.ink }}>{OUTCOME[x.before.outcome]} → {OUTCOME[x.after.outcome]}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>Before: {x.before.story}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink }}>After: {x.after.story}</Text>
        </View>
      ))}
      <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center" }}>
        <Text style={[T.link, { paddingVertical: 0 }]}>{why ? "Hide" : "Show"} how this was worked out</Text>
      </Pressable>
      {why ? e.assumptions.map((a) => <Text key={a} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>· {a}</Text>) : null}
    </Window>
  );
}
