# 2026-11-21T09-25-15-merch-trail-steady-sim-s1

| metric | value |
|---|---|
| pack | merch-trail |
| persona | steady |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 15 |
| time_s | 50.7 |
| stall_s | 0 |
| llm_coverage | 1 |
| pave_calls | 3 |
| attempts | 4 |
| rewrites | 1 |
| rejects_by_invariant | {"unknown-topic":1,"grounded-text":1,"all-roads-to-rome":1} |
| replaced | 3 |
| late | 0 |
| fallback_tiles_seen | 0 |
| llm_tiles_seen | 10 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 895 |
| paver_ms_p95 | 1724 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"signpost","fact":"merch-goal","label":null,"topic":null}
opening  {"kind":"fork","key":"style","branches":[{"label":"Realistic","value":"realistic","result":null,"lead":{"kind":"signpost","fact":"horse-them
lead     {"kind":"signpost","fact":"print-in-place","label":null,"topic":null}
llm      {"kind":"signpost","fact":"horse-theme","label":null,"topic":null}
llm      {"kind":"signpost","fact":"pla-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"supports-basics","label":null,"topic":null}
llm      {"kind":"search","query":"articulated horse","style":"articulated","supports":"any"}
llm      {"kind":"signpost","fact":"license-basics","label":null,"topic":null}
llm      {"kind":"pick","result":"584627"}
llm      {"kind":"pick","result":"1349914"}
llm      {"kind":"fork","key":"pick","branches":[{"label":null,"value":null,"result":"584627","lead":{"kind":"vista","fact":null,"label":"Your pick"}
lead     {"kind":"vista","fact":null,"label":"Your pick"}
llm      {"kind":"checkpoint","check":"license"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
