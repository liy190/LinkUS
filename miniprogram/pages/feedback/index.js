const api = require('../../services/api');
Page({
  data: { text: '', type: 'Suggestion', sending: false },
  change(e) { this.setData({ text: e.detail.value }); },
  submit() {
    const text = this.data.text.trim();
    if (!text || this.data.sending) return;
    this.setData({ sending: true });
    api.addFeedback({ text, type: this.data.type, createdAt: Date.now() }).then(() => { wx.showToast({ title: 'Thank you!' }); this.setData({ text: '' }); })
      .catch((error) => wx.showToast({ title: error.message || 'Send failed', icon: 'none' }))
      .finally(() => this.setData({ sending: false }));
  },
});
