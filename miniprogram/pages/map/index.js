const mock = require('../../data/mock');
const store = require('../../services/store');
const locationApi = require('../../services/location');
const api = require('../../services/api');
const geo = require('../../utils/geo');

const PLACE_ICON = '/images/icons/home-active.png';
const SHARED_USER_ICON = '/images/avatar.png';

function presentPlace(place, currentLocation, people) {
  const gcj = geo.wgs84ToGcj02(place.latitude, place.longitude);
  const peopleList = people.filter((person) => person.placeId === place.id);
  return {
    ...place,
    gcj,
    peopleList,
    distance: geo.formatDistance(geo.distanceMeters(currentLocation, gcj)),
  };
}

Page({
  data: {
    latitude: 22.2839,
    longitude: 114.1373,
    scale: 16,
    showLocation: false,
    privacy: {},
    selectedPlace: null,
    markers: [],
    currentLocation: null,
    liveStatus: 'Location sharing is off',
  },

  onLoad() {
    const center = geo.wgs84ToGcj02(22.2839, 114.1373);
    this.setData({ latitude: center.latitude, longitude: center.longitude });
  },

  onShow() {
    if (this.getTabBar()) this.getTabBar().setData({ selected: 0, hidden: false });
    const privacy = store.getPrivacy();
    this.setData({ privacy, liveStatus: privacy.enabled ? 'Location sharing ready' : 'Location sharing is off' });
    this.refreshMap();
    this.refreshSharedUsers();
    wx.getSetting({
      success: ({ authSetting }) => {
        if (authSetting['scope.userLocation']) this.locate(false);
      },
    });
  },

  refreshMap(sharedUsers = this.sharedUsers || []) {
    const livePeople = sharedUsers.map(locationApi.normalizeSharedUser);
    // 不再用演示人物凑数：没人共享位置地图上就只有地点
    const peopleSource = livePeople;
    const places = mock.places.map((place) => presentPlace(place, this.data.currentLocation, peopleSource));
    const placeMarkers = places.map((place, index) => ({
      id: index + 1,
      latitude: place.gcj.latitude,
      longitude: place.gcj.longitude,
      iconPath: PLACE_ICON,
      width: 42,
      height: 42,
      title: place.name,
      label: { content: place.short, color: '#164d98', fontSize: 11, borderRadius: 8, bgColor: '#ffffffee', padding: 4, anchorX: -18, anchorY: -48 },
    }));
    const userMarkers = sharedUsers.map((person, index) => ({
      ...(() => {
        const sharedUser = locationApi.normalizeSharedUser(person, index);
        return {
          title: sharedUser.distanceLabel ? `${sharedUser.name} · ${sharedUser.distanceLabel}` : sharedUser.name,
          callout: sharedUser.distanceLabel ? {
            content: `${sharedUser.name}\n${sharedUser.distanceLabel}`,
            display: 'BYCLICK',
            color: '#164d98',
            bgColor: '#ffffff',
            borderRadius: 10,
            padding: 8,
          } : undefined,
        };
      })(),
      id: 1000 + index,
      latitude: person.latitude,
      longitude: person.longitude,
      iconPath: SHARED_USER_ICON,
      width: 36,
      height: 36,
    }));
    this.places = places;
    const selectedPlace = this.data.selectedPlace
      ? places.find((place) => place.id === this.data.selectedPlace.id)
      : null;
    this.setData({ markers: [...placeMarkers, ...userMarkers], selectedPlace });
  },

  refreshSharedUsers() {
    locationApi.list().then((result) => {
      this.liveConfigured = Boolean(result.configured);
      this.sharedUsers = result.configured ? (result.items || []) : [];
      this.refreshMap(this.sharedUsers);
      if (result.configured && this.data.privacy.enabled) this.setData({ liveStatus: 'Live sharing active' });
    }).catch(() => {
      this.liveConfigured = false;
      this.sharedUsers = [];
      this.refreshMap();
    });
  },

  markerTap(e) {
    const id = Number(e.detail.markerId);
    if (id >= 1 && id <= this.places.length) {
      const place = this.places[id - 1];
      this.setData({ selectedPlace: place, latitude: place.gcj.latitude, longitude: place.gcj.longitude });
      return;
    }
    if (id >= 1000) {
      const person = locationApi.normalizeSharedUser(this.sharedUsers[id - 1000], id - 1000);
      wx.showActionSheet({
        itemList: ['View profile', 'Message'],
        success: ({ tapIndex }) => {
          if (tapIndex === 0) this.openUserProfile(person);
          else this.startChat(person);
        },
      });
    }
  },

  openSelected() {
    const place = this.data.selectedPlace;
    if (place) wx.navigateTo({ url: `/pages/place-detail/index?id=${place.id}` });
  },

  navigateSelected() {
    const place = this.data.selectedPlace;
    if (!place) return;
    wx.openLocation({
      latitude: place.gcj.latitude,
      longitude: place.gcj.longitude,
      name: place.name,
      address: place.address,
      scale: 18,
    });
  },

  openPerson(e) {
    const people = this.data.selectedPlace ? this.data.selectedPlace.peopleList : [];
    const person = people.find((item) => item.id === e.currentTarget.dataset.id);
    if (!person) return;
    this.startChat(person);
  },

  openUserProfile(person) {
    const userId = person.userId || person.id;
    if (!userId) return;
    wx.navigateTo({
      url: `/pages/user/index?id=${userId}&name=${encodeURIComponent(person.name || '')}&avatar=${encodeURIComponent(person.avatar || '')}`,
    });
  },

  startChat(person) {
    const userId = person.userId || person.id;
    api.createDirectConversation(userId).then((conversation) => {
      wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&uid=${userId}&title=${encodeURIComponent(conversation.title || person.name)}&avatar=${encodeURIComponent(conversation.avatar || person.avatar || '')}` });
    }).catch(() => wx.showToast({ title: 'Unable to start chat', icon: 'none' }));
  },

  closeCard() { this.setData({ selectedPlace: null }); },
  openChats() { wx.switchTab({ url: '/pages/chats/index' }); },
  openProfile() { wx.navigateTo({ url: '/pages/profile/index' }); },
  openPrivacy() { wx.navigateTo({ url: '/pages/privacy/index' }); },

  search() {
    const categoryMap = this.places.reduce((result, place) => {
      const category = place.category || 'Featured';
      if (!result[category]) result[category] = [];
      result[category].push(place);
      return result;
    }, {});
    const categories = Object.keys(categoryMap);
    wx.showActionSheet({
      itemList: categories,
      success: ({ tapIndex }) => {
        const choices = categoryMap[categories[tapIndex]];
        wx.showActionSheet({
          itemList: choices.map((place) => place.name),
          success: ({ tapIndex: placeIndex }) => {
            const place = choices[placeIndex];
            this.setData({ latitude: place.gcj.latitude, longitude: place.gcj.longitude, scale: 18, selectedPlace: place });
          },
        });
      },
    });
  },

  locate(showFailure = true) {
    locationApi.getCurrentLocation().then(({ latitude, longitude }) => {
      const currentLocation = { latitude, longitude };
      this.setData({ latitude, longitude, scale: 17, showLocation: true, currentLocation });
      this.refreshMap();
      const privacy = store.getPrivacy();
      return locationApi.publish(currentLocation, privacy, store.getProfile(), mock.places);
    }).then((result) => {
      if (result && result.configured && !result.skipped) {
        this.setData({ liveStatus: 'Live sharing active' });
        this.refreshSharedUsers();
      }
    }).catch(() => {
      if (showFailure !== false) locationApi.promptPermission();
    });
  },
});
