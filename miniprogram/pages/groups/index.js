const api = require('../../services/api');

Page({
  data: { list: [], loading: true },
  onShow() { this.load(); if (this.getTabBar()) this.getTabBar().setData({ selected: 2 }); },
  load() { this.setData({ loading: true }); api.listGroups().then((list) => this.setData({ list })).finally(() => this.setData({ loading: false })); },
  add() {
    wx.showModal({
      title: 'Create group',
      editable: true,
      placeholderText: 'Group name',
      success: (result) => {
        const name = String(result.content || '').trim();
        if (!result.confirm || !name) return;
        wx.showLoading({ title: 'Creating' });
        api.createGroup({ name, avatar: '👥', description: 'A LinkUS community created by students.' }).then(() => this.load())
          .catch((error) => wx.showToast({ title: error.message || 'Create failed', icon: 'none' }))
          .finally(() => wx.hideLoading());
      },
    });
  },
  open(e) { wx.navigateTo({ url: `/pages/group-detail/index?id=${e.currentTarget.dataset.id}` }); },
});
