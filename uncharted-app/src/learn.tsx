// Concept-path widgets: teach, don't suggest.
//   Deck  flashcards, one sentence each, that shuffle as you scroll
//   Dial  drag a knob and watch a visual and caption change (temperature, dose, speed…)
//   Story a storyboard in one card, stepped with Next
// All three draw their visuals with VizView, so the agent only fills in data.
import Slider from "@react-native-community/slider";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DialFrame, Element, Segment, Viz } from "./contract";
import { C, F, Pill, T, Window } from "./hw";

type Of<K extends Element["type"]> = Extract<Element, { type: K }>;

// ---------- visuals ----------

export function VizView({ viz }: { viz: Viz }) {
  if (viz.kind === "chips") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }} testID="viz-chips">
        {viz.items.map((t, i) => {
          const on = viz.highlight?.includes(i);
          return (
            <View key={i} style={{ paddingHorizontal: 10, minHeight: 32, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: on ? C.sel : "#b9bcc2", backgroundColor: on ? C.sel : "#fff" }}>
              <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 20, color: on ? "#fff" : C.ink }}>{t}</Text>
            </View>
          );
        })}
      </View>
    );
  }
  if (viz.kind === "bars") {
    const max = Math.max(1, ...viz.items.map((b) => b.value));
    return (
      <View style={{ gap: 8 }} testID="viz-bars">
        {viz.items.map((b) => (
          <View key={b.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text numberOfLines={1} style={{ width: 84, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink }}>{b.label}</Text>
            <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: "#dfe2e6", overflow: "hidden" }}>
              <View style={{ height: 12, width: `${(Math.max(0, b.value) / max) * 100}%`, borderRadius: 6, backgroundColor: C.sel }} />
            </View>
            <Text style={{ width: 44, textAlign: "right", fontFamily: F.head, fontSize: 14, lineHeight: 20, color: C.ink }}>{Math.round(b.value)}{viz.unit ?? ""}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (viz.kind === "flow") {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }} testID="viz-flow">
        {viz.items.map((t, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ paddingHorizontal: 10, minHeight: 32, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#b9bcc2", backgroundColor: "#fff" }}>
              <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink }}>{t}</Text>
            </View>
            {i < viz.items.length - 1 ? <Text style={{ fontFamily: F.head, fontSize: 16, color: C.sub }}>→</Text> : null}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View testID="viz-number">
      <Text style={{ fontFamily: F.head, fontSize: 40, lineHeight: 48, color: C.ink }}>{viz.value}</Text>
      <Text style={T.p}>{viz.label}</Text>
    </View>
  );
}

// ---------- dial ----------

// Between two frames, bar values slide smoothly; caption and other visuals come from the nearest frame.
function frameAt(frames: DialFrame[], v: number): { caption: string; viz?: Viz } {
  const fs = [...frames].sort((a, b) => a.at - b.at);
  if (!fs.length) return { caption: "" };
  const hi = fs.findIndex((f) => f.at >= v);
  if (hi <= 0) return fs[Math.max(0, hi)] ?? fs[fs.length - 1];
  const a = fs[hi - 1], b = fs[hi], t = (v - a.at) / (b.at - a.at || 1);
  const near = t < 0.5 ? a : b;
  if (a.viz?.kind === "bars" && b.viz?.kind === "bars") {
    const other = new Map(b.viz.items.map((x) => [x.label, x.value]));
    return { caption: near.caption, viz: { kind: "bars", unit: a.viz.unit, items: a.viz.items.map((x) => ({ label: x.label, value: x.value + ((other.get(x.label) ?? x.value) - x.value) * t })) } };
  }
  return near;
}

export function Dial({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"dial">;
  const [v, setV] = useState(e.frames[0]?.at ?? e.knob.min);
  const f = frameAt(e.frames, v);
  const fmt = (x: number) => `${Number.isInteger(e.knob.step) ? Math.round(x) : x.toFixed(1)}${e.knob.unit ? ` ${e.knob.unit}` : ""}`;
  return (
    <Window title="Try it">
      <Text style={T.h2}>{e.title}</Text>
      <Text style={T.p}>{e.prompt}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ fontFamily: F.head, fontSize: 14, lineHeight: 20, color: C.sub }}>{e.knob.label}</Text>
        <Text style={{ fontFamily: F.head, fontSize: 22, lineHeight: 28, color: C.ink }} testID="dial-value">{fmt(v)}</Text>
      </View>
      <Slider minimumValue={e.knob.min} maximumValue={e.knob.max} step={e.knob.step} value={v} onValueChange={setV}
        minimumTrackTintColor={C.sel} maximumTrackTintColor="#c3c7cd" style={{ height: 48 }} accessibilityLabel={e.knob.label} testID="dial-knob" />
      {f.viz ? <VizView viz={f.viz} /> : null}
      <Text style={[T.p, { color: C.ink }]} testID="dial-caption">{f.caption}</Text>
    </Window>
  );
}

// ---------- story ----------

export function Story({ seg }: { seg: Segment }) {
  const e = seg.el as Of<"story">;
  const [i, setI] = useState(0);
  const step = e.steps[i];
  if (!step) return null;
  return (
    <Window title={`Step ${i + 1} of ${e.steps.length}`}>
      <Text style={T.h2}>{e.title}</Text>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Step ${i + 1} of ${e.steps.length}`}>
        {e.steps.map((_, k) => <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= i ? C.sel : "#dfe2e6" }} />)}
      </View>
      {step.viz ? <VizView viz={step.viz} /> : null}
      <Text style={[T.p, { color: C.ink, fontSize: 16, lineHeight: 24 }]} testID="story-caption">{step.caption}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {i < e.steps.length - 1 ? <Pill label="Next step" testID="story-next" onPress={() => setI(i + 1)} /> : <Pill label="Start over" testID="story-restart" onPress={() => setI(0)} />}
        {i > 0 ? (
          <Pressable onPress={() => setI(i - 1)} accessibilityRole="button" testID="story-back" style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={[T.link, { paddingVertical: 0 }]}>Back</Text>
          </Pressable>
        ) : null}
      </View>
    </Window>
  );
}

// ---------- deck ----------

// progress (0..1) comes from scrolling through the deck's stretch of road: each card in turn flies off to the left.
export function Deck({ seg, progress, still }: { seg: Segment; progress: number; still?: boolean }) {
  const e = seg.el as Of<"deck">;
  const n = e.cards.length;
  const [taps, setTaps] = useState(0); // tapping also deals, for a deck at the very end of the road
  const pos = Math.min(n - 1, progress * n + taps); // which card is on top, continuous
  const top = Math.min(n - 1, Math.round(pos)); // the card mostly in view
  return (
    <View testID="deck" accessibilityLabel={`${e.title}, card ${top + 1} of ${n}: ${e.cards[top]}`}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <View style={{ backgroundColor: "rgba(244,245,248,0.95)", borderRadius: 999, paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontFamily: F.head, fontSize: 14, lineHeight: 20, color: C.ink }}>{e.title}</Text>
        </View>
        <View style={{ backgroundColor: "rgba(244,245,248,0.95)", borderRadius: 999, paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontFamily: F.head, fontSize: 14, lineHeight: 20, color: C.ink }} testID="deck-count">{top + 1} of {n}</Text>
        </View>
      </View>
      <Pressable style={{ height: 240 }} onPress={() => setTaps((x) => (pos >= n - 1 ? 0 : x + 1))} accessibilityRole="button" accessibilityHint="Shows the next card" testID="deck-tap">
        {e.cards.map((text, i) => {
          const t = pos - i; // >0: being dealt away, 0: on top, <0: waiting underneath
          if (t >= 1 && i < n - 1) return null;
          const under = Math.min(2, Math.max(0, -t));
          const away = still ? 0 : Math.max(0, Math.min(1, t)) * (i < n - 1 ? 1 : 0);
          return (
            <View key={i} testID={i === top ? "deck-card" : undefined}
              style={{
                position: "absolute", left: 0, right: 0, top: 0, height: 220, zIndex: n - i,
                backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#d5d8dc", padding: 24, justifyContent: "center",
                shadowColor: "#1e283c", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4,
                opacity: away < 0.7 ? 1 : 1 - (away - 0.7) / 0.3, // stays solid until it is mostly off the deck
                transform: [{ translateY: under * 10 }, { scale: 1 - under * 0.04 }, { translateX: -away * 420 }, { rotate: `${-away * 14}deg` }],
              }}>
              <Text style={{ fontFamily: F.head, fontSize: 22, lineHeight: 30, color: C.ink }}>{text}</Text>
            </View>
          );
        })}
      </Pressable>
      {top < n - 1 ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: "#fff", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>Scroll or tap for the next card</Text> : null}
    </View>
  );
}
