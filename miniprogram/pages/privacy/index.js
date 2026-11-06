const store = require('../../services/store');
const locationApi = require('../../services/location');
const mock = require('../../data/mock');
Page({
  data: { privacy: {}, durations: [30, 60, 120], durationIndex: 1 },
  onShow() { const privacy = store.getPrivacy(); this.setData({ privacy, durationIndex: Math.max(0, this.data.durations.indexOf(privacy.duration)) }); },
  toggle(e) {
    const enabled = e.detail.value;
    const privacy = store.savePrivacy({ enabled });
    this.setData({ privacy });
    if (!enabled) locationApi.revoke().catch(() => {});
  },
  duration(e) { const duration = this.data.durations[Number(e.detail.value)]; const privacy = store.savePrivacy({ duration }); this.setData({ privacy, durationIndex: Number(e.detail.value) }); },
  scope(e) { const privacy = store.savePrivacy({ scope: e.detail.value }); this.setData({ privacy }); },
  precision(e) { const privacy = store.savePrivacy({ precision: e.detail.value }); this.setData({ privacy }); },
  mutualDistance(e) {
    const mutualDistance = e.detail.value;
    const privacy = store.savePrivacy({ mutualDistance });
    this.setData({ privacy });
    if (!privacy.enabled) return;
    if (!mutualDistance) {
      locationApi.disableDistanceConsent().catch(() => {});
      wx.showToast({ title: 'Exact distance disabled', icon: 'none' });
      return;
    }
    locationApi.getCurrentLocation()
      .then((location) => locationApi.publish(location, privacy, store.getProfile(), mock.places))
      .then(() => wx.showToast({ title: 'Mutual distance enabled', icon: 'none' }))
      .catch(() => {
        const reverted = store.savePrivacy({ mutualDistance: false });
        this.setData({ privacy: reverted });
        wx.showToast({ title: 'Location permission required', icon: 'none' });
      });
  },
  revoke() {
    const privacy = store.savePrivacy({ enabled: false });
    this.setData({ privacy });
    locationApi.revoke().catch(() => {});
    wx.showToast({ title: 'Sharing stopped' });
  },
});
