# 2026-11-21T09-25-15-merch-trail-switcher-sim-s1

| metric | value |
|---|---|
| pack | merch-trail |
| persona | switcher |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 15 |
| time_s | 64.7 |
| stall_s | 0 |
| llm_coverage | 0.6 |
| pave_calls | 5 |
| attempts | 6 |
| rewrites | 1 |
| rejects_by_invariant | {"fork-arity":1} |
| replaced | 3 |
| late | 1 |
| fallback_tiles_seen | 4 |
| llm_tiles_seen | 6 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 989 |
| paver_ms_p95 | 1950 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"signpost","fact":"merch-goal","label":null,"topic":null}
opening  {"kind":"fork","key":"style","branches":[{"label":"Realistic","value":"realistic","result":null,"lead":{"kind":"signpost","fact":"horse-them
lead     {"kind":"signpost","fact":"print-in-place","label":null,"topic":null}
llm      {"kind":"search","query":"articulated horse","style":"articulated","supports":"any"}
fallback {"kind":"signpost","fact":"horse-theme","label":null,"topic":null}
fallback {"kind":"signpost","fact":"pla-basics","label":null,"topic":null}
fallback {"kind":"signpost","fact":"supports-basics","label":null,"topic":null}
fallback {"kind":"pick","result":"584627"}
llm      {"kind":"pick","result":"1349914"}
llm      {"kind":"fork","key":"pick","branches":[{"label":null,"value":null,"result":"584627","lead":{"kind":"vista","fact":null,"label":"Your pick"}
lead     {"kind":"vista","fact":null,"label":"Your pick"}
llm      {"kind":"signpost","fact":"license-basics","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"license"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
