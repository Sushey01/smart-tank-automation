#!/usr/bin/env bash
# Optional Docker replica set on ports 27217-27219. Not the main coursework path.
set -euo pipefail

echo "Waiting for mongo1..."
for _ in $(seq 1 40); do
  if docker exec mongo1 mongosh --port 27217 --quiet --eval 'db.runCommand({ ping: 1 }).ok' 2>/dev/null | grep -q 1; then
    break
  fi
  sleep 1
done

docker exec mongo1 mongosh --port 27217 --quiet --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27217", priority: 2 },
    { _id: 1, host: "mongo2:27218", priority: 1 },
    { _id: 2, host: "mongo3:27219", priority: 1 }
  ]
})
'
sleep 5
echo "--- member states ---"
docker exec mongo1 mongosh --port 27217 --quiet --eval 'rs.status().members.forEach(m => print(m.name + " " + m.stateStr + " health=" + m.health))'
