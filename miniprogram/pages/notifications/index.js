const api = require('../../services/api');
Page({
  data: { list: [], loading: true },
  onShow() { this.load(); if (this.getTabBar()) this.getTabBar().setData({ selected: 4, hidden: false }); },
  load() { this.setData({ loading: true }); return api.listNotifications().then((list) => this.setData({ list: list.map((item, index) => ({ ...item, iconKind: index % 4 })) })).finally(() => this.setData({ loading: false })); },
  add() { this.readAll(); },
  open(e) {
    const item = this.data.list.find((notice) => notice.id === e.currentTarget.dataset.id);
    if (!item) return;
    api.markNotification(item.id).then(() => this.load());
    if (item.target) wx.navigateTo({ url: item.target });
  },
  readAll() { api.markAllNotifications().then(() => this.load()); },
});
