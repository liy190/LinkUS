const api = require('../../services/api');
const store = require('../../services/store');

Page({
  data: { user: {}, stats: { following: 0, followers: 0 }, isFollowing: false, isMe: false, loading: true, blocked: false, degraded: false },
  onLoad(options) {
    this.userId = options.id || '';
    // 调用方可以把已知的昵称/头像带过来，云函数不可用时也能显示一个像样的页面
    this.hint = {
      nickname: options.name ? decodeURIComponent(options.name) : '',
      avatar: options.avatar ? decodeURIComponent(options.avatar) : '',
    };
    this.load();
  },
  onShow() { if (this.userId && !this.data.loading) this.load(); },
  load() {
    if (!this.userId) { this.setData({ loading: false, degraded: true }); return; }
    this.setData({ loading: true });
    const profile = store.getProfile();
    const meId = profile.userId || profile.id;
    Promise.all([
      api.getUser(this.userId).catch((error) => {
        console.warn('getUser failed', error);
        return null;
      }),
      api.followStats(this.userId).catch(() => ({ following: 0, followers: 0, isFollowing: false })),
    ]).then(([user, stats]) => {
      const resolved = user || {
        userId: this.userId,
        nickname: this.hint.nickname || 'LinkUS user',
        handle: `@${String(this.userId).slice(-8)}`,
        avatar: this.hint.avatar || '/images/avatars/saber.svg',
        faculty: '',
        bio: '',
        interests: [],
      };
      const isMe = resolved.userId === meId;
      this.setData({
        user: resolved,
        stats,
        isFollowing: stats.isFollowing,
        isMe,
        degraded: !user,
        loading: false,
      });
      wx.setNavigationBarTitle({ title: resolved.nickname });
      this.refreshBlocked();
    }).catch((error) => {
      console.warn('user page load failed', error);
      this.setData({ loading: false, degraded: true });
    });
  },
  refreshBlocked() {
    api.listBlocked()
      .then((users) => this.setData({ blocked: users.some((item) => item.userId === this.userId) }))
      .catch((error) => console.warn('listBlocked failed', error.message || error));
  },
  toggleFollow() {
    const action = this.data.isFollowing ? api.unfollow(this.userId) : api.follow(this.userId);
    action.then(() => this.load()).catch((error) => wx.showToast({ title: error.message || 'Failed', icon: 'none' }));
  },
  message() {
    api.createDirectConversation(this.userId).then((conversation) => {
      wx.navigateTo({ url: `/pages/chat/index?id=${conversation.id}&uid=${this.userId}&title=${encodeURIComponent(conversation.title)}&avatar=${encodeURIComponent(conversation.avatar || '')}` });
    }).catch(() => wx.showToast({ title: 'Unable to open chat', icon: 'none' }));
  },
  openFollowing() { wx.navigateTo({ url: `/pages/follow-list/index?type=following&id=${this.userId}` }); },
  openFollowers() { wx.navigateTo({ url: `/pages/follow-list/index?type=followers&id=${this.userId}` }); },
  report() {
    const reasons = ['Spam', 'Harassment', 'Fake profile', 'Other'];
    wx.showActionSheet({
      itemList: reasons,
      success: ({ tapIndex }) => {
        api.report({ targetType: 'user', targetId: this.userId, reason: reasons[tapIndex] })
          .then(() => wx.showToast({ title: 'Report sent' }))
          .catch(() => wx.showToast({ title: 'Report failed', icon: 'none' }));
      },
    });
  },
  block() {
    const blocked = this.data.blocked;
    wx.showModal({
      title: blocked ? 'Unblock this user?' : 'Block this user?',
      content: blocked ? 'They will be able to message you again.' : 'They will no longer be able to message you.',
      success: ({ confirm }) => {
        if (!confirm) return;
        const action = blocked ? api.unblock(this.userId) : api.block(this.userId);
        action.then(() => this.load()).catch(() => wx.showToast({ title: 'Failed', icon: 'none' }));
      },
    });
  },
});
