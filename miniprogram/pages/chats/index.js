const api = require('../../services/api');

Page({
  data: { list: [], loading: true },
  onShow() {
    this.load();
    if (this.getTabBar()) this.getTabBar().setData({ selected: 1, hidden: false });
  },
  load() {
    this.setData({ loading: true });
    api.listConversations().then((list) => this.setData({ list }))
      .catch(() => wx.showToast({ title: 'Unable to load chats', icon: 'none' }))
      .finally(() => this.setData({ loading: false }));
  },
  add() {
    api.listUsers().then((users) => {
      if (!users.length) {
        wx.showToast({ title: 'No other LinkUS users yet', icon: 'none' });
        return;
      }
      wx.showActionSheet({
        itemList: users.map((user) => user.nickname),
        success: ({ tapIndex }) => api.createDirectConversation(users[tapIndex].userId).then((conversation) => {
          wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&title=${encodeURIComponent(conversation.title)}&avatar=${encodeURIComponent(conversation.avatar || '')}` });
        }),
      });
    }).catch(() => wx.showToast({ title: 'Unable to find users', icon: 'none' }));
  },
  open(e) {
    const { id, title, avatar } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/chat/index?id=${id}&title=${encodeURIComponent(title)}&avatar=${encodeURIComponent(avatar || '')}` });
  },
});
