const store = require('../../services/store');
Page({
  data: { profile: {}, privacy: {} },
  onShow() { this.setData({ profile: store.getProfile(), privacy: store.getPrivacy() }); },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
});
