const mock = require('../../data/mock');

Page({
  data: { place: {}, people: [] },
  onLoad(options) {
    const place = mock.places.find((p) => p.id === options.id) || mock.places[0];
    const people = mock.people.filter((p) => p.placeId === place.id);
    this.setData({ place, people });
    wx.setNavigationBarTitle({ title: place.name });
  },
  discuss() { wx.navigateTo({ url: `/pages/chat/index?id=place-library&title=${encodeURIComponent(this.data.place.name)}` }); },
  activity() { wx.navigateTo({ url: `/pages/activity-create/index?place=${encodeURIComponent(this.data.place.name)}` }); },
});
