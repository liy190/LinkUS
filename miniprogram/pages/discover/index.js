Page({
  onShow() { if (this.getTabBar()) this.getTabBar().setData({ selected: 3, hidden: false }); },
  add() { wx.navigateTo({ url: '/pages/activity-create/index' }); },
  open(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
});
