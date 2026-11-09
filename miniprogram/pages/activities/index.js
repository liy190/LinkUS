const api = require('../../services/api');

Page({
  data: { list: [], loading: true },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.listActivities()
      .then((list) => this.setData({ list }))
      .catch((error) => {
        console.warn('listActivities failed', error);
        wx.showToast({ title: 'Unable to load activities', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  open(e) { wx.navigateTo({ url: `/pages/activity-detail/index?id=${e.currentTarget.dataset.id}` }); },
  create() { wx.navigateTo({ url: '/pages/activity-create/index' }); },
});
