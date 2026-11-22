// Find / make road widgets.
//   Compare  2-3 real listings (photo, price, store, why it fits); choose one to plan for
//   Kit      how to make it: steps, what to buy, the total
//   Savings  the simulator's answer: in how many of 5,000 futures you reach the price, per weekly amount
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Svg, { ClipPath, Defs, Line, Polygon, Polyline, Rect } from "react-native-svg";
import { AnswerPayload } from "./api";
import { Element, Outcome, Product, Segment, Tally, WebSource } from "./contract";
import { C, F, Pill, T, Window } from "./hw";
import { money, OUT, TONE } from "./outcomes";

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
// Sized to fit the sheet without scrolling: the method replaces the results instead of growing the window.
const KEYS: Outcome[] = ["fine", "rough_recovered", "hard"];
const MEANS: Record<Outcome, string> = {
  fine: "money never ran out",
  rough_recovered: "went below $0, paid it off within 5 years",
  hard: "still in debt after 5 years, or 6+ months in a row in debt",
};
const small = { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.sub } as const;

// One 100% bar per plan, labelled in place, so the two rows compare segment by segment.
function OutcomeBar({ label, t, total, warn }: { label: string; t: Tally; total: number; warn?: boolean }) {
  const pct = (k: Outcome) => Math.round((100 * t[k]) / total);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} accessible accessibilityLabel={`${label}: ${KEYS.map((k) => `${OUT[k].label} ${pct(k)}%`).join(", ")}`}>
      <Text style={{ width: 72, fontFamily: F.head, fontSize: 14, lineHeight: 18, color: warn ? TONE.hard : C.ink }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: "row", height: 24, gap: 2, borderRadius: 6, overflow: "hidden" }}>
        {KEYS.filter((k) => t[k] > 0).map((k) => (
          <View key={k} style={{ flexGrow: t[k], flexBasis: 0, minWidth: 3, backgroundColor: TONE[k], justifyContent: "center", alignItems: "center" }}>
            {pct(k) >= 9 ? <Text style={{ fontFamily: F.body, fontSize: 12, color: "#fff" }}>{pct(k)}%</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 2 }}>
      {KEYS.map((k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: TONE[k] }} />
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.sub }}>{OUT[k].label}</Text>
        </View>
      ))}
    </View>
  );
}

// Two balance lines for one future, each labelled at its own end (no legend, no axis). Below the dashed line is debt.
function TwoEndings({ without, withPlan }: { without: number[]; withPlan: number[] }) {
  const W = 300, H = 88, pad = 8, LABEL = 34;
  const all = [...without, ...withPlan];
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all), span = hi - lo || 1;
  const y = (v: number) => pad + (1 - (v - lo) / span) * (H - 2 * pad);
  const x = (i: number, n: number) => (i / Math.max(1, n - 1)) * W;
  const pts = (s: number[]) => s.map((v, i) => `${x(i, s.length)},${y(v)}`).join(" ");
  const z = y(0);
  const endA = without[without.length - 1] ?? 0, endB = withPlan[withPlan.length - 1] ?? 0;
  // Each label centres on its line's end; when the two ends are close, the labels are pushed apart.
  let ta = y(endA) - LABEL / 2, tb = y(endB) - LABEL / 2;
  if (Math.abs(ta - tb) < LABEL) { const m = (ta + tb) / 2, s = tb <= ta ? 1 : -1; ta = m + (s * LABEL) / 2; tb = m - (s * LABEL) / 2; }
  const clamp = (t: number) => Math.max(-6, Math.min(H - LABEL + 6, t));
  const dot = (v: number, color: string) => <View style={{ position: "absolute", right: -4, top: y(v) - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
  return (
    <View style={{ flexDirection: "row", gap: 12 }} accessible accessibilityLabel={`Cash over 5 years. Without your plan it ends at ${money(endA)}; with it, ${money(endB)}. Below $0 is debt.`}>
      <View style={{ flex: 1, height: H }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs><ClipPath id="moneyplan-debt"><Rect x={0} y={z} width={W} height={H - z} /></ClipPath></Defs>
          <Polygon points={`0,${z} ${pts(without)} ${W},${z}`} fill={TONE.hard} fillOpacity={0.18} clipPath="url(#moneyplan-debt)" />
          <Line x1={0} x2={W} y1={z} y2={z} stroke="#9aa0a8" strokeDasharray="4 4" strokeWidth={1} />
          <Polyline points={pts(without)} fill="none" stroke="#9aa0a8" strokeWidth={2} />
          <Polyline points={pts(withPlan)} fill="none" stroke={C.sel} strokeWidth={2.5} />
        </Svg>
        {dot(endA, "#9aa0a8")}
        {dot(endB, C.sel)}
      </View>
      <View style={{ width: 76, height: H }}>
        <View style={{ position: "absolute", top: clamp(tb) }}>
          <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 18, color: C.ink }}>{money(endB)}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.sub }}>with plan</Text>
        </View>
        <View style={{ position: "absolute", top: clamp(ta) }}>
          <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 18, color: endA < 0 ? "#8a2b20" : C.sub }}>{money(endA)}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.sub }}>without</Text>
        </View>
      </View>
    </View>
  );
}

function Method({ assumptions }: { assumptions: string[] }) {
  return (
    <View style={{ gap: 24 }} testID="moneyplan-method">
      <View style={{ gap: 8 }}>
        <Text style={T.k}>How it works</Text>
        <Text style={[T.p, { color: C.ink }]}>
          Each future is one run of the next 5 years with its own luck. Both plans get the same luck, so only your plan differs.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={T.k}>What the labels mean</Text>
        {KEYS.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: TONE[k], marginTop: 5 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{OUT[k].label}</Text>
              <Text style={small}>{MEANS[k]}.</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={T.k}>What we assumed</Text>
        {assumptions.map((a) => (
          <Text key={a} style={small}>· {a}</Text>
        ))}
      </View>
    </View>
  );
}

export function MoneyPlan({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"moneyplan">;
  const [why, setWhy] = useState(false);
  const name = e.persona.split(",")[0];
  const pct = (n: number) => Math.round((100 * n) / e.total);
  const was = pct(e.before.fine), now = pct(e.after.fine);
  const weekly = e.plan?.weekly ?? 0;
  const planned = weekly > 0 || e.monthly > 0;
  const moved = planned && now !== was;
  const kicker = `${name} · ${!planned ? "nothing set aside yet" : weekly ? `$${weekly} a week` : e.monthly ? `about $${e.monthly.toLocaleString("en-CA")} a month` : e.choices.join(", ")}`;
  const note = !planned ? "To test a plan, change your weekly amount in Your choices." : moved ? null : "About the same as now.";
  const x = e.examples.find((ex) => ex.before.outcome !== ex.after.outcome);
  return (
    <Window title={`What your plan changes · ${e.worry}`} testID="moneyplan">
      <View style={{ gap: 8 }}>
        <Text style={T.k}>{kicker}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontFamily: F.head, fontSize: 40, lineHeight: 46, color: C.ink }} testID="moneyplan-headline">{now}%</Text>
          {moved ? (
            <Text style={{ fontFamily: F.head, fontSize: 14, lineHeight: 18, color: C.sel }}>
              {now > was ? "▲" : "▼"} from {was}%
            </Text>
          ) : null}
        </View>
        <Text style={[T.p, { color: C.ink }]}>{`of ${e.total.toLocaleString("en-CA")} futures never go into debt.`}</Text>
        {note ? <Text style={T.p}>{note}</Text> : null}
      </View>
      {why ? (
        <Method assumptions={e.assumptions} />
      ) : (
        <View style={{ gap: 24 }}>
          <View style={{ gap: 8 }}>
            <OutcomeBar label={planned ? "Now" : "As it is"} t={e.before} total={e.total} warn />
            {planned ? <OutcomeBar label="Your plan" t={e.after} total={e.total} /> : null}
            <Legend />
          </View>
          {x && x.before.series && x.after.series ? (
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: "#dfe2e6", paddingTop: 16 }} testID="moneyplan-example">
              <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>Same future, two endings</Text>
              {x.what ? <Text style={small}>{x.what}</Text> : null}
              <TwoEndings without={x.before.series} withPlan={x.after.series} />
            </View>
          ) : null}
        </View>
      )}
      <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" testID="moneyplan-why" style={{ minHeight: 48, justifyContent: "center", alignSelf: "flex-start", marginVertical: -8 }}>
        <Text style={[T.link, { paddingVertical: 0 }]}>{why ? "Back to the results" : "How this was worked out"}</Text>
      </Pressable>
    </Window>
  );
}
