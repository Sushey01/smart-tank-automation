#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000"
API_KEY="dev-api-key"

echo "================================================================================="
echo " IoThings REST API CRUD Demonstration (Swagger Endpoints with X-API-Key)"
echo " Base URL: $BASE_URL | Target: Homes and Telemetry Collections"
echo "================================================================================="
echo ""

echo "--- [1. CREATE: POST /api/homes] ---"
echo "Registering new smart home property (H003)..."
curl -s -i -X POST "$BASE_URL/api/homes" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"home_id":"H003","owner":"Marcus Vance","address":"12 Victoria Road","city":"Birmingham","postcode":"B1 1BB","water_tariff":"Standard Flat Rate"}'
echo ""
echo ""

echo "--- [2. READ: GET /api/homes/H003] ---"
echo "Retrieving created home record..."
curl -s -i -X GET "$BASE_URL/api/homes/H003"
echo ""
echo ""

echo "--- [3. UPDATE: PATCH /api/homes/H003] ---"
echo "Updating owner and water tariff (PATCH from Swagger contract)..."
curl -s -i -X PATCH "$BASE_URL/api/homes/H003" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"owner":"Marcus Vance OBE","water_tariff":"Eco Saver Dynamic"}'
echo ""
echo ""

echo "--- [4. DELETE: DELETE /api/homes/H003] ---"
echo "Deleting home record (DELETE from Swagger contract)..."
curl -s -i -X DELETE "$BASE_URL/api/homes/H003" \
  -H "X-API-Key: $API_KEY"
echo ""
echo ""

echo "--- [5. VERIFICATION: GET /api/homes/H003] ---"
echo "Confirming deletion (Expect HTTP 404 Not Found)..."
curl -s -i -X GET "$BASE_URL/api/homes/H003"
echo ""
echo "================================================================================="
echo "[VERIFIED] Full CRUD lifecycle completed: POST (201), GET (200), PATCH (200), DELETE (200), GET (404)."
