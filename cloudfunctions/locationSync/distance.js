const EARTH_RADIUS_METERS = 6371000;

function coordinateValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validPoint(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function distanceMeters(from, to) {
  const radians = (value) => value * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

function precisePoint(item = {}) {
  const latitude = coordinateValue(item.exactLatitude);
  const longitude = coordinateValue(item.exactLongitude);
  return validPoint(latitude, longitude) ? { latitude, longitude } : null;
}

function publicPoint(item = {}) {
  const latitude = coordinateValue(item.latitude);
  const longitude = coordinateValue(item.longitude);
  return validPoint(latitude, longitude) ? { latitude, longitude } : null;
}

function exactLabel(meters) {
  if (meters < 1000) return `精确距离 ${Math.max(1, Math.round(meters))} 米`;
  return `精确距离 ${(meters / 1000).toFixed(1)} 公里`;
}

function fuzzyLabel(viewer, other) {
  if (viewer.placeId && viewer.placeId === other.placeId) return '同一地点';
  const from = publicPoint(viewer);
  const to = publicPoint(other);
  if (!from || !to) return '校园内';
  const meters = distanceMeters(from, to);
  if (meters <= 500) return '约 300 米';
  if (meters <= 1000) return '1 公里内';
  if (meters <= 2000) return '约 1–2 公里';
  return `${Math.ceil(meters / 1000)} 公里内`;
}

function distanceFor(viewer, other) {
  if (!viewer) return { mode: 'hidden', label: '开启位置共享后查看距离' };
  const viewerPoint = precisePoint(viewer);
  const otherPoint = precisePoint(other);
  if (viewer.distanceConsent && other.distanceConsent && viewerPoint && otherPoint) {
    const meters = distanceMeters(viewerPoint, otherPoint);
    return { mode: 'exact', label: exactLabel(meters), meters: Math.round(meters) };
  }
  return { mode: 'fuzzy', label: fuzzyLabel(viewer, other) };
}

module.exports = { coordinateValue, validPoint, distanceMeters, exactLabel, fuzzyLabel, distanceFor };
