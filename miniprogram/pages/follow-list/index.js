const api = require('../../services/api');

Page({
  data: { list: [], loading: true, type: 'following', title: 'Following' },
  onLoad(options) {
    this.type = options.type === 'followers' ? 'followers' : 'following';
    this.userId = options.id || '';
    const title = this.type === 'followers' ? 'Followers' : 'Following';
    this.setData({ type: this.type, title });
    wx.setNavigationBarTitle({ title });
    this.load();
  },
  load() {
    this.setData({ loading: true });
    const request = this.type === 'followers' ? api.listFollowers(this.userId) : api.listFollowing(this.userId);
    request.then((list) => this.setData({ list }))
      .catch((error) => {
        console.warn('follow list failed', error);
        wx.showToast({ title: 'Unable to load list', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  open(e) {
    wx.navigateTo({ url: `/pages/user/index?id=${e.currentTarget.dataset.id}` });
  },
});
