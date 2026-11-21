import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

/** Frames are kept under the repo, as the snap build of ffmpeg cannot read `/tmp`. */
const WORK_DIR = resolve(import.meta.dirname, "../../.capture")

/**
 * Records `region` of the page (CSS px), `scale` times sharper, by taking screenshots back to back, each stamped with when it was taken.
 * The DevTools screencast would be lighter, but in headless mode it sends frames at CSS size, which blurs the text.
 * `stop` returns the frames with how long each stayed on screen, ready for `encodeGif`.
 */
export async function startRecording(page, name, region, scale = 2) {
  const dir = resolve(WORK_DIR, name)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const session = await page.context().newCDPSession(page)
  const frames = []
  const controller = new AbortController()
  const done = (async () => {
    while (!controller.signal.aborted) {
      const at = performance.now()
      const { data } = await session.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true, clip: { ...region, scale } })
      const file = resolve(dir, `${String(frames.length).padStart(5, "0")}.png`)
      writeFileSync(file, Buffer.from(data, "base64"))
      frames.push({ file, at })
    }
  })()

  return {
    async stop() {
      controller.abort()
      await done
      const end = performance.now()
      return { dir, frames: frames.map((frame, i) => ({ ...frame, seconds: ((frames[i + 1]?.at ?? end) - frame.at) / 1000 })) }
    },
  }
}

/**
 * Turns recorded frames into looping GIFs: resampled to a steady `fps`, faded in and out from black so the loop does not jump, sized to `width`, and quantized with one palette made for the whole clip, so the black stays flat and the orange clean.
 * `output` plays `speedup` times faster, for the README; the real-time take is kept beside it as `*.1x.gif`.
 */
export function encodeGif({ dir, frames }, { output, fps = 25, width = 960, fade = 0.4, speedup = 2 }) {
  const seconds = frames.reduce((sum, frame) => sum + frame.seconds, 0)
  const list = resolve(dir, "frames.txt")
  writeFileSync(
    list,
    frames.map(({ file, seconds }) => `file '${file}'\nduration ${Math.max(seconds, 0.001).toFixed(4)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`,
  )
  for (const [speed, path] of [
    [1, output.replace(/\.gif$/, ".1x.gif")],
    [speedup, output],
  ]) {
    const length = seconds / speed
    const fades = fade ? `fade=t=in:d=${fade},fade=t=out:st=${(length - fade).toFixed(2)}:d=${fade},` : ""
    const filters = `setpts=PTS/${speed},fps=${fps},${fades}scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`
    const gif = resolve(dir, "clip.gif")
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-filter_complex", filters, "-loop", "0", gif], { stdio: "inherit" })
    execFileSync("cp", [gif, path])
  }
}
