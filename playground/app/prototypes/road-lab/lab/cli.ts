// road-lab CLI: npm run lab -- fixtures | run <pack|all> <persona|all> [--live] [--seed n] | compare <idA> <idB>
import { PACK_IDS } from "../packs";
import type { PackId } from "../types";
import { runFixtures, walkFallback } from "./fixtures";

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "fixtures") {
    const r = runFixtures();
    console.log(r.lines.join("\n"));
    const walks: string[] = [];
    let walkFail = 0;
    for (const p of PACK_IDS)
      for (const pace of ["rush", "steady", "linger"] as const)
        for (const branch of [0, 1, 2]) {
          const w = walkFallback(p as PackId, pace, branch);
          if (!w.ok) walkFail++;
          walks.push(`${w.ok ? "PASS" : "FAIL"}  fallback walk ${p.padEnd(12)} pace=${pace.padEnd(6)} branch=${branch} → Rome in ${w.tiles} tiles${w.ok ? "" : "\n      " + w.log.join("\n      ")}`);
        }
    console.log(walks.join("\n"));
    if (r.uncovered.length) console.log(`UNCOVERED invariants (no reject fixture): ${r.uncovered.join(", ")}`);
    const total = r.failures + walkFail;
    console.log(`\n${r.lines.length} fixtures, ${walks.length} fallback walks, ${total} failure(s)`);
    process.exit(total ? 1 : 0);
  }
  if (cmd === "run" || cmd === "compare") {
    const { runCommand, compareCommand } = await import("./runner");
    if (cmd === "run") await runCommand(rest);
    else compareCommand(rest);
    return;
  }
  console.log("usage: npm run lab -- fixtures | run <pack|all> <persona|all> [--live] [--seed n] | compare <idA> <idB>");
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
