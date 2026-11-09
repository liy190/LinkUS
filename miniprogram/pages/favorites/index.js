const api = require('../../services/api');
const mock = require('../../data/mock');

Page({
  data: { list: [], loading: true },
  onShow() { this.load(); },
  load() {
    this.setData({ loading: true });
    api.listFavorites()
      .then((ids) => this.setData({ list: ids.map((id) => mock.places.find((place) => place.id === id)).filter(Boolean) }))
      .catch((error) => console.warn('listFavorites failed', error))
      .finally(() => this.setData({ loading: false }));
  },
  open(e) { wx.navigateTo({ url: `/pages/place-detail/index?id=${e.currentTarget.dataset.id}` }); },
  remove(e) {
    api.toggleFavorite(e.currentTarget.dataset.id).then(() => this.load());
  },
});
