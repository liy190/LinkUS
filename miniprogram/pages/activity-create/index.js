const store = require('../../services/store');
Page({
  data: { title: '', place: '', time: '', description: '' },
  onLoad(options) { this.setData({ place: decodeURIComponent(options.place || '') }); },
  change(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },
  submit() { if (!this.data.title || !this.data.place || !this.data.time) { wx.showToast({ title: 'Complete required fields', icon: 'none' }); return; } const item = { ...this.data, id: `a-${Date.now()}`, emoji: '🎯', seats: 5, joined: true }; store.saveActivities([item, ...store.getActivities()]); wx.showToast({ title: 'Created' }); setTimeout(() => wx.navigateBack(), 500); },
});
