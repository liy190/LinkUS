const mock = require('../../data/mock');
Page({
  data: { people: [], places: [] },
  onLoad() { this.setData({ people: mock.people, places: mock.places }); },
  message(e) { const person = this.data.people.find((p) => p.id === e.currentTarget.dataset.id); wx.navigateTo({ url: `/pages/chat/index?id=dm-george&title=${encodeURIComponent(person.name)}` }); },
});
