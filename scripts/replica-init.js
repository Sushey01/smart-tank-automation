// mongosh --port 27017 --file scripts/replica-init.js
// Refuses rs.initiate unless this is an empty mongod, or this coursework rs0 already.

const EXPECTED_HOSTS = ['localhost:27017', 'localhost:27018', 'localhost:27019'];

const config = {
  _id: 'rs0',
  members: [
    { _id: 0, host: 'localhost:27017', priority: 2 },
    { _id: 1, host: 'localhost:27018', priority: 1 },
    { _id: 2, host: 'localhost:27019', priority: 1 },
  ],
};

function connectedPort() {
  const hello = db.hello();
  const me = hello.me || hello.primary || '';
  const match = String(me).match(/:(\d+)$/);
  return match ? Number(match[1]) : null;
}

function userDatabaseNames() {
  const system = { admin: true, config: true, local: true };
  return db.adminCommand({ listDatabases: 1 }).databases
    .map((entry) => entry.name)
    .filter((name) => !system[name]);
}

function printMembers(status) {
  print('--- member states ---');
  status.members.forEach((member) => {
    print(`${member.name} ${member.stateStr} health=${member.health}`);
  });
}

function sameMembers(status) {
  const found = (status.members || []).map((member) => member.name).sort().join(',');
  return found === EXPECTED_HOSTS.slice().sort().join(',');
}

const port = connectedPort();
if (port !== null && port !== 27017) {
  print(`Refusing: this shell is connected to port ${port}, not 27017.`);
  quit(1);
}

let status = null;
try {
  status = rs.status();
} catch (err) {
  const notInit = err.code === 94 || /NotYetInitialized|no replset config has been received/i.test(String(err));
  if (!notInit) {
    print('Refusing: could not read replica set status.');
    print(String(err));
    quit(1);
  }
  let users = [];
  try {
    users = userDatabaseNames();
  } catch (e) {
    // In MongoDB 8, listDatabases throws if node is not yet initiated
    users = [];
  }
  if (users.length > 0) {
    print(`Refusing rs.initiate: port 27017 already has data in ${users.join(', ')}.`);
    print('This looks like a different mongod. Do not initialise it as rs0.');
    quit(1);
  }
  const result = rs.initiate(config);
  printjson(result);
  sleep(3000);
  printMembers(rs.status());
  quit(0);
}

if (status.set !== 'rs0') {
  print(`Refusing: this mongod is already replica set "${status.set}", not rs0.`);
  quit(1);
}

if (!sameMembers(status)) {
  print('Refusing: rs0 members do not match localhost:27017, localhost:27018, localhost:27019.');
  quit(1);
}

print('Replica set already initialised: rs0');
printMembers(status);
