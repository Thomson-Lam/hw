# 2026-11-21T09-25-15-merch-trail-rusher-sim-s1

| metric | value |
|---|---|
| pack | merch-trail |
| persona | rusher |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 14 |
| time_s | 32.3 |
| stall_s | 0.53 |
| llm_coverage | 0.33 |
| pave_calls | 5 |
| attempts | 5 |
| rewrites | 0 |
| rejects_by_invariant | {} |
| replaced | 2 |
| late | 2 |
| fallback_tiles_seen | 6 |
| llm_tiles_seen | 3 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | ["(avoid printing)"] |
| paver_ms_p50 | 931 |
| paver_ms_p95 | 1190 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"signpost","fact":"merch-goal","label":null,"topic":null}
opening  {"kind":"fork","key":"style","branches":[{"label":"Realistic","value":"realistic","result":null,"lead":{"kind":"signpost","fact":"horse-them
lead     {"kind":"signpost","fact":"horse-theme","label":null,"topic":null}
llm      {"kind":"search","query":"horse","style":"realistic","supports":"any"}
fallback {"kind":"signpost","fact":"pla-basics","label":null,"topic":null}
fallback {"kind":"signpost","fact":"supports-basics","label":null,"topic":null}
fallback {"kind":"signpost","fact":"license-basics","label":null,"topic":null}
fallback {"kind":"pick","result":"37427"}
fallback {"kind":"pick","result":"889420"}
fallback {"kind":"fork","key":"pick","branches":[{"label":null,"value":null,"result":"37427","lead":{"kind":"vista","fact":null,"label":"Your pick"}}
lead     {"kind":"vista","fact":null,"label":"Your pick"}
llm      {"kind":"checkpoint","check":"license"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
