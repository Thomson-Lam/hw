# 2026-11-21T09-25-28-sun-life-steady-live-s7

| metric | value |
|---|---|
| pack | sun-life |
| persona | steady |
| mode | live |
| model | gemini-3.5-flash-lite |
| seed | 7 |
| reached_rome | true |
| tiles_to_rome | 13 |
| time_s | 48.7 |
| stall_s | 0 |
| llm_coverage | 0.38 |
| pave_calls | 3 |
| attempts | 7 |
| rewrites | 4 |
| rejects_by_invariant | {"lead-kind":2,"fork-values":10,"no-surprise-cost":16} |
| replaced | 1 |
| late | 0 |
| fallback_tiles_seen | 5 |
| llm_tiles_seen | 3 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 1898 |
| paver_ms_p95 | 2545 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"weighing","branches":[{"label":"Money","value":"money","result":null,"lead":{"kind":"signpost","fact":"money-stress-co
lead     {"kind":"signpost","fact":"plan-basics","label":null,"topic":null}
fallback {"kind":"signpost","fact":"unused","label":null,"topic":null}
fallback {"kind":"signpost","fact":"talk-one","label":null,"topic":null}
fallback {"kind":"signpost","fact":"sleep-routine","label":null,"topic":null}
fallback {"kind":"signpost","fact":"money-stress-common","label":null,"topic":null}
fallback {"kind":"fork","key":"care","branches":[{"label":"Talk to someone","value":"counselling","result":null,"lead":{"kind":"signpost","fact":"cou
lead     {"kind":"signpost","fact":"checkup-what","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"coverage"}
llm      {"kind":"checkpoint","check":"cost"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
