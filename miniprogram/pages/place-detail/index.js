const mock = require('../../data/mock');
const geo = require('../../utils/geo');
const locationApi = require('../../services/location');
const api = require('../../services/api');

Page({
  data: { place: {}, people: [], markers: [], showLocation: false, peopleLabel: 'demo profiles' },

  onLoad(options) {
    const source = mock.places.find((place) => place.id === options.id) || mock.places[0];
    const gcj = geo.wgs84ToGcj02(source.latitude, source.longitude);
    const place = { ...source, gcj, distance: 'Tap locate to measure distance' };
    const people = mock.people.filter((person) => person.placeId === place.id);
    this.setData({
      place,
      people,
      markers: [{ id: 1, latitude: gcj.latitude, longitude: gcj.longitude, iconPath: '/images/icons/home-active.png', width: 44, height: 44 }],
    });
    this.refreshPeople();
    wx.setNavigationBarTitle({ title: place.name });
    wx.getSetting({
      success: ({ authSetting }) => {
        if (authSetting['scope.userLocation']) this.measure(false);
      },
    });
  },

  refreshPeople() {
    locationApi.list().then((result) => {
      if (!result.configured) return;
      const people = (result.items || [])
        .map(locationApi.normalizeSharedUser)
        .filter((person) => person.placeId === this.data.place.id);
      this.setData({ people, peopleLabel: 'currently sharing' });
    }).catch(() => {});
  },

  measure(showFailure = true) {
    locationApi.getCurrentLocation().then((location) => {
      const distance = geo.formatDistance(geo.distanceMeters(location, this.data.place.gcj));
      this.setData({ 'place.distance': distance, showLocation: true });
    }).catch(() => {
      if (showFailure !== false) wx.showToast({ title: 'Please enable location permission', icon: 'none' });
    });
  },

  navigate() {
    const place = this.data.place;
    wx.openLocation({
      latitude: place.gcj.latitude,
      longitude: place.gcj.longitude,
      name: place.name,
      address: place.address,
      scale: 18,
    });
  },

  discuss() {
    const place = this.data.place;
    api.getOrCreatePlaceConversation(place.id, `${place.name} discussion`).then((conversation) => {
      wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&title=${encodeURIComponent(conversation.title)}` });
    }).catch(() => wx.showToast({ title: 'Unable to open discussion', icon: 'none' }));
  },
  activity() { wx.navigateTo({ url: `/pages/activity-create/index?place=${encodeURIComponent(this.data.place.name)}` }); },
  openPerson(e) {
    const person = this.data.people.find((item) => item.id === e.currentTarget.dataset.id);
    if (person) {
      api.createDirectConversation(person.userId || person.id).then((conversation) => {
        wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&title=${encodeURIComponent(conversation.title || person.name)}&avatar=${encodeURIComponent(conversation.avatar || person.avatar || '')}` });
      }).catch(() => wx.showToast({ title: 'Unable to start chat', icon: 'none' }));
    }
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/map/index' }) }); },
});
