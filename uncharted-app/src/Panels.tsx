// Side panels on the road: Paths (left, every path the session has made) and Profile (right, whose numbers and settings).
import { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Meta, TreeNode } from "./api";
import { Element, Segment } from "./contract";
import { C, F } from "./hw";
import { IconClose } from "./icons";
import { DitherMode } from "./TerrainCanvas";
import { pinLabel } from "./widgets";

const ink = C.ink, sub = C.sub;
const money = (v: number) => `$${Math.round(v).toLocaleString("en-CA")}`;

export function Drawer({ side, title, onClose, children, testID }: { side: "left" | "right"; title: string; onClose: () => void; children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,20,30,0.45)" }]} onPress={onClose} accessibilityLabel="Close panel" testID={`${testID}-backdrop`} />
      </Animated.View>
      <Animated.View testID={testID} entering={(side === "left" ? SlideInLeft : SlideInRight).duration(260)} exiting={(side === "left" ? SlideOutLeft : SlideOutRight).duration(200)}
        style={[s.drawer, { width: Math.min(420, width * 0.88), paddingTop: insets.top + 8, paddingBottom: insets.bottom }, side === "left" ? { left: 0 } : { right: 0 }]}>
        <View style={s.head}>
          <Text style={s.title}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={`Close ${title.toLowerCase()}`} style={s.iconBtn} testID={`${testID}-close`}>
            <IconClose />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 24 }}>{children}</ScrollView>
      </Animated.View>
    </View>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.h}>{heading}</Text>
      {children}
    </View>
  );
}

// ---------- Paths ----------

// The server marks both a skipped preview and a path you switched away from as not_taken, so the copy covers both.
type OptState = "current" | "other" | "unexplored";
const OPT_TEXT: Record<OptState, string> = { current: "On your road", other: "Not chosen", unexplored: "Not explored yet" };
const optsOf = (e: Element) => (e.type === "fork" ? e.opts : e.type === "thisthat" ? [e.a, e.b] : null);
const rank = (n: TreeNode) => (n.state === "taken" ? 0 : n.state === "not_taken" ? 1 : 2);

type Row =
  | { kind: "stop"; depth: number; node: TreeNode; onRoad: boolean }
  | { kind: "opt"; depth: number; node: TreeNode; j: number; label: string; sub?: string; state: OptState; switchable: boolean }
  | { kind: "earlier"; depth: number };

function rowsFor(nodes: TreeNode[], roadIds: Set<string>): Row[] {
  const live = nodes.filter((n) => n.state !== "stale" && n.status === "ready" && n.element);
  const kids = new Map<string, TreeNode[]>();
  for (const n of live) if (n.parent_id) kids.set(n.parent_id, [...(kids.get(n.parent_id) ?? []), n]);
  const out: Row[] = [];
  const walk = (start: TreeNode, depth: number) => {
    let n: TreeNode | undefined = start;
    while (n) {
      const onRoad = roadIds.has(n.id);
      out.push({ kind: "stop", depth, node: n, onRoad });
      const ks: TreeNode[] = (kids.get(n.id) ?? []).sort((a, b) => rank(a) - rank(b));
      const opts = optsOf(n.element!);
      if (opts) {
        // A choice nests: one row per option, and the path behind it one level deeper.
        opts.forEach((o, j) => {
          const behind = ks.filter((k) => k.option_index === j);
          const best = behind[0];
          const state: OptState = onRoad && n!.answer?.option_index === j ? "current" : best ? "other" : "unexplored";
          out.push({ kind: "opt", depth: depth + 1, node: n!, j, label: o.label, sub: o.sub, state, switchable: onRoad && state !== "current" });
          if (best) walk(best, depth + 2);
        });
        return;
      }
      // Anything else continues at the same depth. An answer you changed leaves an earlier path, nested.
      for (const old of ks.filter((k) => k.state === "not_taken")) { out.push({ kind: "earlier", depth: depth + 1 }); walk(old, depth + 1); }
      n = ks.find((k) => k.state === "taken" || k.state === "speculative");
    }
  };
  const root = live.find((n) => !n.parent_id);
  if (root) walk(root, 0);
  return out;
}

const asSeg = (n: TreeNode): Segment => ({ id: n.id, el: n.element!, source: n.source ?? "fixed", message: n.message ?? "", blocks: false, answer: n.answer ? { ...n.answer, rules: [] } : null });

export function PathsPanel({ nodes, roadIds, onOpen, onSwitch, onHome }: { nodes: TreeNode[] | null; roadIds: Set<string>; onOpen: (n: TreeNode, onRoad: boolean) => void; onSwitch: (n: TreeNode, j: number) => void; onHome: () => void }) {
  const rows = nodes ? rowsFor(nodes, roadIds) : [];
  return (
    <>
      <Text style={s.p}>Every stop and choice so far. Tap a stop to open it. Tap an option on your road to switch to it.</Text>
      <View testID="paths-tree">
        {!nodes ? <Text style={s.p}>Loading paths…</Text> : rows.map((r, i) => {
          const pad = { marginLeft: r.depth * 16, borderLeftWidth: r.depth ? 1 : 0, borderLeftColor: "#c3c7cd", paddingLeft: r.depth ? 12 : 0 };
          if (r.kind === "earlier") return <Text key={i} style={[s.k, pad, { paddingTop: 8 }]}>Earlier path</Text>;
          if (r.kind === "opt") {
            const cur = r.state === "current";
            return (
              <Pressable key={i} disabled={!r.switchable} onPress={() => onSwitch(r.node, r.j)} accessibilityRole="button" accessibilityState={{ selected: cur, disabled: !r.switchable }}
                testID={`paths-opt-${r.j}`} style={({ pressed }) => [s.row, pad, pressed && { backgroundColor: "#e6e8eb" }]}>
                <Text style={[s.rowTitle, { fontFamily: cur ? F.head : F.body }]}>{cur ? "✓ " : "○ "}{r.label}</Text>
                <Text style={s.rowSub}>{OPT_TEXT[r.state]}{r.switchable ? " · tap to switch" : ""}</Text>
              </Pressable>
            );
          }
          const L = pinLabel(asSeg(r.node));
          return (
            <Pressable key={i} onPress={() => onOpen(r.node, r.onRoad)} accessibilityRole="button" testID={`paths-stop-${r.node.element!.type}`}
              style={({ pressed }) => [s.row, pad, pressed && { backgroundColor: "#e6e8eb" }]}>
              <Text style={[s.rowTitle, { fontFamily: F.head }]} numberOfLines={2}>{L.title}</Text>
              <Text style={s.rowSub} numberOfLines={1}>{r.onRoad ? (r.node.answer ? `✓ ${r.node.answer.label}` : "On your road") : "Not on your road · preview"}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={onHome} accessibilityRole="button" testID="paths-home" style={s.btn}>
        <Text style={s.btnText}>Start a new road</Text>
      </Pressable>
    </>
  );
}

// ---------- Profile ----------

export function ProfilePanel({ meta, personaId, personaSeg, onPersona, scenario, goal, weekly, mode, setMode }: {
  meta: Meta | null; personaId: string | null; personaSeg: Segment | null; onPersona: (j: number) => void;
  scenario: string | null; goal: string; weekly: string | null; mode: DitherMode; setMode: (m: DitherMode) => void;
}) {
  const p = personaId && meta ? meta.personas[personaId] : null;
  const opts = personaSeg && personaSeg.el.type === "fork" ? personaSeg.el.opts : [];
  const [who, age, job, ...place] = (p?.name ?? "").split(",").map((x) => x.trim());
  const spare = p ? p.income - p.essentials - p.saving : 0;
  return (
    <>
      <Section heading="Whose numbers">
        {p ? (
          <View style={s.card} testID="profile-person">
            <Text style={[s.rowTitle, { fontFamily: F.head, fontSize: 18, lineHeight: 24 }]}>{who}, {age}</Text>
            <Text style={s.p}>{job}{place.length ? `, ${place.join(", ")}` : ""}</Text>
            <View style={{ gap: 4, marginTop: 8 }}>
              <Fact k="Take-home pay" v={`${money(p.income)} a month`} />
              <Fact k="Essentials" v={`${money(p.essentials)} a month`} />
              <Fact k="Left over" v={`${money(spare)} a month`} />
              <Fact k="Savings now" v={money(p.savings)} />
              <Fact k="Saves each month" v={money(p.saving)} />
              <Fact k="EI if laid off" v={p.ei ? "Yes" : "No"} />
            </View>
          </View>
        ) : <Text style={s.p}>{personaSeg ? "Nobody picked yet. Pick a person below or at the first fork." : "This road doesn't use money numbers yet."}</Text>}
        {opts.length ? (
          <View style={{ gap: 8 }} accessibilityRole="radiogroup">
            <Text style={s.k}>{p ? "Switch person" : "Pick a person"}</Text>
            {opts.map((o, j) => {
              const on = personaSeg?.answer?.option_index === j;
              return (
                <Pressable key={j} onPress={() => !on && onPersona(j)} accessibilityRole="radio" accessibilityState={{ checked: on }} testID={`profile-persona-${j}`}
                  style={({ pressed }) => [s.radio, on && { borderColor: C.sel, borderWidth: 2 }, pressed && { backgroundColor: "#e6e8eb" }]}>
                  <View style={[s.dot, on && { borderColor: C.sel }]}>{on ? <View style={s.dotIn} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, { fontFamily: on ? F.head : F.body }]}>{o.label}</Text>
                    {o.sub ? <Text style={s.rowSub}>{o.sub}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            <Text style={s.small}>Sample people with illustrative numbers.</Text>
          </View>
        ) : null}
      </Section>

      <Section heading="What you're exploring">
        <Fact k={scenario ? "What-if" : "Goal"} v={(scenario && meta?.scenarios[scenario]?.label) || goal || "Nothing yet"} />
        {weekly ? <Fact k="Weekly buffer" v={weekly.replace(" buffer", "")} /> : null}
      </Section>

      <Section heading="Road style">
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {(["trail", "stream"] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)} accessibilityRole="radio" accessibilityState={{ checked: mode === m }} testID={`mode-${m}`}
              style={[s.seg, mode === m && { backgroundColor: C.sel, borderColor: C.sel }]}>
              <Text style={[s.btnText, mode === m && { color: "#fff" }]}>{mode === m ? "✓ " : ""}{m === "trail" ? "Trail" : "Stream"}</Text>
            </Pressable>
          ))}
        </View>
      </Section>
    </>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text style={s.p}>{k}</Text>
      <Text style={[s.p, { color: ink, fontFamily: F.head, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  drawer: { position: "absolute", top: 0, bottom: 0, backgroundColor: C.surface, shadowColor: "#1e283c", shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  head: { flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 4, paddingBottom: 8 },
  title: { flex: 1, fontFamily: F.head, fontSize: 24, lineHeight: 32, color: ink },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  h: { fontFamily: F.head, fontSize: 18, lineHeight: 24, color: ink },
  k: { fontFamily: F.head, fontSize: 14, lineHeight: 20, color: sub },
  p: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: sub },
  small: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: sub },
  row: { minHeight: 48, justifyContent: "center", paddingVertical: 6, paddingRight: 8, borderRadius: 8 },
  rowTitle: { fontFamily: F.body, fontSize: 15, lineHeight: 20, color: ink },
  rowSub: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: sub },
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#d5d8dc", padding: 16 },
  radio: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#8a8f96", backgroundColor: "#fff" },
  dot: { width: 20, height: 20, borderRadius: 999, borderWidth: 2, borderColor: "#6b7078", alignItems: "center", justifyContent: "center" },
  dotIn: { width: 10, height: 10, borderRadius: 999, backgroundColor: C.sel },
  seg: { flex: 1, minHeight: 48, borderRadius: 999, borderWidth: 1, borderColor: "#8a8f96", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  btn: { minHeight: 48, borderRadius: 999, borderWidth: 2, borderColor: C.sel, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnText: { fontFamily: F.head, fontSize: 15, color: C.sel },
});

// ---------- Variants ----------
// Every result reached on any branch of this road, with the combination of choices that led to it.
const RESULTS = ["moneyplan", "savings", "kit", "tally", "deck"];
function headline(e: Element): string {
  switch (e.type) {
    case "moneyplan": return `${e.after.fine.toLocaleString("en-CA")} of ${e.total.toLocaleString("en-CA")} futures end fine (was ${e.before.fine.toLocaleString("en-CA")})`;
    case "savings": { const best = e.rows.find((r) => r.weekly > 0 && r.reached >= 0.8 * e.total) ?? e.rows.at(-1); return best ? `${e.goal}: $${best.weekly} a week reaches $${e.target.toLocaleString("en-CA")} in ${Math.round((100 * best.reached) / e.total)}% of futures` : e.goal; }
    case "kit": return `${e.title}: $${e.total.toLocaleString("en-CA")} total`;
    case "tally": return `${e.lever?.fine ?? e.baseline.fine} of ${e.total} futures end fine`;
    case "deck": return `${e.title}: ${e.cards.length} flashcards`;
    default: return "";
  }
}

export function VariantsPanel({ nodes, roadIds, onOpen }: { nodes: TreeNode[] | null; roadIds: Set<string>; onOpen: (n: TreeNode, onRoad: boolean) => void }) {
  if (!nodes) return <Text style={s.p}>Loading variants…</Text>;
  const live = nodes.filter((n) => n.state !== "stale" && n.status === "ready" && n.element);
  const byId = new Map(live.map((n) => [n.id, n]));
  // Only results the person actually reached; the road also pre-builds results for options they never took.
  const variants = live.filter((n) => RESULTS.includes(n.element!.type) && (n.seen || roadIds.has(n.id))).map((n) => {
    const choices: string[] = [];
    let c: TreeNode | undefined = n;
    while (c?.parent_id) {
      const a = byId.get(c.parent_id);
      if (!a?.element) break;
      const o = optsOf(a.element);
      if (o && c.option_index != null) choices.unshift(o[c.option_index]?.label ?? "");
      else if (a.element.type === "compare" && a.answer) choices.unshift(a.answer.label);
      c = a;
    }
    return { node: n, choices: choices.filter(Boolean), onRoad: roadIds.has(n.id) };
  }).sort((x, y) => Number(y.onRoad) - Number(x.onRoad));
  return (
    <>
      <Text style={s.p}>Every result you reach is kept here, with the choices that led to it. To try other choices, tap one in the bar at the bottom of the road.</Text>
      {!variants.length ? <Text style={[s.p, { color: ink }]}>No results yet. Finish a road and its result is saved here.</Text> : null}
      <View style={{ gap: 12 }} testID="variants-list">
        {variants.map((v, i) => (
          <Pressable key={v.node.id} onPress={() => onOpen(v.node, v.onRoad)} accessibilityRole="button" testID={`variant-${i}`}
            style={({ pressed }) => [s.card, { gap: 6 }, v.onRoad && { borderColor: C.sel, borderWidth: 2 }, pressed && { backgroundColor: "#f0f1f3" }]}>
            <Text style={s.k}>{v.onRoad ? "On your road now" : `Variant ${variants.length - i}`}</Text>
            <Text style={[s.rowTitle, { fontFamily: F.head, fontSize: 16, lineHeight: 22 }]}>{headline(v.node.element!)}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {v.choices.map((c, k) => <View key={k} style={{ borderRadius: 999, borderWidth: 1, borderColor: "#b9bcc2", paddingHorizontal: 10, minHeight: 28, justifyContent: "center" }}><Text style={{ fontFamily: F.body, fontSize: 13, color: sub }}>{c}</Text></View>)}
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );
}
