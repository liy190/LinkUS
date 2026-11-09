const api = require('../../services/api');
const mock = require('../../data/mock');

Page({
  data: { list: [], visible: [], keyword: '', loading: true },
  onShow() {
    this.load();
    if (this.getTabBar()) this.getTabBar().setData({ selected: 2, hidden: false });
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.listGroups().then((list) => {
      this.setData({
        list: list.map((group) => ({
          ...group,
          // 头像只来自云端群文档；没有就显示群 emoji，不再用演示人物拼贴
          memberAvatars: Array.isArray(group.memberAvatars) ? group.memberAvatars.slice(0, 3) : [],
        })),
      });
      this.applyFilter();
    }).catch((error) => {
      console.warn('listGroups failed', error);
      wx.showToast({ title: error.message || 'Unable to load groups', icon: 'none' });
    }).finally(() => this.setData({ loading: false }));
  },
  applyFilter() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const visible = keyword
      ? this.data.list.filter((item) => `${item.name} ${item.description || ''}`.toLowerCase().indexOf(keyword) >= 0)
      : this.data.list;
    this.setData({ visible });
  },
  search(e) { this.setData({ keyword: e.detail.value }); this.applyFilter(); },
  clearSearch() { this.setData({ keyword: '' }); this.applyFilter(); },
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
