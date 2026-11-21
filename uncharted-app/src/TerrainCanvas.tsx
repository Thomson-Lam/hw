import { AlphaType, Canvas, ColorType, Image, ImageShader, Rect, Shader, Skia, SkImage, useImage } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { IMAGES, Kind, maskBytes, MH, MW, Placed } from "./terrain";

export type DitherMode = "trail" | "stream";

// Hack Western's hero dither: 3 pt cells, 8x8 Bayer (0..252), lit when bayer < 48 * proximity * breathe.
// "stream" raises the threshold and adds a light band that flows down the road over time.
const SKSL = `
uniform shader mask;
uniform float2 origin;
uniform float2 size;
uniform float3 lanes;
uniform float4 cut;
uniform float time;
uniform float mode;

float bayer(float2 c) {
  float v = 0.0;
  float w = 16.0;
  for (int i = 0; i < 3; i++) {
    float bx = mod(c.x, 2.0);
    float by = mod(c.y, 2.0);
    v += w * (2.0 * bx + by * (3.0 - 4.0 * bx));
    c = floor(c / 2.0);
    w = w / 4.0;
  }
  return v * 4.0;
}

half4 main(float2 pos) {
  float2 cell = floor(pos / 3.0);
  float2 uv = ((cell + 0.5) * 3.0 - origin) / size;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return half4(0);
  if (uv.x > cut.x && uv.x < cut.x + cut.z && uv.y > cut.y && uv.y < cut.y + cut.w) return half4(0);
  half4 m = mask.eval(uv * float2(${MW}.0, ${MH}.0));
  float p = max(max(m.r * lanes.x, m.g * lanes.y), m.b * lanes.z);
  if (p <= 0.004) return half4(0);
  float breathe = 0.82 + 0.18 * sin(time / 700.0);
  float thr;
  if (mode < 0.5) {
    thr = 48.0 * p * breathe;
  } else {
    float yy = uv.y * 844.0;
    float flow = 0.62 + 0.38 * cos(6.2831853 * (yy - time * 0.045) / 90.0);
    thr = 150.0 * p * flow * breathe;
  }
  return bayer(cell) < thr ? half4(1.0, 1.0, 1.0, 1.0) : half4(0);
}`;
const EFFECT = Skia.RuntimeEffect.Make(SKSL)!;

const masks = new Map<Kind, SkImage>();
function maskImage(kind: Kind) {
  let img = masks.get(kind);
  if (!img) {
    img = Skia.Image.MakeImage({ width: MW, height: MH, alphaType: AlphaType.Opaque, colorType: ColorType.RGBA_8888 }, Skia.Data.fromBytes(maskBytes(kind)), MW * 4)!;
    masks.set(kind, img);
  }
  return img;
}

function Dither({ p, time, mode, W, H }: { p: Placed; time: number; mode: number; W: number; H: number }) {
  const { r } = p;
  const cut = p.cut ? [(p.cut.x - r.x) / r.w, (p.cut.y - r.y) / r.h, p.cut.w / r.w, p.cut.h / r.h] : [-1, -1, 0, 0];
  const uniforms = { origin: [r.x, r.y], size: [r.w, r.h], lanes: p.lanes, cut, time, mode };
  const x = Math.max(0, r.x), y = Math.max(0, r.y);
  return (
    <Rect x={x} y={y} width={Math.min(W, r.x + r.w) - x} height={Math.min(H, r.y + r.h) - y}>
      <Shader source={EFFECT} uniforms={uniforms}>
        <ImageShader image={maskImage(p.sec.kind)} fit="fill" rect={{ x: 0, y: 0, width: MW, height: MH }} />
      </Shader>
    </Rect>
  );
}

export function TerrainCanvas({ placed, W, H, mode }: { placed: Placed[]; W: number; H: number; mode: DitherMode }) {
  const imgs = {
    "straight-a": useImage(IMAGES["straight-a"]),
    "straight-b": useImage(IMAGES["straight-b"]),
    "straight-c": useImage(IMAGES["straight-c"]),
    "fork-2": useImage(IMAGES["fork-2"]),
    "fork-3": useImage(IMAGES["fork-3"]),
  } as Record<Kind, SkImage | null>;
  // The dither clock: a plain rAF loop at about 20 fps, local to the canvas so nothing else re-renders.
  const [time, setTime] = useState(0);
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (t: number) => { if (t - last > 50) { last = t; setTime(t); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const m = mode === "stream" ? 1 : 0;
  const sorted = placed;
  return (
    <Canvas style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} pointerEvents="none">
      {sorted.map((p) => (imgs[p.sec.kind] ? <Image key={`i${p.i}`} image={imgs[p.sec.kind]} x={p.r.x} y={p.r.y} width={p.r.w} height={p.r.h} fit="fill" /> : null))}
      {sorted.map((p) => <Dither key={`d${p.i}`} p={p} time={time} mode={m} W={W} H={H} />)}
    </Canvas>
  );
}
