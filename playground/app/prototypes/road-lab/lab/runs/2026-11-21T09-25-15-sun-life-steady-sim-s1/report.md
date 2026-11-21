# 2026-11-21T09-25-15-sun-life-steady-sim-s1

| metric | value |
|---|---|
| pack | sun-life |
| persona | steady |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 12 |
| time_s | 46.8 |
| stall_s | 0 |
| llm_coverage | 1 |
| pave_calls | 2 |
| attempts | 2 |
| rewrites | 0 |
| rejects_by_invariant | {} |
| replaced | 2 |
| late | 0 |
| fallback_tiles_seen | 0 |
| llm_tiles_seen | 7 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 1571 |
| paver_ms_p95 | 1571 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"weighing","branches":[{"label":"Money","value":"money","result":null,"lead":{"kind":"signpost","fact":"money-stress-co
lead     {"kind":"signpost","fact":"talk-one","label":null,"topic":null}
llm      {"kind":"signpost","fact":"plan-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"unused","label":null,"topic":null}
llm      {"kind":"signpost","fact":"sleep-routine","label":null,"topic":null}
llm      {"kind":"fork","key":"care","branches":[{"label":"Talk to someone","value":"counselling","result":null,"lead":{"kind":"signpost","fact":"cou
lead     {"kind":"signpost","fact":"counselling-what","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"coverage"}
llm      {"kind":"checkpoint","check":"cost"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
