const api = require('../../services/api');
Page({
  data: { list: [], loading: true },
  onShow() { this.setData({ loading: true }); api.listActivities().then((list) => this.setData({ list })).finally(() => this.setData({ loading: false })); },
  open(e) { wx.navigateTo({ url: `/pages/activity-detail/index?id=${e.currentTarget.dataset.id}` }); },
  create() { wx.navigateTo({ url: '/pages/activity-create/index' }); },
});
