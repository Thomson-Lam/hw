# 2026-11-21T09-25-15-sun-life-switcher-sim-s1

| metric | value |
|---|---|
| pack | sun-life |
| persona | switcher |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 12 |
| time_s | 50.5 |
| stall_s | 0 |
| llm_coverage | 1 |
| pave_calls | 4 |
| attempts | 5 |
| rewrites | 1 |
| rejects_by_invariant | {"unknown-topic":1,"grounded-text":1} |
| replaced | 4 |
| late | 0 |
| fallback_tiles_seen | 0 |
| llm_tiles_seen | 7 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | ["(avoid talking)"] |
| paver_ms_p50 | 989 |
| paver_ms_p95 | 1236 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"weighing","branches":[{"label":"Money","value":"money","result":null,"lead":{"kind":"signpost","fact":"money-stress-co
lead     {"kind":"signpost","fact":"talk-one","label":null,"topic":null}
llm      {"kind":"fork","key":"care","branches":[{"label":"Talk to someone","value":"counselling","result":null,"lead":{"kind":"signpost","fact":"cou
lead     {"kind":"signpost","fact":"counselling-what","label":null,"topic":null}
llm      {"kind":"signpost","fact":"plan-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"unused","label":null,"topic":null}
llm      {"kind":"signpost","fact":"sleep-routine","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"coverage"}
llm      {"kind":"checkpoint","check":"cost"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
