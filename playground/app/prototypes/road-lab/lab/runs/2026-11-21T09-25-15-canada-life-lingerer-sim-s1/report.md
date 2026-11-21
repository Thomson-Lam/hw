# 2026-11-21T09-25-15-canada-life-lingerer-sim-s1

| metric | value |
|---|---|
| pack | canada-life |
| persona | lingerer |
| mode | sim |
| model | sim-paver(fallback+20% faults, lognormal 850ms) |
| seed | 1 |
| reached_rome | true |
| tiles_to_rome | 17 |
| time_s | 97.1 |
| stall_s | 0 |
| llm_coverage | 1 |
| pave_calls | 3 |
| attempts | 4 |
| rewrites | 1 |
| rejects_by_invariant | {"no-noise":1} |
| replaced | 3 |
| late | 0 |
| fallback_tiles_seen | 0 |
| llm_tiles_seen | 12 |
| unsafe_on_road | 0 |
| effects_without_click | 0 |
| rules_added | [] |
| paver_ms_p50 | 899 |
| paver_ms_p95 | 1304 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"mood","when":"before"}
opening  {"kind":"fork","key":"route","branches":[{"label":"Fast road","value":"fast","result":null,"lead":{"kind":"signpost","fact":"auto-contrib","
lead     {"kind":"vista","fact":null,"label":"The long view"}
llm      {"kind":"signpost","fact":"stocks-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":"compounding","label":null,"topic":null}
llm      {"kind":"signpost","fact":"stocks-swings","label":null,"topic":null}
llm      {"kind":"bridge","fact":"market-drops"}
llm      {"kind":"vista","fact":"you-at-30","label":null}
llm      {"kind":"signpost","fact":"index-funds","label":null,"topic":null}
llm      {"kind":"signpost","fact":"crypto-basics","label":null,"topic":null}
llm      {"kind":"fork","key":"account","branches":[{"label":"TFSA","value":"tfsa","result":null,"lead":{"kind":"signpost","fact":"tfsa-basics","labe
lead     {"kind":"signpost","fact":"fhsa-basics","label":null,"topic":null}
llm      {"kind":"checkpoint","check":"risk"}
llm      {"kind":"checkpoint","check":"fees"}
llm      {"kind":"checkpoint","check":"limits"}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
