// mongosh --port 27117 --file scripts/replica-init.js
// Host replica set for the coursework. Does not touch port 27017.

const config = {
  _id: 'rs0',
  members: [
    { _id: 0, host: 'localhost:27117', priority: 2 },
    { _id: 1, host: 'localhost:27118', priority: 1 },
    { _id: 2, host: 'localhost:27119', priority: 1 },
  ],
};

try {
  const current = rs.status();
  print(`Replica set already initialised: ${current.set}`);
} catch (err) {
  const result = rs.initiate(config);
  printjson(result);
}

sleep(3000);
print('--- member states ---');
rs.status().members.forEach((member) => {
  print(`${member.name} ${member.stateStr} health=${member.health}`);
});
