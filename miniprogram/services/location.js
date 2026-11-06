const config = require('../config/index');
const geo = require('../utils/geo');

const AVATARS = {
  'avatar-1': '/images/avatars/saber.svg',
  'avatar-2': '/images/avatars/george.svg',
  'avatar-3': '/images/avatars/dan.svg',
  'avatar-4': '/images/avatars/cayla.svg',
};

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: resolve,
      fail: reject,
    });
  });
}

// Backend adapter boundary. Replace only this function when moving from
// WeChat Cloud Development to a REST/GraphQL backend.
function request(data) {
  if (!wx.cloud || !config.cloudEnvId) return Promise.resolve({ configured: false, items: [] });
  return wx.cloud.callFunction({ name: 'locationSync', data })
    .then((response) => ({ configured: true, ...(response.result || {}) }));
}

function publish(location, privacy, profile, places) {
  if (!privacy.enabled) return Promise.resolve({ configured: Boolean(config.cloudEnvId), skipped: true });
  const nearest = geo.nearestPlace(location, places);
  const exactAllowed = privacy.precision === 'exact' && privacy.scope === 'sameActivity';
  const sharedPoint = exactAllowed ? location : nearest.point;
  return request({
    action: 'publish',
    latitude: sharedPoint.latitude,
    longitude: sharedPoint.longitude,
    exactLatitude: privacy.mutualDistance ? location.latitude : null,
    exactLongitude: privacy.mutualDistance ? location.longitude : null,
    distanceConsent: Boolean(privacy.mutualDistance),
    placeId: nearest.place.id,
    precision: exactAllowed ? 'exact' : 'place',
    scope: privacy.scope,
    duration: privacy.duration,
    profile: { id: profile.userId || profile.id, name: profile.nickname, avatarPosition: profile.avatarPosition },
  });
}

function list() { return request({ action: 'list' }); }
function revoke() { return request({ action: 'revoke' }); }
function disableDistanceConsent() { return request({ action: 'disableDistanceConsent' }); }

function normalizeSharedUser(item, index = 0) {
  const profile = item.profile || {};
  return {
    id: profile.id || `shared-${index}`,
    userId: profile.id || `shared-${index}`,
    name: profile.name || 'LinkUS user',
    avatar: profile.avatarFileId || AVATARS[profile.avatarPosition] || AVATARS['avatar-1'],
    status: item.precision === 'exact' ? 'Sharing precise position' : 'Sharing this place',
    placeId: item.placeId,
    latitude: item.latitude,
    longitude: item.longitude,
    conversationId: item.conversationId || '',
    distanceMode: item.distanceMode || 'hidden',
    distanceLabel: item.distanceLabel || '',
    distanceMeters: Number.isFinite(item.distanceMeters) ? item.distanceMeters : null,
  };
}

module.exports = { getCurrentLocation, publish, list, revoke, disableDistanceConsent, normalizeSharedUser };
