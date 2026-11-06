const store = require('../../services/store');
const api = require('../../services/api');
Page({
  data: { profile: {}, privacy: {} },
  onShow() {
    this.setData({ profile: store.getProfile(), privacy: store.getPrivacy() });
    api.bootstrap().then(({ user }) => this.setData({ profile: user })).catch(() => {});
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/chats/index' }) }); },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
});
