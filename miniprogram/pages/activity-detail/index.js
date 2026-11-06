const api = require('../../services/api');
Page({
  data: { activity: {}, loading: true },
  onLoad(options) { this.id = options.id; this.load(); },
  load() { return api.listActivities().then((list) => { const activity = list.find((item) => item.id === this.id) || list[0]; if (!activity) return; this.setData({ activity }); wx.setNavigationBarTitle({ title: activity.title }); }).finally(() => this.setData({ loading: false })); },
  join() {
    const activity = this.data.activity;
    const action = activity.joined ? api.leaveActivity(activity.id) : api.joinActivity(activity.id);
    wx.showLoading({ title: activity.joined ? 'Leaving' : 'Joining' });
    action.then((updated) => this.setData({ activity: updated })).catch((error) => wx.showToast({ title: error.message || 'Update failed', icon: 'none' })).finally(() => wx.hideLoading());
  },
});
