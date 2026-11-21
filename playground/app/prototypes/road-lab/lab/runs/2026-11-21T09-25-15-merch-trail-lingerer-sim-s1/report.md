# 2026-11-21T09-25-15-merch-trail-lingerer-sim-s1

| metric | value |
|---|---|
| pack | merch-trail |
| persona | lingerer |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 14 |
| time_s | 85.1 |
| stall_s | 0 |
| llm_coverage | 1 |
| pave_calls | 3 |
| attempts | 3 |
| rewrites | 0 |
| rejects_by_invariant | {} |
| replaced | 3 |
| late | 0 |
| fallback_tiles_seen | 0 |
| llm_tiles_seen | 9 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 648 |
| paver_ms_p95 | 798 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"signpost","fact":"merch-goal","label":null,"topic":null}
opening  {"kind":"fork","key":"style","branches":[{"label":"Realistic","value":"realistic","result":null,"lead":{"kind":"signpost","fact":"horse-them
lead     {"kind":"signpost","fact":"pla-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"horse-theme","label":null,"topic":null}
llm      {"kind":"signpost","fact":"supports-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"license-basics","label":null,"topic":null}
llm      {"kind":"search","query":"low poly horse","style":"low-poly","supports":"any"}
llm      {"kind":"pick","result":"130368"}
llm      {"kind":"pick","result":"151101"}
llm      {"kind":"fork","key":"pick","branches":[{"label":null,"value":null,"result":"130368","lead":{"kind":"vista","fact":null,"label":"Your pick"}
lead     {"kind":"vista","fact":null,"label":"Your pick"}
llm      {"kind":"checkpoint","check":"license"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
