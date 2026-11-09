const api = require('../../services/api');
const mock = require('../../data/mock');

Page({
  data: { keyword: '', people: [], places: [], activities: [], groups: [], searched: false, loading: false },
  onLoad() { this.index = null; },
  input(e) { this.setData({ keyword: e.detail.value }); },
  search() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    if (!keyword) {
      this.setData({ searched: false, people: [], places: [], activities: [], groups: [] });
      return;
    }
    this.setData({ loading: true });
    Promise.all([
      api.listUsers().catch(() => []),
      api.listActivities().catch(() => []),
      api.listGroups().catch(() => []),
    ]).then(([users, activities, groups]) => {
      const people = users.filter((user) => `${user.nickname} ${user.handle} ${user.faculty}`.toLowerCase().indexOf(keyword) >= 0);
      const places = mock.places.filter((place) => `${place.name} ${place.short} ${place.tags.join(' ')}`.toLowerCase().indexOf(keyword) >= 0);
      const matchedActivities = activities.filter((item) => `${item.title} ${item.place}`.toLowerCase().indexOf(keyword) >= 0);
      const matchedGroups = groups.filter((item) => `${item.name} ${item.description}`.toLowerCase().indexOf(keyword) >= 0);
      this.setData({ people, places, activities: matchedActivities, groups: matchedGroups, searched: true });
    }).finally(() => this.setData({ loading: false }));
  },
  openPerson(e) { wx.navigateTo({ url: `/pages/user/index?id=${e.currentTarget.dataset.id}` }); },
  openPlace(e) { wx.navigateTo({ url: `/pages/place-detail/index?id=${e.currentTarget.dataset.id}` }); },
  openActivity(e) { wx.navigateTo({ url: `/pages/activity-detail/index?id=${e.currentTarget.dataset.id}` }); },
  openGroup(e) { wx.navigateTo({ url: `/pages/group-detail/index?id=${e.currentTarget.dataset.id}` }); },
});
