const store = require('../../services/store');
Page({
  data: { list: [] },
  onShow() { this.setData({ list: store.getNotifications() }); },
  open(e) {
    const id = e.currentTarget.dataset.id; const list = store.getNotifications(); const item = list.find((n) => n.id === id);
    store.saveNotifications(list.map((n) => n.id === id ? { ...n, unread: false } : n)); this.setData({ list: store.getNotifications() });
    if (item && item.target) wx.navigateTo({ url: item.target });
  },
  readAll() { store.saveNotifications(store.getNotifications().map((n) => ({ ...n, unread: false }))); this.onShow(); },
});
