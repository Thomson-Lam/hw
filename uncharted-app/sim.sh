#!/bin/bash
# Phone-sized Chrome window on the Expo web build (iPhone 14 Pro: 390x844 page + title bar). React Grab is active in dev.
open -na "Google Chrome" --args --app=http://localhost:8081 --user-data-dir=/tmp/uncharted-chrome --no-first-run
sleep 3
osascript <<'OSA' >/dev/null
tell application "System Events"
  repeat with p in (every process whose name is "Google Chrome")
    repeat with w in (every window of p)
      if name of w is "uncharted-app" then
        set position of w to {40, 40}
        set size of w to {390, 872}
      end if
    end repeat
  end repeat
end tell
OSA
