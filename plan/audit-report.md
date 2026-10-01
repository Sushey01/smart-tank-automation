# Audit note

The repository previously implemented four devices (`TANK_01`, `TANK_02`, `CLIMATE_01`, `POWER_01`) on ports 27117–27119 and collection `iothings.sensor_readings`.

The current build is the one-tank system:

- Device `HOME_HUB_01` only, topic `iothings/home/telemetry`, local Mosquitto.
- Database `smart_water`, collection `sensor_activations`, ports 27017–27019.
- Nested `telemetry`. Firmware `v2.4.1`. Actuators are strings. No command routes.
- `scripts/replica-init.js` refuses `rs.initiate` when port 27017 is a different database.
- Telegram on alert transitions, and a browser siren after **Arm siren**.
- Seed file of 1200 documents, not a MongoDB load.

Do not describe failover as zero downtime. Use: automatic failover with no acknowledged-write loss; brief write pause during election (~10 s).
