const store = require('../../services/store');

Page({
  data: { profile: {} },
  onLoad() { this.setData({ profile: store.getProfile() }); },
  enter() { wx.switchTab({ url: '/pages/map/index' }); },
});
