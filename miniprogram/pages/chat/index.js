const api = require('../../services/api');
const store = require('../../services/store');

Page({
  data: {
    id: '',
    title: '',
    avatar: '/images/avatars/george.svg',
    currentAvatar: '/images/avatars/saber.svg',
    list: [],
    text: '',
    sending: false,
    attachmentsOpen: false,
    navHeight: 88,
    navTopPadding: 44,
  },
  onLoad(options) {
    const id = options.id || 'dm-george';
    const title = decodeURIComponent(options.title || 'Conversation');
    const avatar = options.avatar ? decodeURIComponent(options.avatar) : '/images/avatars/george.svg';
    const profile = store.getProfile();
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    const statusBarHeight = Number(windowInfo.statusBarHeight || 20);
    const menuGap = menu && menu.top ? Math.max(4, menu.top - statusBarHeight) : 6;
    const navigationHeight = menu && menu.height ? Math.max(44, menu.height + menuGap * 2) : 44;
    this.setData({
      id,
      title,
      avatar,
      currentAvatar: profile.avatarFileId || profile.avatar || '/images/avatars/saber.svg',
      navHeight: statusBarHeight + navigationHeight,
      navTopPadding: statusBarHeight + menuGap,
    });
    wx.setNavigationBarTitle({ title });
    this.load();
    this.startRealtime();
  },
  onUnload() { this.stopRealtime(); },
  onHide() { this.stopRealtime(); },
  onShow() { if (this.data.id && !this.watcher && !this.pollTimer) this.startRealtime(); },
  load() {
    return api.getMessages(this.data.id).then((list) => this.setData({ list })).catch(() => wx.showToast({ title: 'Unable to load messages', icon: 'none' }));
  },
  startRealtime() {
    this.watcher = api.watchMessages(this.data.id, (list) => this.setData({ list }), () => this.startPolling());
    if (!this.watcher) this.startPolling();
  },
  startPolling() {
    if (this.pollTimer) return;
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
    this.pollTimer = setInterval(() => this.load(), 3000);
  },
  stopRealtime() {
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  },
  type(e) { this.setData({ text: e.detail.value }); },
  send() {
    const text = this.data.text.trim();
    if (!text || this.data.sending) return;
    const clientId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.setData({ text: '', sending: true });
    api.sendMessage(this.data.id, text, clientId).then(() => this.load()).catch((error) => {
      this.setData({ text });
      wx.showToast({ title: error.message || 'Send failed', icon: 'none' });
    }).finally(() => this.setData({ sending: false }));
  },
  toggleAttachments() { this.setData({ attachmentsOpen: !this.data.attachmentsOpen }); },
  action(e) {
    this.setData({ attachmentsOpen: false });
    wx.showToast({ title: `${e.currentTarget.dataset.name} coming next`, icon: 'none' });
  },
  back() { wx.navigateBack(); },
});
