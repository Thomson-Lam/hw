import { walk } from "./walk.mjs";
const base = process.argv[2]; const out = process.argv[3];
for (const pack of ["canada-life", "sun-life", "merch-trail"]) {
  const r = await walk({ base, pack, out: `${out}/${pack}` });
  console.log(JSON.stringify({ ...r, sources: r.sources.join(" ") }));
}
