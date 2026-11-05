const store = require('../../services/store');
Page({
  data: { activity: {} },
  onLoad(options) { this.id = options.id; this.load(); },
  load() { const activity = store.getActivities().find((a) => a.id === this.id) || store.getActivities()[0]; this.setData({ activity }); wx.setNavigationBarTitle({ title: activity.title }); },
  join() { const list = store.getActivities().map((a) => a.id === this.data.activity.id ? { ...a, joined: !a.joined, seats: a.seats + (a.joined ? 1 : -1) } : a); store.saveActivities(list); this.load(); },
});
