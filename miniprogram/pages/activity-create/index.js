const api = require('../../services/api');
Page({
  data: { title: '', place: '', time: '', description: '', capacity: 6, saving: false },
  onLoad(options) { this.setData({ place: decodeURIComponent(options.place || '') }); },
  change(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  submit() {
    if (!this.data.title || !this.data.place || !this.data.time) { wx.showToast({ title: 'Complete required fields', icon: 'none' }); return; }
    this.setData({ saving: true });
    api.createActivity({ title: this.data.title, place: this.data.place, time: this.data.time, description: this.data.description, capacity: Number(this.data.capacity) || 6, emoji: '📅' })
      .then(() => { wx.showToast({ title: 'Created' }); setTimeout(() => wx.navigateBack(), 400); })
      .catch((error) => wx.showToast({ title: error.message || 'Create failed', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },
});
