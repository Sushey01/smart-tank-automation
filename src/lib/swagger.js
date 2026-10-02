const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'IoThings Smart Tank Automation API',
    version: '1.0.0',
    description:
      'Fault-tolerant NoSQL telemetry, data analysis, and automation API for IoThings Home Automation Solutions. Developed for CMP6207 Modern Data Stores with MongoDB Replica Set rs0 and Mosquitto MQTT messaging.',
    contact: {
      name: 'IoThings Data Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Express API Server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key required for all modifying routes (POST, PATCH, DELETE).',
      },
    },
  },
  tags: [
    { name: 'System & Health', description: 'Replica set clustering, health diagnostics, and ingestion stats' },
    { name: 'Fleet & Properties', description: 'Registered homes and IoT device metadata registry (CRUD)' },
    { name: 'Telemetry & CRUD', description: 'Sensor activation data ingestion and administrative CRUD operations' },
    { name: 'Analytics & Alerts', description: 'Derived analytics, historical aggregations, and alerts' },
    { name: 'Automation & Control', description: 'Closed-loop pump control and operational modes' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Get replica set health and cluster status',
        description: 'Queries MongoDB replSetGetStatus to report primary node, member states, replica health, and ingestion metrics.',
        responses: {
          200: { description: 'Replica set and ingestion status retrieved successfully' },
        },
      },
    },
    '/api/replica-status': {
      get: {
        tags: ['System & Health'],
        summary: 'Dedicated replica set status endpoint',
        description: 'Returns compact summary of replica set members, states, and health.',
        responses: {
          200: { description: 'Replica status details' },
        },
      },
    },
    '/api/stats': {
      get: {
        tags: ['System & Health'],
        summary: 'MQTT Ingestion Statistics',
        description: 'Returns live counts for stored telemetry, duplicate skipped messages, and rejected dead-letter payloads.',
        responses: {
          200: { description: 'Live ingestion statistics' },
        },
      },
    },
    '/api/homes': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'List smart home properties (CRUD: Read All)',
        description: 'Returns registered customer smart home properties and tariff configurations.',
        responses: {
          200: { description: 'List of smart homes' },
        },
      },
      post: {
        tags: ['Fleet & Properties'],
        summary: 'Register a new home property (CRUD: Create)',
        security: [{ ApiKeyAuth: [] }],
        description: 'Registers a new customer home in the homes collection.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['home_id'],
                properties: {
                  home_id: { type: 'string', example: 'H003' },
                  owner: { type: 'string', example: 'Marcus Vance' },
                  address: { type: 'string', example: '12 Victoria Road' },
                  city: { type: 'string', example: 'Birmingham' },
                  postcode: { type: 'string', example: 'B1 1BB' },
                  country: { type: 'string', example: 'UK' },
                  water_tariff: { type: 'string', example: 'Standard Flat Rate' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Home registered successfully' },
          400: { description: 'Missing required fields' },
          401: { description: 'Unauthorized' },
          409: { description: 'Home already exists with this home_id' },
        },
      },
    },
    '/api/homes/{id}': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'Get home property by ID or home_id (CRUD: Read One)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or home_id' },
        ],
        responses: {
          200: { description: 'Home details' },
          404: { description: 'Home not found' },
        },
      },
      patch: {
        tags: ['Fleet & Properties'],
        summary: 'Update home property details (CRUD: Update)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or home_id' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  owner: { type: 'string' },
                  water_tariff: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Home updated successfully' },
          401: { description: 'Unauthorized' },
          404: { description: 'Home not found' },
        },
      },
      delete: {
        tags: ['Fleet & Properties'],
        summary: 'Delete a registered home (CRUD: Delete)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or home_id' },
        ],
        responses: {
          200: { description: 'Home deleted successfully' },
          401: { description: 'Unauthorized' },
          404: { description: 'Home not found' },
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'List registered IoT devices (CRUD: Read All)',
        description: 'Returns the fleet of IoT sensors, device types, firmwares, and locations.',
        responses: {
          200: { description: 'List of devices' },
        },
      },
      post: {
        tags: ['Fleet & Properties'],
        summary: 'Register an IoT device (CRUD: Create)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['device_id'],
                properties: {
                  device_id: { type: 'string', example: 'HOME_HUB_03' },
                  home_id: { type: 'string', example: 'H001' },
                  device_type: { type: 'string', example: 'water_tank' },
                  location: { type: 'string', example: 'garden_tank' },
                  tank_capacity_l: { type: 'number', example: 1000 },
                  sensor_height_cm: { type: 'number', example: 150 },
                  firmware: { type: 'string', example: 'v2.4.1' },
                  status: { type: 'string', example: 'active' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Device registered successfully' },
          400: { description: 'Missing required fields' },
          401: { description: 'Unauthorized' },
          409: { description: 'Device already exists with this device_id' },
        },
      },
    },
    '/api/devices/{id}': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'Get IoT device by ID or device_id (CRUD: Read One)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or device_id' },
        ],
        responses: {
          200: { description: 'Device details' },
          404: { description: 'Device not found' },
        },
      },
      patch: {
        tags: ['Fleet & Properties'],
        summary: 'Update device metadata (CRUD: Update)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or device_id' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  firmware: { type: 'string' },
                  status: { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Device updated successfully' },
          401: { description: 'Unauthorized' },
          404: { description: 'Device not found' },
        },
      },
      delete: {
        tags: ['Fleet & Properties'],
        summary: 'Delete an IoT device (CRUD: Delete)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'MongoDB ObjectId or device_id' },
        ],
        responses: {
          200: { description: 'Device deleted successfully' },
          401: { description: 'Unauthorized' },
          404: { description: 'Device not found' },
        },
      },
    },
    '/api/telemetry/latest': {
      get: {
        tags: ['Telemetry & CRUD'],
        summary: 'Get newest telemetry reading',
        description: 'Returns the most recent sensor activation document from HOME_HUB_01.',
        responses: {
          200: { description: 'Latest telemetry document' },
        },
      },
    },
    '/api/telemetry': {
      post: {
        tags: ['Telemetry & CRUD'],
        summary: 'Create a synthetic sensor reading (Admin CRUD: Create)',
        security: [{ ApiKeyAuth: [] }],
        description: 'Inserts a new sensor reading into sensor_activations using majority write concern. Guarded behind ENABLE_TELEMETRY_ADMIN.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ultrasonic_depth_pct: {
                    type: 'number',
                    example: 65.5,
                    description: 'Water depth level percentage (0 to 100)',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Optional ISO timestamp',
                  },
                },
                required: ['ultrasonic_depth_pct'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Reading created successfully' },
          400: { description: 'Invalid input parameters' },
          401: { description: 'Unauthorized' },
          403: { description: 'Direct telemetry mutations disabled in production' },
          409: { description: 'Duplicate timestamp for device' },
        },
      },
    },
    '/api/telemetry/{id}': {
      patch: {
        tags: ['Telemetry & CRUD'],
        summary: 'Update reading level and recompute alerts (Admin CRUD: Update)',
        security: [{ ApiKeyAuth: [] }],
        description: 'Updates ultrasonic depth and recalculates float switches, pump/valve states, and alerts. Guarded behind ENABLE_TELEMETRY_ADMIN.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: '24-character hexadecimal MongoDB ObjectId',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ultrasonic_depth_pct: {
                    type: 'number',
                    example: 88.0,
                    description: 'Updated water level percentage',
                  },
                },
                required: ['ultrasonic_depth_pct'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Reading updated successfully' },
          401: { description: 'Unauthorized' },
          403: { description: 'Direct telemetry mutations disabled in production' },
          404: { description: 'Reading not found' },
        },
      },
      delete: {
        tags: ['Telemetry & CRUD'],
        summary: 'Delete a sensor reading (Admin CRUD: Delete)',
        security: [{ ApiKeyAuth: [] }],
        description: 'Removes a single document by its ObjectId from MongoDB. Guarded behind ENABLE_TELEMETRY_ADMIN.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: '24-character hexadecimal MongoDB ObjectId',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Reading successfully deleted' },
          401: { description: 'Unauthorized' },
          403: { description: 'Direct telemetry mutations disabled in production' },
          404: { description: 'Reading not found' },
        },
      },
    },
    '/api/telemetry/alerts': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'List active and recent alerts',
        description: 'Returns alerts for high overflow, dry-run, and leak detection.',
        parameters: [
          {
            name: 'reason',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['TANK_OVERFLOW', 'TANK_DRY_RUN', 'LEAK_DETECTED'],
            },
            description: 'Filter by specific alert code',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20 },
            description: 'Maximum items to return (capped at 100)',
          },
        ],
        responses: {
          200: { description: 'List of alerts' },
        },
      },
    },
    '/api/telemetry/history': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'Get historical readings or aggregated buckets',
        description: 'Retrieve raw documents or aggregate into minute/hour buckets with secondaryPreferred read preference.',
        parameters: [
          {
            name: 'bucket',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['raw', 'minute', 'hour'], default: 'raw' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: { description: 'Telemetry history' },
        },
      },
    },
    '/api/telemetry/summary': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'Operational metrics and consumption summary',
        description: 'Calculates water consumption trend, litres/hour rate, time to empty/fill, and RSSI.',
        responses: {
          200: { description: 'Telemetry summary' },
        },
      },
    },
    '/api/telemetry/analytics/averages': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'Device telemetry averages',
        description: 'Uses MongoDB aggregation pipeline on secondary nodes to calculate mean depth, volume, and RSSI.',
        responses: {
          200: { description: 'Aggregated averages' },
        },
      },
    },
    '/api/telemetry/control': {
      get: {
        tags: ['Automation & Control'],
        summary: 'Get current automation control state',
        description: 'Returns operational control mode (AUTO / MANUAL), pump command, and valve state.',
        responses: {
          200: { description: 'Current control state' },
        },
      },
      post: {
        tags: ['Automation & Control'],
        summary: 'Update control mode and actuator commands',
        security: [{ ApiKeyAuth: [] }],
        description: 'Switches system between closed-loop AUTO hysteresis mode and MANUAL override.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  mode: {
                    type: 'string',
                    enum: ['AUTO', 'MANUAL'],
                    example: 'AUTO',
                  },
                  pump: {
                    type: 'string',
                    enum: ['ACTIVE', 'EMERGENCY_STOP', 'ON', 'OFF'],
                    example: 'ACTIVE',
                  },
                  valve: {
                    type: 'string',
                    enum: ['OPEN', 'CLOSED'],
                    example: 'OPEN',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Control state updated' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'IoThings API Documentation | CMP6207',
  }));
}

module.exports = { setupSwagger, swaggerDocument };
