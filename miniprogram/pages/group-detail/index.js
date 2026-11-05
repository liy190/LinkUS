const store = require('../../services/store');
Page({
  data: { group: {} },
  onLoad(options) { this.id = options.id; this.load(); },
  load() { const group = store.getGroups().find((g) => g.id === this.id) || store.getGroups()[0]; this.setData({ group }); wx.setNavigationBarTitle({ title: group.name }); },
  join() { const groups = store.getGroups().map((g) => g.id === this.data.group.id ? { ...g, joined: !g.joined, members: g.members + (g.joined ? -1 : 1) } : g); store.saveGroups(groups); this.load(); },
  chat() { const g = this.data.group; wx.navigateTo({ url: `/pages/chat/index?id=${g.conversationId}&title=${encodeURIComponent(g.name)}` }); },
});
