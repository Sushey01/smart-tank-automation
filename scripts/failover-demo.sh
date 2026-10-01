#!/usr/bin/env bash
# Optional Docker failover demo. Stops mongo1, waits for election, then starts it again.
# Expect a brief write pause during election (~10 s), not uninterrupted writes.
set -euo pipefail

print_states() {
  docker exec mongo1 mongosh --port 27217 --quiet --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr))' || true
}

echo "--- before ---"
print_states
echo "Stopping mongo1 (preferred primary)..."
docker stop mongo1
echo "Waiting 15s for election..."
sleep 15
echo "--- during failover (query a remaining member) ---"
docker exec mongo2 mongosh --port 27218 --quiet --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr))'
echo "Starting mongo1 again..."
docker start mongo1
sleep 8
echo "--- after rejoin ---"
docker exec mongo2 mongosh --port 27218 --quiet --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr))'
