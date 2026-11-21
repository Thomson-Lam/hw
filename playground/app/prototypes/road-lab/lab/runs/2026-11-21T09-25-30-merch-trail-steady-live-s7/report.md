# 2026-11-21T09-25-30-merch-trail-steady-live-s7

| metric | value |
|---|---|
| pack | merch-trail |
| persona | steady |
| mode | live |
| model | gemini-3.5-flash-lite |
| seed | 7 |
| reached_rome | true |
| tiles_to_rome | 14 |
| time_s | 50.6 |
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
| paver_ms_p50 | 699 |
| paver_ms_p95 | 847 |
| stopped | false |

## Road (source, tile)
```
opening  {"kind":"signpost","fact":"merch-goal","label":null,"topic":null}
opening  {"kind":"fork","key":"style","branches":[{"label":"Realistic","value":"realistic","result":null,"lead":{"kind":"signpost","fact":"horse-them
lead     {"kind":"signpost","fact":"pla-basics","label":null,"topic":null}
llm      {"kind":"signpost","fact":null,"label":"Low Poly Horse Models","topic":"horses"}
llm      {"kind":"bridge","fact":"horse-theme"}
llm      {"kind":"search","query":"low poly horse","style":"low-poly","supports":"any"}
llm      {"kind":"pick","result":"130368"}
llm      {"kind":"pick","result":"591821"}
llm      {"kind":"fork","key":"pick","branches":[{"label":null,"value":null,"result":"130368","lead":{"kind":"vista","fact":null,"label":"Creative Co
lead     {"kind":"vista","fact":null,"label":"Creative Commons Share Alike"}
llm      {"kind":"checkpoint","check":"license"}
llm      {"kind":"signpost","fact":"license-basics","label":null,"topic":null}
llm      {"kind":"toll-booth"}
engine   {"kind":"campfire"}
```
