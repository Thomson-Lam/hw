import { Image } from "expo-image";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerPayload, fetchMeta, fetchRoad, fetchTree, Meta, Road as RoadView, Seed, sendAnswer, sendChange, sendRetry, startSession, TreeNode } from "./api";
import { Segment } from "./contract";
import { C, CloseCtx, F, MessageCtx, T } from "./hw";
import { IconBack, IconPaths, IconPerson } from "./icons";
import { Drawer, ProfilePanel, VariantsPanel } from "./Panels";
import { DitherMode, TerrainCanvas } from "./TerrainCanvas";
import { at, camera, choiceOpts, lanePoint, laneForSwipe, layout, Placed, zoomEnd } from "./terrain";
import { Deck } from "./learn";
import { CardActions, CardBody, PavingCard } from "./RoadCard";
import { Paving, Widget } from "./widgets";

const PIN = require("../assets/hw/pin.svg");
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// Pulse rings run on a plain rAF clock (RN Animated stalls on web in this app).
function Ring({ size, left, top }: { size: number; left: number; top: number }) {
  const [u, setU] = useState(0);
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (t: number) => { if (t - last > 50) { last = t; setU((t % 1600) / 1600); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const e = 1 - (1 - u) * (1 - u);
  return <View pointerEvents="none" style={{ position: "absolute", left: left - size / 2, top: top - size / 2, width: size, height: size, borderRadius: 999, borderWidth: 2, borderColor: "#fff", opacity: 0.9 * (1 - e), transform: [{ scale: 0.6 + 1.3 * e }] }} />;
}

export function Road({ seed, resume, restart }: { seed: Seed; resume?: string; restart: () => void }) {
  const [road, setRoad] = useState<RoadView | null>(null);
  const [err, setErr] = useState("");
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [s, setS] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<DitherMode>("trail");
  const [follow, setFollow] = useState<string | null>(null);
  const [panel, setPanel] = useState<"variants" | "profile" | null>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [peek, setPeek] = useState<TreeNode | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  const anim = useRef(0);

  // The server owns the road. Start once, then poll: fast while it paves, slow otherwise.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // A prior road from the home screen reopens as it was left; otherwise a new road starts from the seed.
    (resume ? fetchRoad(resume) : startSession(seed)).then(setRoad).catch((e) => setErr(String(e.message ?? e)));
  }, [seed, resume]);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!road) return;
    // A failed poll schedules another one, so one network blip never freezes the road.
    const t = setTimeout(() => fetchRoad(road.session_id).then(setRoad).catch((e) => { setErr(String(e.message ?? e)); setRetryTick((n) => n + 1); }), road.paving ? 400 : 1500);
    return () => clearTimeout(t);
  }, [road, retryTick]);
  const act = (p: Promise<RoadView>) => p.then((r) => { setErr(""); setRoad(r); return r; }).catch((e) => { setErr(String(e.message ?? e)); return null; });
  const sid = road?.session_id ?? "";
  // Paths panel: refetch the whole tree whenever the road changes while it is open.
  useEffect(() => { if (panel === "variants" && sid) fetchTree(sid).then(setTreeNodes).catch(() => {}); }, [panel, road, sid]);
  useEffect(() => { fetchMeta().then(setMeta).catch(() => {}); }, []);

  const shown: Segment[] = useMemo(() => (road?.nodes ?? []).map((n) => ({ id: n.id, el: n.element, source: n.source, message: n.message, blocks: n.blocks, answer: n.answer })), [road]);
  const gi = shown.findIndex((x) => x.blocks);
  const L = useMemo(() => layout(shown, gi, !!road?.paving, W, H), [shown, gi, road?.paving, W, H]);
  const cs = Math.min(s, L.maxS);
  const placed = useMemo(() => camera(L, cs, W, H), [L, cs, W, H]);

  // Scroll animation used after a lane pick: glide through the zoom into the picked lane.
  const glide = (to: number) => {
    cancelAnimationFrame(anim.current);
    const from = cs, t0 = Date.now(), ms = 1200;
    const tick = () => {
      const u = Math.min(1, (Date.now() - t0) / ms), y = from + (to - from) * ease(u);
      scroller.current?.scrollTo({ y, animated: false });
      setS(y);
      if (u < 1) anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    if (!follow) return;
    const sec = L.sections.find((x) => x.seg?.id === follow && (x.chosen ?? -1) >= 0);
    if (!sec) return;
    setFollow(null);
    glide(Math.min(L.maxS, zoomEnd(L, sec, H)));
  }, [follow, L]);

  const pickLane = async (seg: Segment, j: number) => {
    const cur = seg.answer?.option_index ?? -1;
    if (cur === j) return setFollow(seg.id);
    if (cur >= 0) await act(sendChange(sid, seg.id));
    const r = await act(sendAnswer(sid, seg.id, { option_index: j }));
    if (r) setFollow(seg.id);
  };

  // Inline cards call through a ref, so their memoized bodies never hold stale handlers.
  const cardActions = useRef<CardActions>(null!);
  useLayoutEffect(() => {
    cardActions.current = {
      answer: (seg, p) => { if ("option_index" in p) return void pickLane(seg, p.option_index); act(sendAnswer(sid, seg.id, p)); },
      change: (seg) => act(sendChange(sid, seg.id)),
      retry: (seg) => act(sendRetry(sid, seg.id)),
      home: restart,
    };
  });

  // At an open fork on screen, sideways and upward drags pick a lane; downward drags still scroll back.
  const [preview, setPreview] = useState(-1);
  const gateSec = L.sections.at(-1);
  const gate = gateSec?.seg && gateSec.n && (gateSec.chosen ?? -1) < 0 && cs >= L.maxS - 4 ? { seg: gateSec.seg, n: gateSec.n } : null;
  const gateRef = useRef(gate); gateRef.current = gate;
  const pickRef = useRef(pickLane); pickRef.current = pickLane;
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !!gateRef.current && ((Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy)) || g.dy < -12),
    onPanResponderMove: (_, g) => { const q = gateRef.current; setPreview(q ? laneForSwipe(g.dx, g.dy, q.n) : -1); },
    onPanResponderRelease: (_, g) => { const q = gateRef.current; setPreview(-1); if (!q) return; const j = laneForSwipe(g.dx, g.dy, q.n); if (j >= 0) pickRef.current(q.seg, j); },
    onPanResponderTerminate: () => setPreview(-1),
    onPanResponderTerminationRequest: () => false,
  })).current;

  const t = road?.trip ?? { pipe: "intro" as const, goal: "", scenario: null };
  const goalSeg = shown.find((x) => x.answer?.rules.some((r) => r.key === "scenario" || r.key === "goal"));
  const active = road?.rules ?? [];
  const openSeg = shown.find((x) => x.id === open);
  const show = (id: string) => setOpen(id);
  const personaSeg = shown.find((x) => x.el.type === "fork" && x.el.opts.some((o) => o.rule.key === "persona")) ?? null;
  const personaRule = personaSeg && personaSeg.el.type === "fork" && personaSeg.answer?.option_index != null ? personaSeg.el.opts[personaSeg.answer.option_index]?.rule : null;
  const personaId = personaRule && personaRule.kind === "set" ? String(personaRule.value) : null;
  const roadIds = useMemo(() => new Set(shown.map((x) => x.id)), [shown]);
  // Each choice on the road, in order. Tapping one glides back to the exact stop where it was made, to choose differently.
  const picks = shown.filter((x) => x.answer && ["fork", "thisthat", "compare", "ask"].includes(x.el.type));
  const jumpTo = (id: string) => {
    const sec = L.sections.find((x) => x.seg?.id === id);
    if (sec) glide(Math.max(0, Math.min(L.maxS, sec.T)));
  };
  const barBtn = { minHeight: 48, minWidth: 48, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(244,245,248,0.95)", borderWidth: 1, borderColor: C.border, flexDirection: "row" as const, alignItems: "center" as const, gap: 6 };

  const marks = placed.flatMap((p: Placed) => {
    const sec = p.sec, seg = sec.seg, out: React.ReactNode[] = [];
    // Marks only show on chunks drawn near screen scale; the zoom itself carries the scene.
    const scale = p.r.w / W;
    if (scale < 0.8 || scale > 1.6) return out;
    if (sec.n && seg) {
      const sign = at(p, 0.5, 0.12), opts = choiceOpts(seg), chosen = sec.chosen ?? -1;
      if (scale < 1.15) out.push(
        <Pressable key={seg.id + "-sign"} onPress={() => show(seg.id)} testID="fork-sign" style={{ position: "absolute", left: Math.max(10, Math.min(W - 250, sign.x - 120)), top: sign.y, width: 240, alignItems: "center" }}>
          <View style={{ backgroundColor: "rgba(244,245,248,0.96)", borderRadius: 10, borderWidth: 0.9, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 7, minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontFamily: F.head, fontSize: 16, color: C.ink, textAlign: "center" }}>{(seg.el as { prompt: string }).prompt}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 11, color: C.sub, textAlign: "center" }}>{chosen >= 0 ? `✓ ${seg.answer!.label} · tap a lane to change` : sec.n === 3 ? "swipe left, right, or scroll down" : "swipe left or right"}</Text>
          </View>
        </Pressable>,
      );
      const lw = Math.min(140, p.r.w / sec.n - 18);
      opts.slice(0, sec.n).forEach((o, j) => {
        const lp = lanePoint(sec.kind, j), q = at(p, lp.x, lp.y), picked = j === chosen || (chosen < 0 && j === preview), dim = (chosen >= 0 && j !== chosen) || (preview >= 0 && j !== preview);
        if (!picked && scale > 1.1) return;
        out.push(
          <Pressable key={`${seg.id}-${j}`} testID={`lane-${j}`} accessibilityRole="button" accessibilityLabel={o.label} onPress={() => pickLane(seg, j)}
            style={{ position: "absolute", left: q.x - lw / 2, top: q.y - 58, width: lw, alignItems: "center", opacity: dim ? 0.5 : 1 }}>
            {chosen < 0 ? <Ring size={30} left={lw / 2} top={8} /> : null}
            <Image source={PIN} style={{ width: 23, height: 58 }} />
            <View style={{ marginTop: 4, backgroundColor: picked ? "#2f3a4a" : "rgba(244,245,248,0.96)", borderRadius: 8, borderWidth: 0.9, borderColor: C.border, paddingHorizontal: 6, paddingVertical: 5, minHeight: 44, width: lw, justifyContent: "center" }}>
              <Text numberOfLines={2} style={{ fontFamily: F.head, fontSize: 13, lineHeight: 15, color: picked ? "#fff" : C.ink, textAlign: "center" }}>{j === chosen ? "✓ " : ""}{o.label}</Text>
              {o.sub ? <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 10.5, color: picked ? "#d7dde5" : C.sub, textAlign: "center" }}>{o.sub}</Text> : null}
            </View>
          </Pressable>,
        );
      });
      return out;
    }
    return out;
  });

  // Straight stretches carry their stop as a full card. Cards live inside the ScrollView (content coordinates),
  // so a drag that starts on a card still scrolls the road. On a straight stretch cs + p.r.y is constant.
  const rulesNow = active.map((r) => r.text).join("\n");
  const cards = placed.flatMap((p: Placed) => {
    const sec = p.sec, seg = sec.seg;
    if (sec.n) return [];
    const scale = p.r.w / W;
    if (scale < 0.8 || scale > 1.6) return [];
    const fade = Math.max(0, Math.min(1, 1 - (Math.abs(scale - 1) - 0.08) / 0.25));
    const base = Math.min(p.r.h * 0.12, 120) + insets.top;
    const key = sec.ghost ? `ghost${p.i}` : seg!.id;
    if (seg?.el.type === "deck") {
      // A deck pins near the top while its stretch scrolls past; that scroll deals the cards.
      const travel = Math.max(1, p.r.h - base - 340);
      const screenTop = Math.min(Math.max(base, p.r.y + base), p.r.y + base + travel);
      const progress = Math.max(0, Math.min(1, -p.r.y / travel));
      return [
        <View key={key} pointerEvents={fade < 0.5 ? "none" : "box-none"} style={{ position: "absolute", top: cs + screenTop, left: 12, right: 12, opacity: fade }}>
          <Deck seg={seg} progress={progress} still={reduceMotion} />
        </View>,
      ];
    }
    const top = cs + p.r.y + base;
    // Scroll-linked: in the lower 40% of the screen a card sits down and to the right, and slides diagonally into place as it rises.
    const u = reduceMotion ? 0 : Math.max(0, Math.min(1, (top - cs - H * 0.6) / (H * 0.4)));
    return [
      <View key={key} pointerEvents={fade < 0.5 ? "none" : "box-none"}
        style={{ position: "absolute", top, left: 12, right: 12, opacity: fade * (1 - 0.7 * u), transform: [{ translateX: 140 * u }, { translateY: 90 * u }] }}>
        {sec.ghost ? <PavingCard /> : <CardBody seg={seg!} rulesNow={rulesNow} actions={cardActions} />}
      </View>,
    ];
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#22301f" }}>
      <TerrainCanvas placed={placed} W={W} H={H} mode={mode} />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} testID="swipe">
        <ScrollView ref={scroller} style={StyleSheet.absoluteFill} contentContainerStyle={{ height: H + L.maxS }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled"
          onScroll={(e) => setS(e.nativeEvent.contentOffset.y)} onScrollBeginDrag={() => cancelAnimationFrame(anim.current)} showsVerticalScrollIndicator={false} testID="road">
          {cards}
        </ScrollView>
        {/* Fork pins live inside the swipe layer, so a swipe that starts on a pin still picks a lane. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">{marks}</View>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable onPress={restart} testID="home" accessibilityRole="button" accessibilityLabel="Back to home" style={barBtn}>
          <IconBack /><Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>Home</Text>
        </Pressable>
        <Pressable onPress={() => setPanel("variants")} testID="variants" accessibilityRole="button" accessibilityLabel="Show saved variants" style={barBtn}>
          <IconPaths /><Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>Variants</Text>
        </Pressable>
        <View style={{ flex: 1 }} pointerEvents="none" />
        <Pressable onPress={() => setPanel("profile")} testID="profile" accessibilityRole="button" accessibilityLabel="Profile and settings" style={barBtn}>
          <IconPerson /><Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>Profile</Text>
        </Pressable>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10, gap: 8 }}>
        {err ? <Text style={[T.p, { color: "#fff", textShadowColor: "#000", textShadowRadius: 4 }]}>{err}</Text> : null}
        <View style={{ minHeight: 52, borderRadius: 999, backgroundColor: "rgba(244,245,248,0.95)", borderWidth: 1, borderColor: C.border, flexDirection: "row", alignItems: "center", paddingLeft: 16, gap: 8, overflow: "hidden" }} testID="choices-bar">
          <Text style={{ fontFamily: F.head, fontSize: 14, color: C.ink }}>Choices</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 12, alignItems: "center" }}>
            {picks.length ? picks.map((p, i) => (
              <Pressable key={p.id} onPress={() => jumpTo(p.id)} accessibilityRole="button" accessibilityLabel={`Go back to: ${p.answer!.label}`} testID={`choice-${i}`}
                style={({ pressed }) => [{ minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: C.sel, paddingHorizontal: 12, justifyContent: "center", backgroundColor: pressed ? "#e6e8eb" : "#fff" }]}>
                <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 14, color: C.ink, maxWidth: 180 }}>{p.answer!.label}</Text>
              </Pressable>
            )) : <Text style={{ fontFamily: F.body, fontSize: 14, color: C.sub }}>appear here as you pick</Text>}
          </ScrollView>
        </View>
      </View>

      {openSeg ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,20,30,0.35)" }]} onPress={() => setOpen(null)} testID="sheet-backdrop" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(180)} style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10, maxHeight: H * 0.8 }}>
            <ScrollView testID="sheet" contentContainerStyle={{ paddingTop: 4 }}>
              <CloseCtx.Provider value={() => setOpen(null)}>
                <MessageCtx.Provider value={openSeg.message}>
                  <Widget seg={openSeg} rulesNow={active.map((r) => r.text)}
                    answer={(p: AnswerPayload) => {
                      setTimeout(() => setOpen(null), 450);
                      if ("option_index" in p) return void pickLane(openSeg, p.option_index);
                      act(sendAnswer(sid, openSeg.id, p));
                    }}
                    change={() => { act(sendChange(sid, openSeg.id)); setOpen(null); }}
                    retry={() => { act(sendRetry(sid, openSeg.id)); setOpen(null); }}
                    onGoal={restart} onExplore={restart} />
                </MessageCtx.Provider>
              </CloseCtx.Provider>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
      {peek && peek.element ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,20,30,0.35)" }]} onPress={() => setPeek(null)} testID="peek-backdrop" />
          <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10, maxHeight: H * 0.8, gap: 8 }}>
            <ScrollView testID="peek">
              <CloseCtx.Provider value={() => setPeek(null)}>
                <MessageCtx.Provider value="A result from another set of choices. To get here again, tap a choice in the bar at the bottom of the road.">
                  <View pointerEvents="none">
                    <Widget seg={{ id: peek.id, el: peek.element, source: peek.source ?? "fixed", message: peek.message ?? "", blocks: false, answer: peek.answer ? { ...peek.answer, rules: [] } : null }}
                      rulesNow={[]} answer={() => {}} change={() => {}} retry={() => {}} onGoal={() => {}} onExplore={() => {}} />
                  </View>
                </MessageCtx.Provider>
              </CloseCtx.Provider>
            </ScrollView>
            <Pressable onPress={() => setPeek(null)} accessibilityRole="button" testID="peek-close" style={[barBtn, { justifyContent: "center" }]}>
              <Text style={{ fontFamily: F.head, fontSize: 15, color: C.ink }}>Close preview</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {panel === "variants" ? (
        <Drawer side="left" title="Variants" onClose={() => setPanel(null)} testID="variants-panel">
          <VariantsPanel nodes={treeNodes} roadIds={roadIds} onOpen={(n, onRoad) => { setPanel(null); if (onRoad) { jumpTo(n.id); show(n.id); } else setPeek(n); }} />
        </Drawer>
      ) : null}
      {panel === "profile" ? (
        <Drawer side="right" title="Profile" onClose={() => setPanel(null)} testID="profile-panel">
          <ProfilePanel meta={meta} personaId={personaId} personaSeg={personaSeg} onPersona={(j) => { setPanel(null); if (personaSeg) pickLane(personaSeg, j); }}
            scenario={t.scenario} goal={goalSeg?.answer?.label ?? t.goal} weekly={active.find((r) => r.key === "weekly")?.text ?? null} mode={mode} setMode={setMode} />
        </Drawer>
      ) : null}
    </View>
  );
}

export { Paving };
