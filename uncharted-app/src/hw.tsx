import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { createContext, ReactNode, useContext, useId } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";

export const C = {
  surface: "#f4f5f8",
  border: "#9F9F9F",
  dot: "#C8C8C8",
  title: "#626262",
  ink: "#111111",
  sub: "#4b4f55",
  faint: "#8a8f96",
  sel: "#2f3a4a",
};
export const F = { head: "CossetteTexte-Bold", label: "CossetteTexte-Regular", body: "Figtree" };

const LIGHTS = [require("../assets/hw/traffic-red.svg"), require("../assets/hw/traffic-yellow.svg"), require("../assets/hw/traffic-green.svg")];
const LAYERS = [require("../assets/hw/mountain-4.webp"), require("../assets/hw/mountain-3.webp"), require("../assets/hw/mountain-2.webp"), require("../assets/hw/mountain-1.webp")];

export function Mountains({ anchor = "center" }: { anchor?: "center" | "bottom" }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["rgb(0,52,78)", "rgb(97,158,184)", "rgb(181,217,233)", "rgb(117,198,199)"]} style={StyleSheet.absoluteFill} />
      {LAYERS.map((src, i) => (
        <Image key={i} source={src} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={anchor === "bottom" ? "bottom" : "center"} />
      ))}
    </View>
  );
}

function Dots() {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
          <Rect x={5} y={5} width={1.2} height={1.2} fill={C.dot} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export const CloseCtx = createContext<(() => void) | undefined>(undefined);
// The agent's message for the open tile, shown as the first line of its window.
export const MessageCtx = createContext<string | undefined>(undefined);
// The choices made on this road, in order, and a way back to each one.
export type Pick = { id: string; prompt: string; label: string };
export const PicksCtx = createContext<{ picks: Pick[]; jump: (id: string) => void }>({ picks: [], jump: () => {} });

export function Window({ title, children, style, dim, testID, onClose: close }: { title: string; children: ReactNode; style?: ViewStyle; dim?: boolean; testID?: string; onClose?: () => void }) {
  const ctxClose = useContext(CloseCtx);
  const message = useContext(MessageCtx);
  const onClose = close ?? ctxClose;
  return (
    <View style={[s.win, dim && { opacity: 0.72 }, style]} testID={testID}>
      <LinearGradient colors={["#eceeef", "#c8cbcf"]} style={s.bar}>
        <Text numberOfLines={1} style={s.barText}>{title}</Text>
        <View style={s.lights}>
          {LIGHTS.map((src, i) => (
            <Pressable key={i} onPress={i < 2 ? onClose : undefined} disabled={!onClose || i === 2} hitSlop={8} accessibilityRole="button" accessibilityLabel={i < 2 ? "Close window" : "Window"} testID={i === 0 ? "close-window" : undefined}>
              <Image source={src} style={s.light} />
            </Pressable>
          ))}
        </View>
      </LinearGradient>
      <View style={s.body}>
        <Dots />
        <View style={s.inner}>
          {message ? <Text testID="tile-message" style={{ fontFamily: F.body, fontSize: 14, lineHeight: 19, color: C.sel, fontStyle: "italic" }}>{message}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

export function Pill({ label, sub, onPress, selected, disabled, big, testID, flex }: { label: string; sub?: string; onPress?: () => void; selected?: boolean; disabled?: boolean; big?: boolean; testID?: string; flex?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected, disabled }} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.pillWrap, flex && { flex: 1 }, pressed && { transform: [{ scale: 0.97 }] }, disabled && !selected && { opacity: 0.45 }]}>
      <LinearGradient colors={selected ? ["#3b4656", "#222a35"] : ["#fbfbfb", "#d9d9d9"]} style={[s.pill, big && s.pillBig]}>
        <Text style={[s.pillText, selected && { color: "#fff" }, big && { fontFamily: F.head, fontSize: 16 }]}>{selected ? "✓ " : ""}{label}</Text>
        {sub ? <Text style={[s.pillSub, selected && { color: "#d7dde5" }]}>{sub}</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

export function Chip({ text, onPress, testID }: { text: string; onPress?: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} disabled={!onPress} style={s.chip} hitSlop={6}>
      <Text style={s.chipText}>{text}{onPress ? "  ×" : ""}</Text>
    </Pressable>
  );
}

export const T = StyleSheet.create({
  h: { fontFamily: F.head, fontSize: 22, lineHeight: 26, color: C.ink },
  h2: { fontFamily: F.head, fontSize: 18, lineHeight: 22, color: C.ink },
  p: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.sub },
  k: { fontFamily: F.label, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.faint },
  link: { fontFamily: F.body, fontSize: 15, color: C.ink, textDecorationLine: "underline", paddingVertical: 10 },
});

const s = StyleSheet.create({
  win: { borderRadius: 10, borderWidth: 0.9, borderColor: C.border, backgroundColor: C.surface, overflow: "hidden", shadowColor: "#1e283c", shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  bar: { height: 34, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 0.9, borderBottomColor: "#fff" },
  lights: { flexDirection: "row", gap: 9, zIndex: 1, marginLeft: "auto" },
  light: { width: 14, height: 14 },
  barText: { position: "absolute", left: 12, right: 84, textAlign: "left", fontFamily: F.label, fontSize: 11, color: C.title },
  body: { backgroundColor: C.surface },
  inner: { padding: 20, gap: 16 },
  pillWrap: { borderRadius: 999, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pill: { minHeight: 46, borderRadius: 999, borderWidth: 1, borderColor: "#b5b5b5", paddingHorizontal: 18, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  pillBig: { minHeight: 64, borderRadius: 18 },
  pillText: { fontFamily: F.body, fontSize: 15, color: "#333", textAlign: "center" },
  pillSub: { fontFamily: F.body, fontSize: 12, color: "#666", textAlign: "center", marginTop: 2 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: "#b9bcc2", backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 4, minHeight: 28, justifyContent: "center" },
  chipText: { fontFamily: F.body, fontSize: 12, color: C.sub },
});
