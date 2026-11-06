const cloud = require('wx-server-sdk');
const { coordinateValue, validPoint, distanceFor } = require('./distance');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const command = db.command;
const collection = db.collection('sharedLocations');

function safeProfile(profile = {}) {
  return {
    id: String(profile.id || '').slice(0, 64),
    name: String(profile.name || 'LinkUS user').slice(0, 40),
    avatarPosition: String(profile.avatarPosition || 'avatar-1').slice(0, 20),
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;

  if (action === 'publish') {
    const latitude = coordinateValue(event.latitude);
    const longitude = coordinateValue(event.longitude);
    if (!validPoint(latitude, longitude)) return { ok: false, error: 'INVALID_COORDINATES' };
    const exactLatitude = coordinateValue(event.exactLatitude);
    const exactLongitude = coordinateValue(event.exactLongitude);
    const distanceConsent = event.distanceConsent === true
      && validPoint(exactLatitude, exactLongitude);

    const duration = Math.max(5, Math.min(120, Number(event.duration) || 60));
    const scope = event.scope === 'campus' ? 'campus' : 'sameActivity';
    const precision = event.precision === 'exact' && scope === 'sameActivity' ? 'exact' : 'place';
    const now = Date.now();
    let profile = safeProfile(event.profile);
    try {
      const userResult = await db.collection('users').doc(OPENID).get();
      const user = userResult.data;
      profile = {
        id: user.userId,
        name: user.nickname,
        avatarPosition: user.avatarPosition || 'avatar-1',
        avatarFileId: user.avatarFileId || '',
      };
    } catch (error) {
      console.warn('Using client profile until users collection is ready', error.message || error);
    }
    await collection.doc(OPENID).set({
      data: {
        owner: OPENID,
        latitude,
        longitude,
        exactLatitude: distanceConsent ? exactLatitude : null,
        exactLongitude: distanceConsent ? exactLongitude : null,
        distanceConsent,
        placeId: String(event.placeId || '').slice(0, 64),
        scope,
        precision,
        profile,
        updatedAt: now,
        expiresAt: now + duration * 60 * 1000,
      },
    });
    return { ok: true, expiresAt: now + duration * 60 * 1000 };
  }

  if (action === 'revoke') {
    await collection.doc(OPENID).remove().catch(() => null);
    return { ok: true };
  }

  if (action === 'disableDistanceConsent') {
    await collection.doc(OPENID).update({
      data: { distanceConsent: false, exactLatitude: null, exactLongitude: null },
    }).catch(() => null);
    return { ok: true };
  }

  if (action === 'list') {
    const now = Date.now();
    const result = await collection.where({ expiresAt: command.gt(now) }).limit(100).get();
    const viewer = result.data.find((item) => item.owner === OPENID);
    const items = result.data
      .filter((item) => item.owner !== OPENID && item.scope === 'campus' && item.precision === 'place')
      .slice(0, 50)
      .map((item) => {
        const distance = distanceFor(viewer, item);
        return {
          latitude: item.latitude,
          longitude: item.longitude,
          placeId: item.placeId,
          scope: item.scope,
          precision: item.precision,
          profile: item.profile,
          updatedAt: item.updatedAt,
          expiresAt: item.expiresAt,
          distanceMode: distance.mode,
          distanceLabel: distance.label,
          distanceMeters: distance.mode === 'exact' ? distance.meters : null,
        };
      });
    return { ok: true, items, mutualDistanceEnabled: Boolean(viewer && viewer.distanceConsent) };
  }

  return { ok: false, error: 'UNKNOWN_ACTION' };
};
