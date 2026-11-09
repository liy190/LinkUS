const api = require('../../services/api');

Page({
  data: { title: '', place: '', time: '', description: '', capacity: 6, saving: false, editing: false },
  onLoad(options) {
    if (options && options.id) {
      this.editingId = options.id;
      this.setData({ editing: true });
      wx.setNavigationBarTitle({ title: 'Edit activity' });
      api.getActivity(options.id).then((activity) => {
        if (!activity) return;
        this.setData({
          title: activity.title || '',
          place: activity.place || '',
          time: activity.time || '',
          description: activity.description || '',
          capacity: activity.capacity || 6,
        });
      }).catch((error) => console.warn('load activity for edit failed', error));
      return;
    }
    this.setData({ place: decodeURIComponent((options && options.place) || '') });
  },
  change(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  submit() {
    const { title, place, time, description, capacity } = this.data;
    if (!title || !place || !time) {
      wx.showToast({ title: 'Complete required fields', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    const payload = {
      title,
      place,
      time,
      description,
      capacity: Number(capacity) || 6,
      emoji: '📅',
    };
    const action = this.editingId
      ? api.updateActivity(this.editingId, payload)
      : api.createActivity(payload);
    action
      .then(() => {
        wx.showToast({ title: this.editingId ? 'Updated' : 'Created' });
        setTimeout(() => wx.navigateBack(), 400);
      })
      .catch((error) => wx.showToast({ title: error.message || 'Save failed', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },
});
