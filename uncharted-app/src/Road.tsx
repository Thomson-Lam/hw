import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnswerPayload, fetchRoad, Road as RoadView, Seed, sendAnswer, sendChange, sendErase, sendRetry, startSession } from "./api";
import { Segment } from "./contract";
import { C, Chip, CloseCtx, F, MessageCtx, T, Window } from "./hw";
import { DitherMode, TerrainCanvas } from "./TerrainCanvas";
import { at, camera, choiceOpts, lanePoint, laneForSwipe, layout, Placed, straightPoint, zoomEnd } from "./terrain";
import { Paving, pinLabel, Widget } from "./widgets";

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

// A Hack Western pin beside the road, with its label on the outer side.
function PinMark({ x, y, k, pulseOn, label, note, side, onPress, testID, dim }: { x: number; y: number; k: number; pulseOn: boolean; label: string; note?: string; side: number; onPress?: () => void; testID?: string; dim?: boolean }) {
  const h = 58 * k, w = h / 2.5, lw = 150, sw = useWindowDimensions().width;
  const lx = Math.min(sw - lw - 8, Math.max(8, side < 0 ? x - w / 2 - 6 - lw : x + w / 2 + 6));
  const bx = Math.min(lx, x - w / 2), by = y - h * 0.97, bw = Math.max(lx + lw, x + w / 2) - bx;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={label} style={{ position: "absolute", left: bx, top: by, width: bw, height: Math.max(h, 52), opacity: dim ? 0.6 : 1 }}>
      {pulseOn ? <Ring size={h * 0.5} left={x - bx} top={w * 0.36} /> : null}
      <Image source={PIN} style={{ position: "absolute", left: x - w / 2 - bx, top: 0, width: w, height: h }} />
      <View style={{ position: "absolute", top: 0, left: lx - bx, width: lw, minHeight: 44, justifyContent: "center", backgroundColor: "rgba(244,245,248,0.95)", borderRadius: 8, borderWidth: 0.9, borderColor: C.border, paddingHorizontal: 9, paddingVertical: 5 }}>
        <Text numberOfLines={2} style={{ fontFamily: F.head, fontSize: 13, lineHeight: 15, color: C.ink }}>{label}</Text>
        {note ? <Text numberOfLines={1} style={{ fontFamily: F.body, fontSize: 11, color: C.sub }}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Road({ seed, restart }: { seed: Seed; restart: () => void }) {
  const [road, setRoad] = useState<RoadView | null>(null);
  const [err, setErr] = useState("");
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [mode, setMode] = useState<DitherMode>("trail");
  const [follow, setFollow] = useState<string | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  const anim = useRef(0);

  // The server owns the road. Start once, then poll: fast while it paves, slow otherwise.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startSession(seed).then(setRoad).catch((e) => setErr(String(e.message ?? e)));
  }, [seed]);
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    if (!road) return;
    // A failed poll schedules another one, so one network blip never freezes the road.
    const t = setTimeout(() => fetchRoad(road.session_id).then(setRoad).catch((e) => { setErr(String(e.message ?? e)); setRetryTick((n) => n + 1); }), road.paving ? 400 : 1500);
    return () => clearTimeout(t);
  }, [road, retryTick]);
  const act = (p: Promise<RoadView>) => p.then((r) => { setErr(""); setRoad(r); return r; }).catch((e) => { setErr(String(e.message ?? e)); return null; });
  const sid = road?.session_id ?? "";

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
  const show = (id: string) => { setOpen(id); setSeen((x) => (x.includes(id) ? x : [...x, id])); };

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
    const sp = straightPoint(sec.kind, sec.side), q = at(p, sp.x, sp.y), k = Math.min(1.4, Math.max(0.6, p.zoom));
    if (sec.ghost) { out.push(<PinMark key={`ghost${p.i}`} x={q.x} y={q.y} k={k} pulseOn dim label="Paving the road ahead…" note="from your picks" side={sec.side} testID="paving" />); return out; }
    const L2 = pinLabel(seg!), isGate = gi >= 0 && shown[gi].id === seg!.id;
    out.push(<PinMark key={seg!.id} x={q.x} y={q.y} k={k} pulseOn={isGate || !seen.includes(seg!.id)} label={L2.title} note={isGate ? "open to answer" : L2.note} side={sec.side} onPress={() => show(seg!.id)} testID={`pin-${seg!.el.type}`} />);
    return out;
  });

  return (
    <View style={{ flex: 1, backgroundColor: "#22301f" }}>
      <TerrainCanvas placed={placed} W={W} H={H} mode={mode} />
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers} testID="swipe">
        <ScrollView ref={scroller} style={StyleSheet.absoluteFill} contentContainerStyle={{ height: H + L.maxS }} scrollEventThrottle={16}
          onScroll={(e) => setS(e.nativeEvent.contentOffset.y)} onScrollBeginDrag={() => cancelAnimationFrame(anim.current)} showsVerticalScrollIndicator={false} testID="road" />
        {/* Pins live inside the swipe layer, so a swipe that starts on a pin still picks a lane. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">{marks}</View>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View pointerEvents="none" style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.head, fontSize: 28, lineHeight: 32, color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 10 }}>Uncharted</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.label, fontSize: 13, color: "#fff", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
            {t.pipe === "intro" ? "Swipe or tap to pick a lane." : `${t.pipe === "finance" ? "Your futures" : "Exploring"} · ${goalSeg?.answer?.label ?? t.goal}`}
          </Text>
        </View>
        <Pressable onPress={() => setMode(mode === "trail" ? "stream" : "trail")} testID="mode" accessibilityRole="button"
          style={{ minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(244,245,248,0.92)", borderWidth: 0.9, borderColor: C.border, justifyContent: "center" }}>
          <Text style={{ fontFamily: F.head, fontSize: 13, color: C.ink }}>{mode === "trail" ? "Trail" : "Stream"}</Text>
        </Pressable>
      </View>

      <View pointerEvents="box-none" style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10, gap: 8 }}>
        {err ? <Text style={[T.p, { color: "#fff", textShadowColor: "#000", textShadowRadius: 4 }]}>{err}</Text> : null}
        {rulesOpen ? (
          <Window title="Your rules · tap one to erase it" onClose={() => setRulesOpen(false)}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {active.length ? active.map((r) => <Chip key={r.id} text={r.text} testID={`erase-${r.key}`} onPress={() => act(sendErase(sid, r.id))} />) : <Text style={T.p}>Your picks become rules here.</Text>}
            </View>
            {road?.log ? <Text numberOfLines={3} testID="agent-log" style={[T.p, { fontSize: 11, color: C.faint }]}>{road.stopped ? `Model stopped (${road.stopped}). ` : ""}{road.log}</Text> : null}
          </Window>
        ) : null}
        <Pressable onPress={() => setRulesOpen(!rulesOpen)} accessibilityRole="button" testID="rules-toggle"
          style={{ minHeight: 46, borderRadius: 999, backgroundColor: "rgba(244,245,248,0.95)", borderWidth: 0.9, borderColor: C.border, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[T.p, { color: C.ink, fontFamily: F.head }]}>Your rules · {active.length}</Text>
          <Text numberOfLines={1} style={[T.p, { flex: 1, fontSize: 13 }]} testID="log">{active.length ? active.map((r) => r.text).join(" · ") : "picks become rules"}</Text>
          <Text style={T.p}>{rulesOpen ? "▾" : "▴"}</Text>
        </Pressable>
      </View>

      {openSeg ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,20,30,0.35)" }]} onPress={() => setOpen(null)} testID="sheet-backdrop" />
          <View style={{ position: "absolute", left: 10, right: 10, bottom: insets.bottom + 10, maxHeight: H * 0.8 }}>
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
          </View>
        </View>
      ) : null}
    </View>
  );
}

export { Paving };
