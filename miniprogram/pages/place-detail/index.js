const mock = require('../../data/mock');
const geo = require('../../utils/geo');
const locationApi = require('../../services/location');
const api = require('../../services/api');

Page({
  data: { place: {}, people: [], markers: [], showLocation: false, peopleLabel: 'demo profiles', favorite: false, statuses: [] },

  onLoad(options) {
    const source = mock.places.find((place) => place.id === options.id) || mock.places[0];
    const gcj = geo.wgs84ToGcj02(source.latitude, source.longitude);
    const place = { ...source, gcj, distance: 'Tap locate to measure distance' };
    this.setData({
      place,
      people: [],
      markers: [{ id: 1, latitude: gcj.latitude, longitude: gcj.longitude, iconPath: '/images/icons/home-active.png', width: 44, height: 44 }],
    });
    this.refreshPeople();
    this.loadFavorite();
    this.loadStatuses();
    wx.setNavigationBarTitle({ title: place.name });
    wx.getSetting({
      success: ({ authSetting }) => {
        if (authSetting['scope.userLocation']) this.measure(false);
      },
    });
  },

  loadFavorite() {
    api.listFavorites()
      .then((ids) => this.setData({ favorite: ids.indexOf(this.data.place.id) >= 0 }))
      .catch((error) => console.warn('listFavorites failed', error.message || error));
  },

  refreshPeople() {
    locationApi.list().then((result) => {
      if (!result.configured) return;
      const people = (result.items || [])
        .map(locationApi.normalizeSharedUser)
        .filter((person) => person.placeId === this.data.place.id);
      this.setData({ people, peopleLabel: 'currently sharing' });
    }).catch((error) => console.warn('refreshPeople failed', error));
  },

  measure(showFailure = true) {
    locationApi.getCurrentLocation().then((location) => {
      const distance = geo.formatDistance(geo.distanceMeters(location, this.data.place.gcj));
      this.setData({ 'place.distance': distance, showLocation: true });
    }).catch(() => {
      if (showFailure !== false) locationApi.promptPermission();
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
    if (!person) return;
    const userId = person.userId || person.id;
    wx.showActionSheet({
      itemList: ['View profile', 'Message'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) {
          wx.navigateTo({ url: `/pages/user/index?id=${userId}&name=${encodeURIComponent(person.name || '')}&avatar=${encodeURIComponent(person.avatar || '')}` });
          return;
        }
        api.createDirectConversation(userId).then((conversation) => {
          wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&uid=${userId}&title=${encodeURIComponent(conversation.title || person.name)}&avatar=${encodeURIComponent(conversation.avatar || person.avatar || '')}` });
        }).catch(() => wx.showToast({ title: 'Unable to start chat', icon: 'none' }));
      },
    });
  },
  loadStatuses() {
    api.listPlaceStatuses(this.data.place.id)
      .then((statuses) => this.setData({ statuses }))
      .catch((error) => console.warn('listPlaceStatuses failed', error));
  },
  toggleFavorite() {
    api.toggleFavorite(this.data.place.id)
      .then((result) => this.setData({ favorite: Boolean(result && result.favorited) }))
      .catch((error) => wx.showToast({ title: error.message || 'Failed', icon: 'none' }));
  },
  reportStatus() {
    const options = ['Quiet', 'Moderately busy', 'Very busy', 'Closed'];
    wx.showActionSheet({
      itemList: options,
      success: ({ tapIndex }) => {
        api.setPlaceStatus(this.data.place.id, options[tapIndex], '')
          .then(() => {
            wx.showToast({ title: 'Status shared' });
            this.loadStatuses();
          })
          .catch((error) => wx.showToast({ title: error.message || 'Failed', icon: 'none' }));
      },
    });
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/map/index' }) }); },
});
