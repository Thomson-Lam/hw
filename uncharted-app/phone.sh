#!/bin/bash
# Point Expo Go at this Mac over the phone's hotspot, then print and open the QR.
cd "$(dirname "$0")"
TS=/Applications/Tailscale.app/Contents/MacOS/Tailscale
IP=""
for i in en0 en1 en2 en3 en4; do a=$(ipconfig getifaddr $i 2>/dev/null); [[ $a == 172.20.10.* ]] && IP=$a && break; done
if [ -z "$IP" ]; then echo "FAIL: the Mac is not on an iPhone hotspot (no 172.20.10.x address). Join the hotspot in Wi-Fi, then rerun."; exit 1; fi
echo "hotspot address: $IP"

if ! curl -s -o /dev/null -m 3 http://$IP:8787/api/meta -X POST; then
  pgrep -f "server/server.mjs" >/dev/null || { nohup node server/server.mjs > /tmp/uncharted-server.log 2>&1 & sleep 1; }
fi
if ! curl -s -o /dev/null -m 3 -X POST http://$IP:8787/api/meta; then
  if [ -x $TS ] && $TS status >/dev/null 2>&1; then
    echo "The Mac cannot reach its own hotspot address while Tailscale is up. Turning Tailscale off (turn it back on with: $TS up)."
    $TS down; sleep 2
  fi
fi
curl -s -o /dev/null -m 3 -X POST http://$IP:8787/api/meta || { echo "FAIL: road server not reachable on $IP:8787"; exit 1; }

pkill -f "expo start"; sleep 1
REACT_NATIVE_PACKAGER_HOSTNAME=$IP nohup npx expo start --lan --port 8081 < /dev/null > /tmp/expo-dev.log 2>&1 &
for i in $(seq 1 30); do curl -s -o /dev/null -m 2 http://$IP:8081/status && break; sleep 1; done
HOST=$(curl -s -m 5 -H "expo-platform: ios" http://$IP:8081/ | grep -o '"hostUri":"[^"]*"' | head -1)
[[ $HOST == *"$IP:8081"* ]] || { echo "FAIL: Expo manifest points at $HOST, expected $IP:8081"; exit 1; }
echo "metro ok, manifest $HOST, road server ok"
/tmp/ftv/bin/python -I -c "import qrcode,sys;qrcode.make(sys.argv[1]).save('/tmp/uncharted-check/expo-go-qr.png')" "exp://$IP:8081" && open /tmp/uncharted-check/expo-go-qr.png
echo "READY: scan the QR with the iPhone Camera, or type exp://$IP:8081 in Expo Go"
