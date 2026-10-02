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
  tags: [
    { name: 'System & Health', description: 'Replica set clustering and health diagnostics' },
    { name: 'Fleet & Properties', description: 'Registered homes and IoT device metadata' },
    { name: 'Telemetry & CRUD', description: 'Sensor activation data ingestion and CRUD operations' },
    { name: 'Analytics & Alerts', description: 'Derived analytics, historical aggregations, and alerts' },
    { name: 'Automation & Control', description: 'Closed-loop pump control and operational modes' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Get replica set health and cluster status',
        description: 'Queries MongoDB replSetGetStatus to report primary node, member states, and replica set health.',
        responses: {
          200: {
            description: 'Replica set status retrieved successfully',
          },
        },
      },
    },
    '/api/replica-status': {
      get: {
        tags: ['System & Health'],
        summary: 'Dedicated replica set status endpoint',
        description: 'Returns compact summary of replica set members, states, and health.',
        responses: {
          200: {
            description: 'Replica status details',
          },
        },
      },
    },
    '/api/homes': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'List smart home properties',
        description: 'Returns registered customer smart home properties and tariff configurations.',
        responses: {
          200: {
            description: 'List of smart homes',
          },
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Fleet & Properties'],
        summary: 'List registered IoT devices',
        description: 'Returns the fleet of IoT sensors, device types, firmwares, and locations.',
        responses: {
          200: {
            description: 'List of devices',
          },
        },
      },
    },
    '/api/telemetry/latest': {
      get: {
        tags: ['Telemetry & CRUD'],
        summary: 'Get newest telemetry reading',
        description: 'Returns the most recent sensor activation document from HOME_HUB_01.',
        responses: {
          200: {
            description: 'Latest telemetry document',
          },
        },
      },
    },
    '/api/telemetry': {
      post: {
        tags: ['Telemetry & CRUD'],
        summary: 'Create a synthetic sensor reading (CRUD: Create)',
        description: 'Inserts a new sensor reading into smart_water.sensor_activations using majority write concern.',
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
          201: {
            description: 'Reading created successfully',
          },
          400: {
            description: 'Invalid input parameters',
          },
        },
      },
    },
    '/api/telemetry/{id}': {
      patch: {
        tags: ['Telemetry & CRUD'],
        summary: 'Update reading level and recompute alerts (CRUD: Update)',
        description: 'Updates ultrasonic depth and recalculates float switches, pump/valve states, and alerts.',
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
          200: {
            description: 'Reading updated successfully',
          },
          404: {
            description: 'Reading not found',
          },
        },
      },
      delete: {
        tags: ['Telemetry & CRUD'],
        summary: 'Delete a sensor reading (CRUD: Delete)',
        description: 'Removes a single document by its ObjectId from MongoDB.',
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
          200: {
            description: 'Reading successfully deleted',
          },
          404: {
            description: 'Reading not found',
          },
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
          200: {
            description: 'List of alerts',
          },
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
          200: {
            description: 'Telemetry history',
          },
        },
      },
    },
    '/api/telemetry/summary': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'Operational metrics and consumption summary',
        description: 'Calculates water consumption trend, litres/hour rate, time to empty/fill, and RSSI.',
        responses: {
          200: {
            description: 'Telemetry summary',
          },
        },
      },
    },
    '/api/telemetry/analytics/averages': {
      get: {
        tags: ['Analytics & Alerts'],
        summary: 'Device telemetry averages',
        description: 'Uses MongoDB aggregation pipeline on secondary nodes to calculate mean depth, volume, and RSSI.',
        responses: {
          200: {
            description: 'Aggregated averages',
          },
        },
      },
    },
    '/api/telemetry/control': {
      get: {
        tags: ['Automation & Control'],
        summary: 'Get current automation control state',
        description: 'Returns operational control mode (AUTO / MANUAL), pump command, and valve state.',
        responses: {
          200: {
            description: 'Current control state',
          },
        },
      },
      post: {
        tags: ['Automation & Control'],
        summary: 'Update control mode and actuator commands',
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
          200: {
            description: 'Control state updated',
          },
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
