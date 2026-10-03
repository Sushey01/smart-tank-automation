#!/usr/bin/env bash
set -e

# Always run from the project root
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "============================================================"
echo " Starting Abrupt Primary Failover Test (kill -9)"
echo " Project Directory: $PROJECT_DIR"
echo "============================================================"

# 1. Identify primary
PRIMARY_PORT=$(mongosh --quiet --eval "rs.status().members.find(m => m.stateStr === 'PRIMARY').name" | cut -d: -f2 | tr -d '\r\n ')
if [ -z "$PRIMARY_PORT" ]; then
  echo "Error: Could not identify PRIMARY node. Is the cluster running?"
  exit 1
fi

PRIMARY_PID=$(lsof -ti :$PRIMARY_PORT -sTCP:LISTEN | head -n 1)
echo "Current primary: port $PRIMARY_PORT (PID $PRIMARY_PID)"

# 2. Launch probe in background
echo "Launching failover probe (40 seconds)..."
node scripts/measure-failover.js --duration 40 &
PROBE_PID=$!

# 3. Wait 5 seconds for writes to begin, then kill primary
sleep 5
echo ""
echo ">>> Killing primary on port $PRIMARY_PORT (PID $PRIMARY_PID) at $(date +%H:%M:%S) <<<"
kill -9 $PRIMARY_PID

# 4. Wait for probe to complete
wait $PROBE_PID || true

echo ""
echo "============================================================"
echo " Restarting killed mongod node on port $PRIMARY_PORT..."
echo "============================================================"
NODE=$((PRIMARY_PORT - 27016))
mongod --replSet rs0 --port $PRIMARY_PORT --dbpath ./mongo-cluster/node$NODE \
  --bind_ip localhost --fork --logpath ./mongo-cluster/node$NODE/mongod.log

echo ""
echo "Replica set status after recovery:"
sleep 2
mongosh --port 27018 --quiet --eval "rs.status().members.map(m => ({name: m.name, stateStr: m.stateStr, health: m.health}))"
echo "Done!"
