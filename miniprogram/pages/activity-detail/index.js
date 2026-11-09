const api = require('../../services/api');

Page({
  data: { activity: {}, members: [], creator: null, loading: true, busy: false },
  onLoad(options) { this.id = options.id; this.load(); },
  onShow() { if (this.id && !this.data.loading) this.load(); },
  load() {
    this.setData({ loading: true });
    return Promise.all([api.getActivity(this.id), api.listUsers().catch(() => [])])
      .then(([activity, users]) => {
        if (!activity) {
          this.setData({ activity: {}, members: [], loading: false });
          wx.showToast({ title: 'Activity not found', icon: 'none' });
          return;
        }
        const byId = {};
        users.forEach((user) => { byId[user.userId] = user; });
        const members = (activity.memberIds || []).map((id, index) => byId[id] || {
          userId: id,
          nickname: index === 0 ? 'Host' : 'LinkUS member',
          avatar: '/images/avatars/saber.svg',
        });
        const creator = byId[activity.creatorId] || members[0] || null;
        this.setData({ activity, members, creator });
        wx.setNavigationBarTitle({ title: activity.title });
      })
      .catch((error) => {
        console.warn('activity detail failed', error);
        wx.showToast({ title: 'Unable to load activity', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  join() {
    const activity = this.data.activity;
    if (!activity.id || this.data.busy) return;
    this.setData({ busy: true });
    const action = activity.joined ? api.leaveActivity(activity.id) : api.joinActivity(activity.id);
    wx.showLoading({ title: activity.joined ? 'Leaving' : 'Joining' });
    action
      .then(() => this.load())
      .catch((error) => wx.showToast({ title: error.message || 'Update failed', icon: 'none' }))
      .finally(() => {
        wx.hideLoading();
        this.setData({ busy: false });
      });
  },
  openMember(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/user/index?id=${id}` });
  },
  openCreator() {
    const creator = this.data.creator;
    if (creator && creator.userId) wx.navigateTo({ url: `/pages/user/index?id=${creator.userId}` });
  },
  edit() {
    wx.navigateTo({ url: `/pages/activity-create/index?id=${this.data.activity.id}` });
  },
  cancelActivity() {
    wx.showModal({
      title: 'Cancel this activity?',
      content: 'Everyone who signed up will be notified.',
      confirmText: 'Cancel activity',
      confirmColor: '#c0332e',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.cancelActivity(this.data.activity.id)
          .then(() => {
            wx.showToast({ title: 'Activity cancelled' });
            setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/discover/index' }) }), 500);
          })
          .catch((error) => wx.showToast({ title: error.message || 'Cancel failed', icon: 'none' }));
      },
    });
  },
});
