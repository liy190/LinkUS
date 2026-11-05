const store = require('../../services/store');
Page({ data: { text: '', type: 'Suggestion' }, change(e) { this.setData({ text: e.detail.value }); }, submit() { if (!this.data.text.trim()) return; store.addFeedback({ text: this.data.text, type: this.data.type, createdAt: Date.now() }); wx.showToast({ title: 'Thank you!' }); this.setData({ text: '' }); } });
