# 2026-11-21T09-25-15-sun-life-rusher-sim-s1

| metric | value |
|---|---|
| pack | sun-life |
| persona | rusher |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 12 |
| time_s | 31.3 |
| stall_s | 0 |
| llm_coverage | 0.57 |
| pave_calls | 5 |
| attempts | 6 |
| rewrites | 1 |
| rejects_by_invariant | {"no-noise":1} |
| replaced | 2 |
| late | 2 |
| fallback_tiles_seen | 3 |
| llm_tiles_seen | 4 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | ["(avoid plan)","(avoid talking)"] |
| paver_ms_p50 | 835 |
| paver_ms_p95 | 1304 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"weighing","branches":[{"label":"Money","value":"money","result":null,"lead":{"kind":"signpost","fact":"money-stress-co
lead     {"kind":"signpost","fact":"money-stress-common","label":null,"topic":null}
llm      {"kind":"fork","key":"care","branches":[{"label":"Talk to someone","value":"counselling","result":null,"lead":{"kind":"signpost","fact":"cou
lead     {"kind":"signpost","fact":"counselling-what","label":null,"topic":null}
llm      {"kind":"signpost","fact":"plan-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"unused","label":null,"topic":null}
llm      {"kind":"signpost","fact":"talk-one","label":null,"topic":null}
fallback {"kind":"checkpoint","check":"coverage"}
fallback {"kind":"checkpoint","check":"cost"}
fallback {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
