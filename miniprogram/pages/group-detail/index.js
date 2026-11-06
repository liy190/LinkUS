const api = require('../../services/api');

Page({
  data: { group: {}, loading: true },
  onLoad(options) { this.id = options.id; this.load(); },
  load() {
    this.setData({ loading: true });
    return api.listGroups().then((groups) => {
      const group = groups.find((item) => item.id === this.id) || groups[0];
      if (!group) return;
      this.setData({ group });
      wx.setNavigationBarTitle({ title: group.name });
    }).finally(() => this.setData({ loading: false }));
  },
  join() {
    const group = this.data.group;
    const action = group.joined ? api.leaveGroup(group.id) : api.joinGroup(group.id);
    wx.showLoading({ title: group.joined ? 'Leaving' : 'Joining' });
    action.then((updated) => this.setData({ group: updated }))
      .catch((error) => wx.showToast({ title: error.message || 'Update failed', icon: 'none' }))
      .finally(() => wx.hideLoading());
  },
  chat() {
    const group = this.data.group;
    wx.navigateTo({ url: `/pages/chat/index?id=${group.conversationId}&title=${encodeURIComponent(group.name)}` });
  },
});
