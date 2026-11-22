// The three ways a simulated future can end, and the one-line balance chart. Shared by the future, tally and plan widgets.
import { Text, View } from "react-native";
import Svg, { ClipPath, Defs, Line, Polygon, Polyline, Rect } from "react-native-svg";
import { Outcome } from "./contract";
import { C, F } from "./hw";

// Matches sim.mjs: fine = never below $0; hard = still in debt at month 60, or 6+ months in a row in debt.
export const OUT: Record<Outcome, { label: string }> = {
  fine: { label: "Never in debt" },
  rough_recovered: { label: "Recovered" },
  hard: { label: "Stuck in debt" },
};

// Hard is the outcome the headline is about, so it carries the one warm colour.
export const TONE: Record<Outcome, string> = { fine: C.sel, rough_recovered: "#8a93a0", hard: "#b8573f" };
export const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-CA")}`;
export const axisText = { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: C.sub };

// One glance: where it starts, how low it goes, where it ends. Shaded = in debt.
// With `b`, `a` is drawn as the grey "without" line and labelled `without`.
export function Spark({ a, b, without, height = 110 }: { a: { series: number[] }; b?: { series: number[] }; without?: string; height?: number }) {
  const W = 300, H = height, top = 24, bot = 28;
  const all = [...a.series, ...(b?.series ?? [])];
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  const span = hi - lo || 1;
  const y = (v: number) => top + (1 - (v - lo) / span) * (H - top - bot);
  const n = Math.max(2, a.series.length);
  const x = (i: number) => (i / (n - 1)) * W;
  const pts = (s: number[]) => s.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const s = (b ?? a).series;
  const start = s[0] ?? 0, end = s[s.length - 1] ?? 0;
  const lowI = s.reduce((m, v, i) => (v < s[m] ? i : m), 0), low = s[lowI] ?? 0;
  const pct = (i: number) => `${(100 * i) / (n - 1)}%` as const;
  const z = y(0);
  const label = { ...axisText, position: "absolute" as const, color: C.ink, fontFamily: F.head };
  const above = (v: number) => Math.max(0, y(v) - 20);
  const below = (v: number) => Math.min(H - 16, y(v) + 4);
  const described = `Cash on hand over 5 years. Starts at ${money(start)}, lowest ${money(low)}, ends at ${money(end)}. Below $0 is debt.`;
  // End value: debt endings stay above the tip (below jammed the stroke + Year 5). Clear of the chart floor.
  const endLabelH = 18;
  const aboveTop = Math.max(0, y(end) - 24);
  const belowTop = Math.min(H - endLabelH - 2, y(end) + 10);
  const endTop = end < 0 || y(end) > H * 0.62 ? aboveTop : (y(end) - 22 >= 0 ? y(end) - 22 : belowTop);
  return (
    <View accessible accessibilityLabel={described} style={{ gap: 4 }}>
      <View style={{ height: H }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Defs><ClipPath id="debt"><Rect x={0} y={z} width={W} height={H - z} /></ClipPath></Defs>
          <Polygon points={`0,${z} ${pts(s)} ${W},${z}`} fill="#b8573f" fillOpacity={0.2} clipPath="url(#debt)" />
          <Line x1={0} x2={W} y1={z} y2={z} stroke="#9aa0a8" strokeDasharray="4 4" strokeWidth={1} />
          {b ? <Polyline points={pts(a.series)} fill="none" stroke="#9aa0a8" strokeWidth={1.5} /> : null}
          <Polyline points={pts(s)} fill="none" stroke={C.sel} strokeWidth={2} />
        </Svg>
        <View style={{ position: "absolute", right: -4, top: y(end) - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: C.sel }} />
        <Text numberOfLines={1} style={[label, { left: 0, top: start >= 0 ? above(start) : below(start) }]}>{money(start)}</Text>
        {/* The low only gets a label clear of the start label and the end value. */}
        {low < 0 && lowI > (n - 1) * 0.2 && lowI < (n - 1) * 0.75 ? (
          <Text numberOfLines={1} style={[label, { left: pct(lowI), width: 72, marginLeft: -36, textAlign: "center", top: below(low), color: "#8a2b20" }]}>{money(low)}</Text>
        ) : null}
        <Text numberOfLines={1} style={[label, { right: 2, top: endTop, fontSize: 14, lineHeight: 18, color: end < 0 ? TONE.hard : C.ink }]}>{money(end)}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={axisText}>Now</Text>
        <Text style={axisText}>Year 5</Text>
      </View>
      {b && without ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 14, height: 2, backgroundColor: "#9aa0a8" }} />
          <Text style={axisText}>{without}</Text>
        </View>
      ) : null}
    </View>
  );
}
