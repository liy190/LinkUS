const store = require('../../services/store');

Page({
  data: { profile: {} },
  onLoad() { this.setData({ profile: store.getProfile() }); },
  // A returning user already finished onboarding, so Explorer skips the sign-in
  // screen instead of making them tap through it on every cold start.
  enter() {
    const profile = store.getProfile();
    if (profile && profile.profileComplete) {
      wx.switchTab({ url: '/pages/map/index' });
      return;
    }
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
