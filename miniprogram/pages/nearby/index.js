const mock = require('../../data/mock');
const api = require('../../services/api');
const locationApi = require('../../services/location');

Page({
  data: { people: [], places: [], live: false, loading: true },
  onLoad() {
    this.setData({ places: mock.places });
    this.load();
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  // 只显示真正共享了位置的人；不再把"所有用户"伪装成附近的人
  load() {
    this.setData({ loading: true });
    return locationApi.list()
      .then((result) => {
        this.setData({ people: (result.items || []).map(locationApi.normalizeSharedUser), live: Boolean(result.configured) });
      })
      .catch((error) => {
        console.warn('locationSync list failed', error.message || error);
        this.setData({ people: [], live: true });
        wx.showToast({ title: error.message || 'Unable to load nearby people', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  openProfile(e) {
    wx.navigateTo({ url: `/pages/user/index?id=${e.currentTarget.dataset.id}` });
  },
  message(e) {
    const person = this.data.people.find((item) => (item.userId || item.id) === e.currentTarget.dataset.id);
    if (!person) return;
    api.createDirectConversation(person.userId || person.id)
      .then((conversation) => wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&uid=${person.userId || person.id}&title=${encodeURIComponent(conversation.title)}&avatar=${encodeURIComponent(conversation.avatar || person.avatar || '')}` }))
      .catch((error) => wx.showToast({ title: error.message || 'Unable to start chat', icon: 'none' }));
  },
});
