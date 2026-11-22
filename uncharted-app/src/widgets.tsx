import Slider from "@react-native-community/slider";
import { useContext, useState } from "react";
import { Image } from "expo-image";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { AnswerPayload } from "./api";
import { Element, Outcome, Segment, Tally } from "./contract";
import { C, Chip, F, Pill, PicksCtx, T, Window } from "./hw";
import { Deck, Dial, Story } from "./learn";
import { money, OUT, Spark, TONE } from "./outcomes";
import { Compare, Kit, MoneyPlan, Savings } from "./plan";
import { hoursLabel, tagChip } from "./tags";

export type WidgetProps = { seg: Segment; answer: (p: AnswerPayload) => void; change: () => void; retry: () => void; onGoal: () => void; onExplore: () => void };
type Of<K extends Element["type"]> = Extract<Element, { type: K }>;

// Window title: what the stop is. Where it came from (agent, fixed, offline) is dev detail and stays off screen.
const title = (_seg: Segment, what: string) => what.charAt(0).toUpperCase() + what.slice(1);

function Answered({ seg, change }: { seg: Segment; change: () => void }) {
  if (!seg.answer) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <Text style={[T.p, { flexShrink: 1 }]}>You picked <Text style={{ fontFamily: F.head, color: C.ink }}>{seg.answer.label}</Text></Text>
      <Pressable onPress={change} accessibilityRole="button" testID={`change-${seg.id}`} style={{ minHeight: 48, justifyContent: "center" }}><Text style={[T.link, { paddingVertical: 0 }]}>Change</Text></Pressable>
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
      <Text style={T.h2}>{e.title}</Text>
      <Text style={T.p}>{e.line}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {e.tags.map((t) => <Chip key={t} text={tagChip(t)} />)}
        {e.hours ? <Chip text={hoursLabel(e.hours)} /> : null}
      </View>
    </Window>
  );
}

function Ask({ seg, answer, change, onGoal }: WidgetProps) {
  const e = seg.el as Of<"ask">;
  const [text, setText] = useState("");
  const go = (g: string) => g.trim() && answer({ text: g.trim() });
  // A money worry only shows the worry (a new worry means a new road); other roads keep "change" on their goal.
  const money = !!seg.answer?.rules.some((r) => r.key === "kind" || r.key === "scenario");
  return (
    <Window title={title(seg, money ? "your worry" : "your goal")}>
      {seg.answer && money ? (
        <>
          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.sub }}>{e.prompt}</Text>
            <Text style={T.h} testID="worry">“{seg.answer.label}”</Text>
          </View>
          <Pressable onPress={onGoal} accessibilityRole="button" testID="new-worry" style={{ minHeight: 48, justifyContent: "center", alignSelf: "flex-start", marginTop: -8, marginBottom: -12 }}>
            <Text style={[T.link, { paddingVertical: 0 }]}>Pick a different worry</Text>
          </Pressable>
        </>
      ) : seg.answer ? (
        <>
          <Text style={T.h2}>{e.prompt}</Text>
          <Answered seg={seg} change={change} />
        </>
      ) : (
        <>
          <Text style={T.h2}>{e.prompt}</Text>
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
      <View style={{ gap: 12 }}>
        {e.opts.map((o, k) => (
          <Pill key={k} label={o.label} sub={o.sub} testID={`fork-${k}`} selected={seg.answer?.option_index === k} disabled={!!seg.answer} onPress={() => answer({ option_index: k })} />
        ))}
      </View>
      {seg.answer ? <Answered seg={seg} change={change} /> : <Text style={[T.p, { fontSize: 13 }]}>Pick one, then keep scrolling.</Text>}
    </Window>
  );
}

// Saved cards baked the other path's ending into this sentence. The line on screen is this path only.
function shownStory(e: Of<"future">) {
  const end = e.baseline.end_balance;
  // Older cards put the $25 path's ending in this sentence. The line drawn here is this path.
  const instead = e.lever ? "" : end < 0 ? ` Ends at ${money(end)}.` : ` Back to ${money(end)} by year 5.`;
  const text = (e.lever ? e.lever.story : e.baseline.story).replace(/ ?With \$\d+ a week, this future ends at [^.]+\./, instead);
  return text.replace(/\s+/g, " ").trim();
}

function Future({ seg }: WidgetProps) {
  const e = seg.el as Of<"future">;
  const now = e.lever ?? e.baseline;
  const o = OUT[now.outcome];
  const changed = e.lever && e.lever.outcome !== e.baseline.outcome;
  return (
    <Window title={title(seg, e.index ? `future #${e.future_id} · ${e.index} of ${e.of}` : `one of ${e.of.toLocaleString("en-CA")} futures`)} testID="future">
      <Text style={T.h2}>{o.label}</Text>
      <Text style={T.p}>{shownStory(e)}</Text>
      <Spark a={e.baseline} b={e.lever} without={`Without $${e.weekly ?? 0}/week`} />
            {e.lever ? (
        <View style={{ borderTopWidth: 1, borderTopColor: "#d5d8dc", paddingTop: 8, gap: 2 }}>
          <Text style={[T.p, { fontSize: 13 }]}>Without the buffer: {OUT[e.baseline.outcome].label.toLowerCase()}, {money(e.baseline.end_balance)}.</Text>
          <Text style={[T.p, { fontSize: 13, color: C.ink }]}>With ${e.weekly} a week: {OUT[e.lever.outcome].label.toLowerCase()}, {money(e.lever.end_balance)}.{changed ? " A different outcome." : ""}</Text>
        </View>
      ) : null}
    </Window>
  );
}

// Matches sim.mjs: hard = still in debt at month 60, or 6+ months in a row in debt.
const MEANS: Record<Outcome, string> = {
  fine: "Never ran out of money",
  rough_recovered: "Went into debt, paid it off within 5 years",
  hard: "Still in debt after 5 years, or in debt 6+ months in a row",
};
const HEADLINE: Record<Outcome, string> = { fine: "turn out fine", rough_recovered: "hit a rough patch, then recover", hard: "end in a hard stretch" };
const share = (n: number, total: number) => Math.round((100 * n) / total);

// One bar split into the three outcomes (they add up to the whole), then a legend with each share.
function Bars({ t, total }: { t: Tally; total: number }) {
  const ks = Object.keys(OUT) as Outcome[];
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", height: 20, gap: 2, borderRadius: 6, overflow: "hidden" }} accessibilityLabel={ks.map((k) => `${OUT[k].label} ${share(t[k], total)}%`).join(", ")}>
        {ks.filter((k) => t[k] > 0).map((k) => <View key={k} style={{ flexGrow: t[k], flexBasis: 0, minWidth: 4, backgroundColor: TONE[k] }} />)}
      </View>
      <View style={{ gap: 6 }}>
        {ks.map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: TONE[k] }} />
            <Text style={[T.p, { flex: 1, color: C.ink }]}>{OUT[k].label}</Text>
            <Text style={{ fontFamily: F.head, fontSize: 15, lineHeight: 21, color: C.ink }}>{share(t[k], total)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TallyW({ seg }: WidgetProps) {
  const e = seg.el as Of<"tally">;
  const [why, setWhy] = useState(false);
  const moved = e.lever ? Math.abs(e.lever.fine - e.baseline.fine) : 0;
  const top = (Object.keys(OUT) as Outcome[]).reduce((a, b) => (e.baseline[b] > e.baseline[a] ? b : a));
  const group = { fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.sub, marginTop: 4 } as const;
  return (
    <Window title={title(seg, "how the next 5 years could go")}>
      <Text style={T.h2}>
        {e.lever
          ? moved / e.total < 0.02 ? `$${e.weekly} a week barely moves these futures` : `${moved.toLocaleString("en-CA")} more futures end fine with $${e.weekly} a week`
          : `${share(e.baseline[top], e.total)}% ${HEADLINE[top]}`}
      </Text>
      <Text style={T.p}>Out of {e.total.toLocaleString("en-CA")} simulated runs of the next 5 years.</Text>
      {e.lever ? <Text style={group}>Without the buffer</Text> : null}
      <Bars t={e.baseline} total={e.total} />
      {e.lever ? (
        <>
          <Text style={group}>With ${e.weekly} a week</Text>
          <Bars t={e.lever} total={e.total} />
        </>
      ) : null}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Pressable onPress={() => setWhy(!why)} accessibilityRole="button" hitSlop={12} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
          <Text style={[T.link, { paddingVertical: 0 }]}>{why ? "Hide what these mean" : "What do these mean?"}</Text>
        </Pressable>
        {why ? (
          <View style={{ gap: 6 }}>
            <Text style={[T.p, { fontSize: 14, lineHeight: 20 }]}>Each run gets its own luck: job losses, surprise bills, raises.</Text>
            {(Object.keys(OUT) as Outcome[]).map((k) => (
              <Text key={k} style={[T.p, { fontSize: 14, lineHeight: 20 }]}><Text style={{ fontFamily: F.head, color: C.ink }}>{OUT[k].label}:</Text> {MEANS[k].toLowerCase()}</Text>
            ))}
          </View>
        ) : null}
      </View>
    </Window>
  );
}

function Assumptions({ seg }: WidgetProps) {
  const e = seg.el as Of<"assumptions">;
  const [open, setOpen] = useState(false);
  return (
    <Window title={title(seg, "assumptions")}>
      <Text style={T.h2}>5,000 five-year futures, run on your numbers</Text>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center" }}><Text style={[T.link, { paddingVertical: 0 }]}>{open ? "Hide" : "Show"} the assumptions</Text></Pressable>
      {open ? e.lines.map((l) => <Text key={l} style={[T.p, { fontSize: 13 }]}>· {l}</Text>) : null}
    </Window>
  );
}

function Action({ seg, answer, change }: WidgetProps) {
  const e = seg.el as Of<"action">;
  return (
    <Window title={title(seg, "one next step")}>
      <Text style={T.h2}>Set up ${e.weekly} a week, automatically</Text>
      <Text style={T.p}>1. Open your bank app.{"\n"}2. If you don’t have one, open a high-interest savings account or a TFSA.{"\n"}3. Schedule ${e.weekly} to move there every week, the day after payday.</Text>
      <Text style={[T.p, { fontSize: 13 }]}>A TFSA isn’t locked: you can take money out any time, tax-free. At work, your own plan contributions can go to nearer goals while an employer match builds for later.</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pill flex label="Remind me Monday" testID="remind" selected={seg.answer?.label === "remind"} disabled={!!seg.answer} onPress={() => answer({ verdict: "remind" })} />
        <Pill flex label="Not now" selected={seg.answer?.label === "not now"} disabled={!!seg.answer} onPress={() => answer({ verdict: "not_now" })} />
      </View>
      {seg.answer ? (
        <Pressable onPress={change} accessibilityRole="button" testID={`change-${seg.id}`} style={{ minHeight: 48, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={[T.link, { paddingVertical: 0 }]}>Change</Text>
        </Pressable>
      ) : null}
      <Text style={[T.p, { fontSize: 12, color: C.faint }]}>Simulated outcomes. An educational tool, not financial advice. Nothing moves money.</Text>
    </Window>
  );
}

// Numbered, one row per choice: the question small, the answer large. A row goes back to that stop.
export function PickList({ onJump }: { onJump?: () => void }) {
  const { picks, jump } = useContext(PicksCtx);
  return (
    <View>
      {picks.map((p, i) => (
        <Pressable key={p.id} onPress={() => { jump(p.id); onJump?.(); }} accessibilityRole="button" accessibilityLabel={`Go back to: ${p.prompt} ${p.label}`} testID={`pick-${i}`}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#dfe2e6", opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.sel, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.head, fontSize: 13, color: "#fff" }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.sub }}>{p.prompt}</Text>
            <Text numberOfLines={1} style={{ fontFamily: F.head, fontSize: 15, lineHeight: 20, color: C.ink }}>{p.label}</Text>
          </View>
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.sel, textDecorationLine: "underline" }}>Change</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Checkin({ seg, onGoal, onExplore }: WidgetProps) {
  const e = seg.el as Of<"checkin">;
  return (
    <Window title={title(seg, e.final ? "you arrived" : "check-in")}>
      <Text style={T.h2}>{e.final ? "You reached the end of this road" : "Your road so far"}</Text>
      {seg.message ? <Text style={T.p}>{seg.message}</Text> : null}
      <PickList />
      {e.final ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {e.money ? <Pill flex label="Try another worry" onPress={onGoal} /> : (
            <>
              <Pill flex label="Explore more" onPress={onExplore} />
              <Pill flex label="New goal" onPress={onGoal} />
            </>
          )}
        </View>
      ) : null}
    </Window>
  );
}

function Deadend({ seg, onGoal, retry }: WidgetProps) {
  const e = seg.el as Of<"deadend">;
  return (
    <Window title={title(seg, "road ends")}>
      <Text style={T.h2}>The road stops here</Text>
      <Text style={T.p}>{e.reason}</Text>
      <Text style={T.p}>Try again, or change a pick in Your choices.</Text>
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
    case "future": { const s = e.lever ?? e.baseline; return { title: OUT[s.outcome].label, note: `${short2(s.end_balance)} · ${seg.message}` }; }
    case "tally": return { title: "How the next 5 years could go", note };
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
    case "moneyplan": return { title: "What your plan changes", note: `Out of debt in ${share(e.after.fine, e.total)}% of futures (now ${share(e.before.fine, e.total)}%)` };
  }
}
