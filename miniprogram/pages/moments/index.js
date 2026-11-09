const api = require('../../services/api');
const store = require('../../services/store');

const SCOPES = [
  { key: 'feed', label: 'Feed' },
  { key: 'mine', label: 'Mine' },
  { key: 'liked', label: 'Liked' },
];

Page({
  data: {
    scopes: SCOPES,
    scope: 'feed',
    list: [],
    text: '',
    visibility: 'public',
    visibilityLabel: 'Everyone',
    posting: false,
    loading: true,
  },
  onLoad(options) {
    if (options && ['feed', 'mine', 'liked'].indexOf(options.scope) >= 0) {
      this.setData({ scope: options.scope });
      wx.setNavigationBarTitle({ title: options.scope === 'liked' ? 'Liked moments' : (options.scope === 'mine' ? 'My moments' : 'Moments') });
    }
  },
  onShow() { this.load(); },
  load() {
    this.setData({ loading: true });
    return api.listPosts(this.data.scope)
      .then((list) => this.setData({ list }))
      .catch((error) => {
        console.warn('listPosts failed', error);
        wx.showToast({ title: 'Unable to load moments', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  switchScope(e) {
    this.setData({ scope: e.currentTarget.dataset.key }, () => this.load());
  },
  input(e) { this.setData({ text: e.detail.value }); },
  pickVisibility() {
    const options = [
      { value: 'public', label: 'Everyone' },
      { value: 'followers', label: 'Followers' },
      { value: 'private', label: 'Only me' },
    ];
    wx.showActionSheet({
      itemList: options.map((item) => item.label),
      success: ({ tapIndex }) => this.setData({ visibility: options[tapIndex].value, visibilityLabel: options[tapIndex].label }),
    });
  },
  publish() {
    const text = this.data.text.trim();
    if (!text || this.data.posting) return;
    this.setData({ posting: true });
    api.createPost({ text, visibility: this.data.visibility })
      .then(() => {
        this.setData({ text: '' });
        wx.showToast({ title: 'Posted' });
        this.load();
      })
      .catch((error) => wx.showToast({ title: error.message || 'Post failed', icon: 'none' }))
      .finally(() => this.setData({ posting: false }));
  },
  toggleLike(e) {
    const id = e.currentTarget.dataset.id;
    api.togglePostLike(id).then(() => this.load()).catch(() => wx.showToast({ title: 'Failed', icon: 'none' }));
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: 'Delete this moment?',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.deletePost(id).then(() => this.load()).catch(() => wx.showToast({ title: 'Delete failed', icon: 'none' }));
      },
    });
  },
  openAuthor(e) {
    const id = e.currentTarget.dataset.id;
    const me = store.getProfile();
    if (id === (me.userId || me.id)) wx.navigateTo({ url: '/pages/profile/index' });
    else wx.navigateTo({ url: `/pages/user/index?id=${id}` });
  },
});
