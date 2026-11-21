# 2026-11-21T09-25-22-canada-life-steady-live-s7

| metric | value |
|---|---|
| pack | canada-life |
| persona | steady |
| mode | live |
| model | gemini-3.5-flash-lite |
| seed | 7 |
| reached_rome | true |
| tiles_to_rome | 18 |
| time_s | 58.8 |
| stall_s | 0 |
| llm_coverage | 0.42 |
| pave_calls | 4 |
| attempts | 11 |
| rewrites | 7 |
| rejects_by_invariant | {"disclose-first":1,"limits-first":9,"stretch-size":2,"fork-last":1,"goal-realign":2,"syntax":2} |
| replaced | 2 |
| late | 0 |
| fallback_tiles_seen | 7 |
| llm_tiles_seen | 5 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 2146 |
| paver_ms_p95 | 2241 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"route","branches":[{"label":"Fast road","value":"fast","result":null,"lead":{"kind":"signpost","fact":"auto-contrib","
lead     {"kind":"vista","fact":null,"label":"The long view"}
fallback {"kind":"signpost","fact":"stocks-basics","label":null,"topic":null}
fallback {"kind":"signpost","fact":"compounding","label":null,"topic":null}
fallback {"kind":"signpost","fact":"stocks-swings","label":null,"topic":null}
fallback {"kind":"bridge","fact":"market-drops"}
llm      {"kind":"fork","key":"account","branches":[{"label":"First home","value":"fhsa","result":null,"lead":{"kind":"signpost","fact":"fhsa-basics"
lead     {"kind":"vista","fact":null,"label":"The open door"}
fallback {"kind":"vista","fact":"you-at-30","label":null}
fallback {"kind":"signpost","fact":"index-funds","label":null,"topic":null}
fallback {"kind":"fork","key":"account","branches":[{"label":"Flexible","value":"tfsa","result":null,"lead":{"kind":"signpost","fact":"tfsa-basics","
lead     {"kind":"signpost","fact":"fhsa-basics","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"risk"}
llm      {"kind":"checkpoint","check":"fees"}
llm      {"kind":"checkpoint","check":"limits"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
