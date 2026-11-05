const store = require('../../services/store');
Page({
  data: { privacy: {}, durations: [30, 60, 120], durationIndex: 1 },
  onShow() { const privacy = store.getPrivacy(); this.setData({ privacy, durationIndex: Math.max(0, this.data.durations.indexOf(privacy.duration)) }); },
  toggle(e) { const privacy = store.savePrivacy({ enabled: e.detail.value }); this.setData({ privacy }); },
  duration(e) { const duration = this.data.durations[Number(e.detail.value)]; const privacy = store.savePrivacy({ duration }); this.setData({ privacy, durationIndex: Number(e.detail.value) }); },
  scope(e) { const privacy = store.savePrivacy({ scope: e.detail.value }); this.setData({ privacy }); },
  revoke() { const privacy = store.savePrivacy({ enabled: false }); this.setData({ privacy }); wx.showToast({ title: 'Sharing stopped' }); },
});
