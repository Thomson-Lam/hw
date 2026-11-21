import { boot } from "./src/boot";

// Native registers at once. Web (src/boot.web.ts) loads CanvasKit first, so the web loader never enters the iOS bundle.
boot();
