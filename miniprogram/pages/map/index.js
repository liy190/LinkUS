const mock = require('../../data/mock');
const store = require('../../services/store');

Page({
  data: { places: [], people: [], query: '', filtered: [], privacy: {} },
  onShow() { this.setData({ places: mock.places, people: mock.people, filtered: mock.places, privacy: store.getPrivacy() }); },
  search(e) {
    const query = e.detail.value.trim().toLowerCase();
    const filtered = mock.places.filter((p) => p.name.toLowerCase().includes(query) || p.tags.join(' ').toLowerCase().includes(query));
    this.setData({ query, filtered });
  },
  openPlace(e) { wx.navigateTo({ url: `/pages/place-detail/index?id=${e.currentTarget.dataset.id}` }); },
  openProfile() { wx.navigateTo({ url: '/pages/profile/index' }); },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/index' }); },
});
