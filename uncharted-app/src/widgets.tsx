import Slider from "@react-native-community/slider";
import { useState } from "react";
import { Image } from "expo-image";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { AnswerPayload } from "./api";
import { Element, FutureSide, Outcome, Segment, Tally } from "./contract";
import { C, Chip, F, Pill, T, Window } from "./hw";
import { Deck, Dial, Story } from "./learn";
import { Compare, Kit, MoneyPlan, Savings } from "./plan";
import { hoursLabel, tagChip } from "./tags";

export type WidgetProps = { seg: Segment; answer: (p: AnswerPayload) => void; change: () => void; retry: () => void; onGoal: () => void; onExplore: () => void };
type Of<K extends Element["type"]> = Extract<Element, { type: K }>;

// Window title: what the stop is. Where it came from (agent, fixed, offline) is dev detail and stays off screen.
const title = (_seg: Segment, what: string) => what.charAt(0).toUpperCase() + what.slice(1);

function Answered({ seg, change }: { seg: Segment; change: () => void }) {
  if (!seg.answer) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <Text style={[T.p, { fontSize: 13, flexShrink: 1 }]}>Rule: {seg.answer.rules.map((r) => r.text).join(", ")}</Text>
      <Pressable onPress={change} accessibilityRole="button" testID={`change-${seg.id}`}><Text style={T.link}>change</Text></Pressable>
    </View>
  );
}

// An idea is content: what it is, a photo, and its labels. No Save/Skip, no rules.
function Item({ seg }: WidgetProps) {
  const e = seg.el as Of<"item">;
  return (
    <Window title={title(seg, "idea")}>
      {e.image ? (
        <View style={{ gap: 4 }}>
          <Image source={{ uri: e.image.url }} style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: "#dfe2e6" }} contentFit="cover" transition={200} accessibilityLabel={e.image.alt ?? e.title} testID="item-image" />
          {e.image.page ? (
            <Pressable onPress={() => Linking.openURL(e.image!.page!)} accessibilityRole="link" hitSlop={8}>
              <Text style={{ fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.sub, textDecorationLine: "underline" }}>Photo: Wikipedia, {e.image.credit ?? "see page"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={T.h}>{e.title}</Text>
      <Text style={T.p}>{e.line}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {e.tags.map((t) => <Chip key={t} text={tagChip(t)} />)}
        {e.hours ? <Chip text={hoursLabel(e.hours)} /> : null}
      </View>
    </Window>
  );
}

function Ask({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"ask">;
  const [text, setText] = useState("");
  const go = (g: string) => g.trim() && answer({ text: g.trim() });
  return (
    <Window title={title(seg, "your goal")}>
      <Text style={T.h2}>{e.prompt}</Text>
      {seg.answer ? <Answered seg={seg} change={change} /> : (
        <>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={() => go(text)} placeholder={e.placeholder} placeholderTextColor={C.faint} testID="ask-input" returnKeyType="go"
            style={{ fontFamily: F.body, fontSize: 16, color: C.ink, backgroundColor: "#fff", borderWidth: 1, borderColor: "#b9bcc2", borderRadius: 10, paddingHorizontal: 12, minHeight: 48 }} />
          <Pill label="Go" testID="ask-go" onPress={() => go(text)} />
          <Text style={T.k}>Or pick one</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {e.examples.map((x, i) => <Pill key={x} label={x} testID={`ask-ex-${i}`} onPress={() => go(x)} />)}
          </View>
          <Text style={[T.p, { fontSize: 12, color: C.faint }]}>Your words go to Gemini, which paves the road from here.</Text>
        </>
      )}
    </Window>
  );
}

function ThisThat({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"thisthat">;
  return (
    <Window title={title(seg, "this or that")}>
      <Text style={T.h2}>{e.prompt}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[e.a, e.b].map((o, k) => (
          <Pill key={k} flex big label={o.label} sub={o.sub} testID={`tt-${k}`} selected={seg.answer?.option_index === k} disabled={!!seg.answer} onPress={() => answer({ option_index: k })} />
        ))}
      </View>
      <Answered seg={seg} change={change} />
    </Window>
  );
}

function SliderW({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"slider">;
  const [v, setV] = useState(e.v);
  const fmt = (x: number) => (e.unit === "$" ? `$${x}` : e.unit === "mo" ? `${x} months` : `${x} h`);
  return (
    <Window title={title(seg, "set it")}>
      <Text style={T.h2}>{e.prompt}</Text>
      <Text style={[T.h, { fontSize: 28, lineHeight: 32 }]}>{fmt(v)}</Text>
      <Slider disabled={!!seg.answer} minimumValue={e.min} maximumValue={e.max} step={e.step} value={v} onValueChange={setV} minimumTrackTintColor={C.sel} maximumTrackTintColor="#c3c7cd" style={{ height: 44 }} />
      {seg.answer ? <Answered seg={seg} change={change} /> : <Pill label="Use this" testID="use-slider" onPress={() => answer({ value: v })} />}
    </Window>
  );
}

function Fork({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"fork">;
  return (
    <Window title={title(seg, "fork in the road")}>
      <Text style={T.h2}>{e.prompt}</Text>
      <View style={{ gap: 8 }}>
        {e.opts.map((o, k) => (
          <Pill key={k} label={o.label} sub={o.sub} testID={`fork-${k}`} selected={seg.answer?.option_index === k} disabled={!!seg.answer} onPress={() => answer({ option_index: k })} />
        ))}
      </View>
      {seg.answer ? <Answered seg={seg} change={change} /> : <Text style={[T.p, { fontSize: 13 }]}>Pick one, then keep scrolling.</Text>}
    </Window>
  );
}

const OUT: Record<Outcome, { icon: string; label: string }> = {
  fine: { icon: "●", label: "Fine" },
  rough_recovered: { icon: "◐", label: "Rough, recovered" },
  hard: { icon: "○", label: "Hard stretch" },
};
const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-CA")}`;

function Spark({ a, b }: { a: FutureSide; b?: FutureSide }) {
  const W = 300, H = 70;
  const all = [...a.series, ...(b?.series ?? [])];
  const lo = Math.min(0, ...all), hi = Math.max(1, ...all);
  const y = (v: number) => H - 4 - ((v - lo) / (hi - lo)) * (H - 8);
  const pts = (s: number[]) => s.map((v, i) => `${(i / (s.length - 1)) * W},${y(v)}`).join(" ");
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="#9aa0a8" strokeDasharray="4 4" strokeWidth={1} />
      <Polyline points={pts(a.series)} fill="none" stroke={b ? "#9aa0a8" : C.sel} strokeWidth={b ? 1.5 : 2} />
      {b ? <Polyline points={pts(b.series)} fill="none" stroke={C.sel} strokeWidth={2} /> : null}
      <Circle cx={W} cy={y((b ?? a).end_balance)} r={3} fill={C.sel} />
    </Svg>
  );
}

function Future({ seg }: WidgetProps) {
  const e = seg.el as Of<"future">;
  const now = e.lever ?? e.baseline;
  const o = OUT[now.outcome];
  const changed = e.lever && e.lever.outcome !== e.baseline.outcome;
  return (
    <Window title={title(seg, `future #${e.future_id} · ${e.index} of ${e.of}`)} testID="future">
      <Text style={T.k}>Future #{e.future_id}</Text>
      <Text style={T.h2}>{o.icon} {o.label}</Text>
      <Text style={T.p}>{e.lever ? e.lever.story : e.baseline.story}</Text>
      <Spark a={e.baseline} b={e.lever} />
      <Text style={[T.p, { color: C.ink }]}>Month 60: {money(now.end_balance)}</Text>
      {e.lever ? (
        <View style={{ borderTopWidth: 1, borderTopColor: "#d5d8dc", paddingTop: 8, gap: 2 }}>
          <Text style={[T.p, { fontSize: 13 }]}>Without the buffer: {OUT[e.baseline.outcome].icon} {OUT[e.baseline.outcome].label.toLowerCase()}, {money(e.baseline.end_balance)}.</Text>
          <Text style={[T.p, { fontSize: 13, color: C.ink }]}>With ${e.weekly} a week: {OUT[e.lever.outcome].icon} {OUT[e.lever.outcome].label.toLowerCase()}, {money(e.lever.end_balance)}.{changed ? "  Changed." : ""}</Text>
        </View>
      ) : null}
    </Window>
  );
}

function Bars({ t, total }: { t: Tally; total: number }) {
  return (
    <View style={{ gap: 6 }}>
      {(Object.keys(OUT) as Outcome[]).map((k) => (
        <View key={k} style={{ gap: 2 }}>
          <Text style={[T.p, { fontSize: 13 }]}>{OUT[k].icon} {OUT[k].label}: {t[k].toLocaleString("en-CA")} of {total.toLocaleString("en-CA")}</Text>
          <View style={{ height: 8, backgroundColor: "#dfe2e6", borderRadius: 4 }}>
            <View style={{ height: 8, width: `${(t[k] / total) * 100}%`, backgroundColor: C.sel, borderRadius: 4, opacity: k === "fine" ? 1 : k === "rough_recovered" ? 0.6 : 0.3 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function TallyW({ seg }: WidgetProps) {
  const e = seg.el as Of<"tally">;
  const moved = e.lever ? Math.abs(e.lever.fine - e.baseline.fine) : 0;
  return (
    <Window title={title(seg, "all 5,000 futures")}>
      <Text style={T.h2}>Across all {e.total.toLocaleString("en-CA")} futures</Text>
      <Text style={T.k}>As things stand</Text>
      <Bars t={e.baseline} total={e.total} />
      {e.lever ? (
        <>
          <Text style={T.k}>With ${e.weekly} a week</Text>
          <Bars t={e.lever} total={e.total} />
          <Text style={T.p}>{moved / e.total < 0.02 ? "This barely moves your futures. That is worth knowing too." : `${moved.toLocaleString("en-CA")} more futures end fine.`}</Text>
        </>
      ) : null}
    </Window>
  );
}

function Assumptions({ seg }: WidgetProps) {
  const e = seg.el as Of<"assumptions">;
  const [open, setOpen] = useState(false);
  return (
    <Window title={title(seg, "assumptions")}>
      <Text style={T.h2}>5,000 five-year futures, run on your numbers</Text>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button"><Text style={T.link}>{open ? "Hide" : "Show"} the assumptions</Text></Pressable>
      {open ? e.lines.map((l) => <Text key={l} style={[T.p, { fontSize: 13 }]}>· {l}</Text>) : null}
    </Window>
  );
}

function Action({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"action">;
  return (
    <Window title={title(seg, "one next step")}>
      <Text style={T.h}>Set up ${e.weekly} a week, automatically</Text>
      <Text style={T.p}>1. Open your bank app. 2. Find scheduled or recurring transfers. 3. Send ${e.weekly} every week to a savings account you don't spend from.</Text>
      <Text style={[T.p, { fontSize: 13 }]}>At work, your own contributions can go to nearer goals while an employer match builds for later.</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill flex label="Remind me Monday" testID="remind" selected={seg.answer?.label === "remind"} disabled={!!seg.answer} onPress={() => answer({ verdict: "remind" })} />
        <Pill flex label="Not now" selected={seg.answer?.label === "not now"} disabled={!!seg.answer} onPress={() => answer({ verdict: "not_now" })} />
      </View>
      <Answered seg={seg} change={change} />
      <Text style={[T.p, { fontSize: 12, color: C.faint }]}>Simulated outcomes. An educational tool, not financial advice. Nothing moves money.</Text>
    </Window>
  );
}

function Checkin({ seg, onGoal, onExplore, rulesNow }: WidgetProps & { rulesNow: string[] }) {
  const e = seg.el as Of<"checkin">;
  return (
    <Window title={title(seg, e.final ? "you arrived" : "check-in")}>
      <Text style={T.h}>{e.final ? "You reached the end of this road." : "Here is your road so far."}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{rulesNow.map((r) => <Chip key={r} text={r} />)}</View>
      <Text style={T.p}>Every rule came from a pick. Change any pick above, or erase a rule below, and the road ahead repaves.</Text>
      {e.final ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pill flex label="Explore more" onPress={onExplore} />
          <Pill flex label="New goal" onPress={onGoal} />
        </View>
      ) : null}
    </Window>
  );
}

function Deadend({ seg, onGoal, retry }: WidgetProps) {
  const e = seg.el as Of<"deadend">;
  return (
    <Window title={title(seg, "road ends")}>
      <Text style={T.h}>The road stops here</Text>
      <Text style={T.p}>{e.reason}</Text>
      <Text style={T.p}>Change a pick above, or erase a rule in "Your rules", and the agent tries again.</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill flex label="Try again" testID="retry" onPress={retry} />
        <Pill flex label="New goal" onPress={onGoal} />
      </View>
    </Window>
  );
}

export function Widget(p: WidgetProps & { rulesNow: string[] }) {
  switch (p.seg.el.type) {
    case "item": return <Item {...p} />;
    case "thisthat": return <ThisThat {...p} />;
    case "slider": return <SliderW {...p} />;
    case "fork": return <Fork {...p} />;
    case "ask": return <Ask {...p} />;
    case "future": return <Future {...p} />;
    case "tally": return <TallyW {...p} />;
    case "assumptions": return <Assumptions {...p} />;
    case "action": return <Action {...p} />;
    case "checkin": return <Checkin {...p} />;
    case "deadend": return <Deadend {...p} />;
    case "dial": return <Dial seg={p.seg} />;
    case "story": return <Story seg={p.seg} />;
    case "deck": return <Deck seg={p.seg} progress={0} />;
    case "compare": return <Compare seg={p.seg} answer={p.answer} change={p.change} />;
    case "kit": return <Kit seg={p.seg} />;
    case "savings": return <Savings seg={p.seg} />;
    case "moneyplan": return <MoneyPlan seg={p.seg} />;
  }
}

export function Paving() {
  return (
    <Window title="Paving the next stretch" testID="paving">
      <Text style={[T.p, { fontFamily: F.label }]}>Paving the road ahead from your picks…</Text>
    </Window>
  );
}

const short2 = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n / 100) / 10).toFixed(1)}k`;
// What a collapsed pin says: the element's own label, then its state.
export function pinLabel(seg: Segment): { title: string; note: string } {
  const e = seg.el;
  const note = seg.answer ? `✓ ${seg.answer.label}` : seg.message;
  switch (e.type) {
    case "item": return { title: e.title, note };
    case "thisthat": case "slider": case "ask": case "fork": return { title: e.prompt, note };
    case "future": { const s = e.lever ?? e.baseline; return { title: `${OUT[s.outcome].icon} ${OUT[s.outcome].label} · #${e.future_id}`, note: `${short2(s.end_balance)} · ${seg.message}` }; }
    case "tally": return { title: "All 5,000 futures", note };
    case "assumptions": return { title: "How this was run", note };
    case "action": return { title: "One next step", note };
    case "checkin": return { title: e.final ? "End of this road" : "Your road so far", note };
    case "deadend": return { title: "The road stops here", note };
    case "dial": return { title: e.title, note };
    case "story": return { title: e.title, note };
    case "deck": return { title: e.title, note: `${e.cards.length} flashcards` };
    case "compare": return { title: e.title, note: seg.answer ? `✓ ${seg.answer.label}` : `${e.items.length} real listings` };
    case "kit": return { title: e.title, note: `$${e.total.toLocaleString("en-CA")} total` };
    case "savings": return { title: `Saving for ${e.goal}`, note: `$${e.target.toLocaleString("en-CA")}` };
    case "moneyplan": return { title: "Your plan, tested", note: `${e.after.fine.toLocaleString("en-CA")} of ${e.total.toLocaleString("en-CA")} end fine (was ${e.before.fine.toLocaleString("en-CA")})` };
  }
}
