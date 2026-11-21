import { registerRootComponent } from "expo";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export function boot() {
  LoadSkiaWeb({ locateFile: () => "/canvaskit.wasm" }).then(() => registerRootComponent(require("../App").default));
}
