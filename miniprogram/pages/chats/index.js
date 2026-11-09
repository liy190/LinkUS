const api = require('../../services/api');

Page({
  data: { list: [], visible: [], keyword: '', loading: true },
  onShow() {
    this.load();
    if (this.getTabBar()) this.getTabBar().setData({ selected: 1, hidden: false });
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.listConversations()
      .then((list) => {
        this.setData({ list });
        this.applyFilter();
      })
      .catch((error) => wx.showToast({ title: error.message || 'Unable to load chats', icon: 'none' }))
      .finally(() => this.setData({ loading: false }));
  },
  applyFilter() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const visible = keyword
      ? this.data.list.filter((item) => `${item.title} ${item.preview || ''}`.toLowerCase().indexOf(keyword) >= 0)
      : this.data.list;
    this.setData({ visible });
  },
  search(e) { this.setData({ keyword: e.detail.value }); this.applyFilter(); },
  clearSearch() { this.setData({ keyword: '' }); this.applyFilter(); },
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
    }).catch((error) => wx.showToast({ title: error.message || 'Unable to find users', icon: 'none' }));
  },
  open(e) {
    const { id, title, avatar } = e.currentTarget.dataset;
    // Opening a conversation clears its badge; the store keeps that result so the
    // red dot does not come back after the list re-renders.
    api.markConversationRead(id)
      .then(() => this.load())
      .catch((error) => console.warn('markConversationRead failed', error));
    wx.navigateTo({ url: `/pages/chat/index?id=${id}&title=${encodeURIComponent(title)}&avatar=${encodeURIComponent(avatar || '')}` });
  },
});
