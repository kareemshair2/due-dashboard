import { sum } from "../utils/number-utils.js";

function safeEfficiency(distance, fuel) {
  return Number.isFinite(distance) && Number.isFinite(fuel) && fuel > 0 ? distance / fuel : null;
}

export function summarizeCars(rows) {
  const trips = rows.filter((row) => row.isTrip);
  const invalid = rows.filter((row) => !row.isOdometerValid);
  const totalDistance = sum(trips.map((row) => row.distance));
  const totalFuel = sum(
    trips.map((row) => row.fuel).filter((value) => Number.isFinite(value) && value > 0),
  );
  const totalCost = sum(
    rows.map((row) => row.cost).filter((value) => Number.isFinite(value)),
  );
  const totalKmRaw = sum(
    rows.map((row) => row.kmRaw).filter((value) => Number.isFinite(value)),
  );

  const vehicleMap = new Map();
  for (const row of rows) {
    const key = row.vehicle || "غير محدد";
    if (!vehicleMap.has(key)) {
      vehicleMap.set(key, {
        vehicle: key,
        records: 0,
        trips: 0,
        distance: 0,
        fuel: 0,
        cost: 0,
        invalid: 0,
        drivers: new Set(),
      });
    }
    const item = vehicleMap.get(key);
    item.records += 1;
    if (row.driver) item.drivers.add(row.driver);
    if (row.isTrip) {
      item.trips += 1;
      item.distance += row.distance;
    } else {
      item.invalid += 1;
    }
    if (row.isTrip && Number.isFinite(row.fuel) && row.fuel > 0) item.fuel += row.fuel;
    if (Number.isFinite(row.cost)) item.cost += row.cost;
  }

  const byVehicle = [...vehicleMap.values()]
    .map((item) => ({
      ...item,
      driverCount: item.drivers.size,
      drivers: [...item.drivers],
      efficiency: safeEfficiency(item.distance, item.fuel),
      costPerKm: item.distance > 0 ? item.cost / item.distance : null,
    }))
    .sort((a, b) => b.distance - a.distance || a.vehicle.localeCompare(b.vehicle, "ar"));

  const dayMap = new Map();
  for (const row of rows) {
    const key = row.date || "غير محدد";
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: key, records: 0, trips: 0, distance: 0, fuel: 0, cost: 0 });
    }
    const day = dayMap.get(key);
    day.records += 1;
    if (row.isTrip) {
      day.trips += 1;
      day.distance += row.distance;
    }
    if (row.isTrip && Number.isFinite(row.fuel) && row.fuel > 0) day.fuel += row.fuel;
    if (Number.isFinite(row.cost)) day.cost += row.cost;
  }

  const byDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    rows,
    records: rows.length,
    tripCount: trips.length,
    invalidCount: invalid.length,
    vehicleCount: vehicleMap.size,
    driverCount: new Set(rows.map((row) => row.driver).filter(Boolean)).size,
    totalDistance,
    totalFuel,
    totalCost,
    totalKmRaw,
    efficiency: safeEfficiency(totalDistance, totalFuel),
    costPerKm: totalDistance > 0 ? totalCost / totalDistance : null,
    averageTrip: trips.length ? totalDistance / trips.length : null,
    byVehicle,
    byDay,
    invalidRows: invalid,
  };
}
