const mock = require('../../data/mock');
const api = require('../../services/api');
const locationApi = require('../../services/location');
Page({
  data: { people: [], places: [], live: false },
  onLoad() {
    this.setData({ places: mock.places });
    locationApi.list().then((result) => {
      if (result.configured) {
        this.setData({ people: (result.items || []).map(locationApi.normalizeSharedUser), live: true });
        return;
      }
      return api.listUsers().then((users) => this.setData({ people: users.map((user, index) => ({ ...user, name: user.nickname, status: user.bio || 'New to LinkUS', placeId: mock.places[index % mock.places.length].id })), live: false }));
    }).catch(() => this.setData({ people: [], live: true }));
  },
  message(e) {
    const person = this.data.people.find((item) => (item.userId || item.id) === e.currentTarget.dataset.id);
    if (!person) return;
    api.createDirectConversation(person.userId || person.id).then((conversation) => wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&title=${encodeURIComponent(conversation.title)}&avatar=${encodeURIComponent(conversation.avatar || person.avatar || '')}` }));
  },
});
