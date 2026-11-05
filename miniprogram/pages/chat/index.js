const store = require('../../services/store');
const time = require('../../utils/time');

Page({
  data: { id: '', title: '', list: [], text: '' },
  onLoad(options) {
    const id = options.id || 'dm-george';
    const title = decodeURIComponent(options.title || 'George');
    this.setData({ id, title });
    wx.setNavigationBarTitle({ title });
    this.load();
  },
  load() { const all = store.getMessages(); this.setData({ list: all[this.data.id] || [] }); },
  type(e) { this.setData({ text: e.detail.value }); },
  send() {
    const text = this.data.text.trim(); if (!text) return;
    const all = store.getMessages();
    const item = { id: `m-${Date.now()}`, from: 'me', text, time: time.formatTime(new Date()) };
    all[this.data.id] = [...(all[this.data.id] || []), item];
    store.saveMessages(all); this.setData({ list: all[this.data.id], text: '' });
  },
});
