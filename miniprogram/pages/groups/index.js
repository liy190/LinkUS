const store = require('../../services/store');
Page({
  data: { list: [] },
  onShow() { this.setData({ list: store.getGroups() }); },
  open(e) { wx.navigateTo({ url: `/pages/group-detail/index?id=${e.currentTarget.dataset.id}` }); },
});
