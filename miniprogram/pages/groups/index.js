const api = require('../../services/api');
const mock = require('../../data/mock');

Page({
  data: { list: [], loading: true },
  onShow() {
    this.load();
    if (this.getTabBar()) this.getTabBar().setData({ selected: 2, hidden: false });
  },
  load() {
    this.setData({ loading: true });
    api.listGroups().then((list) => this.setData({
      list: list.map((group, index) => ({
        ...group,
        memberAvatars: (group.memberAvatars && group.memberAvatars.length
          ? group.memberAvatars
          : mock.people.slice(index % 2, index % 2 + 3).map((person) => person.avatar)).slice(0, 3),
      })),
    })).finally(() => this.setData({ loading: false }));
  },
  add() {
    wx.showModal({
      title: 'Create group',
      editable: true,
      placeholderText: 'Group name',
      success: (result) => {
        const name = String(result.content || '').trim();
        if (!result.confirm || !name) return;
        wx.showLoading({ title: 'Creating' });
        api.createGroup({ name, avatar: 'HKU', description: 'A LinkUS community created by students.' }).then(() => this.load())
          .catch((error) => wx.showToast({ title: error.message || 'Create failed', icon: 'none' }))
          .finally(() => wx.hideLoading());
      },
    });
  },
  open(e) { wx.navigateTo({ url: `/pages/group-detail/index?id=${e.currentTarget.dataset.id}` }); },
});
