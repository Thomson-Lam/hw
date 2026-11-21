| model | tiles | per-call p50 | per-call p95 | first-try valid | valid within 3 | out tok | thinking tok |
|---|---|---|---|---|---|---|---|
| gemini-3.8-flash | 1 | 6140ms | 6643ms | 1/6 | 5/6 | 27 | 439 |
| gemini-3.8-flash | 4 | 6384ms | 6801ms | 0/6 | 0/6 | 23 | 573 |
| gemini-3.5-flash-lite | 1 | 716ms | 976ms | 5/6 | 6/6 | 25 | 0 |
| gemini-3.5-flash-lite | 4 | 854ms | 992ms | 4/6 | 6/6 | 75 | 0 |
| gemini-3.1-flash-lite | 1 | 940ms | 1330ms | 6/6 | 6/6 | 27 | 0 |
| gemini-3.1-flash-lite | 4 | 857ms | 1456ms | 2/6 | 2/6 | 67 | 0 |

first-try rejects by invariant: {"syntax":15,"pace-size":1,"disclose-first":8}
NOW REJECTED: gemini-3.1-flash-lite checkpoint-kind checkpoint must be risk|fees|limits, got {"str":"low"}
NOW REJECTED: gemini-3.1-flash-lite checkpoint-kind checkpoint must be risk|fees|limits, got "0|0|none"
NOW REJECTED: gemini-3.1-flash-lite checkpoint-kind checkpoint must be risk|fees|limits, got {"str":"low"}
NOW REJECTED: gemini-3.1-flash-lite checkpoint-kind checkpoint must be risk|fees|limits, got "5|0|none"

re-check of accepted outputs with fixed compiler: 4/25 were wrongly accepted before
