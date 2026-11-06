const PI = Math.PI;
const A = 6378245.0;
const EE = 0.006693421622965943;

function outOfChina(latitude, longitude) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(x, y) {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  value += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
  value += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
  return value;
}

function transformLongitude(x, y) {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  value += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
  value += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
  value += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
  return value;
}

// HKU reference coordinates are stored as WGS-84. WeChat's native map uses GCJ-02.
function wgs84ToGcj02(latitude, longitude) {
  if (outOfChina(latitude, longitude)) return { latitude, longitude };
  let dLatitude = transformLatitude(longitude - 105, latitude - 35);
  let dLongitude = transformLongitude(longitude - 105, latitude - 35);
  const radLatitude = latitude / 180 * PI;
  let magic = Math.sin(radLatitude);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLatitude = (dLatitude * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLongitude = (dLongitude * 180) / (A / sqrtMagic * Math.cos(radLatitude) * PI);
  return { latitude: latitude + dLatitude, longitude: longitude + dLongitude };
}

function toRadians(degrees) { return degrees * PI / 180; }

function distanceMeters(from, to) {
  if (!from || !to) return null;
  const earthRadius = 6371008.8;
  const dLatitude = toRadians(to.latitude - from.latitude);
  const dLongitude = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const value = Math.sin(dLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(dLongitude / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

function formatDistance(meters) {
  if (meters === null || typeof meters === 'undefined') return 'Distance unavailable';
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m away`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km away`;
}

function nearestPlace(location, places) {
  return places.reduce((best, place) => {
    const point = place.gcj || wgs84ToGcj02(place.latitude, place.longitude);
    const meters = distanceMeters(location, point);
    return !best || meters < best.meters ? { place, point, meters } : best;
  }, null);
}

module.exports = { wgs84ToGcj02, distanceMeters, formatDistance, nearestPlace };
