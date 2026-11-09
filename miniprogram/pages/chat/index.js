const api = require('../../services/api');
const store = require('../../services/store');
const time = require('../../utils/time');

Page({
  data: {
    id: '',
    title: '',
    avatar: '/images/avatars/george.svg',
    currentAvatar: '/images/avatars/saber.svg',
    list: [],
    hasMore: false,
    limit: 20,
    dateLabel: '',
    loading: true,
    partnerReadAt: 0,
    userId: '',
    text: '',
    sending: false,
    attachmentsOpen: false,
    navHeight: 88,
    navTopPadding: 44,
  },
  onLoad(options) {
    const id = options.id || 'dm-george';
    this.userId = options.uid ? decodeURIComponent(options.uid) : '';
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
      userId: this.userId,
      currentAvatar: profile.avatarFileId || profile.avatar || '/images/avatars/saber.svg',
      navHeight: statusBarHeight + navigationHeight,
      navTopPadding: statusBarHeight + menuGap,
      dateLabel: time.formatChatDate(Date.now()),
    });
    wx.setNavigationBarTitle({ title });
    this.load();
    this.startRealtime();
  },
  onUnload() { this.stopRealtime(); },
  onHide() { this.stopRealtime(); },
  onShow() { if (this.data.id && !this.watcher && !this.pollTimer) this.startRealtime(); },
  load() {
    return Promise.all([
      api.getMessages(this.data.id),
      api.getReadState(this.data.id).catch(() => ({ partnerReadAt: 0 })),
    ])
      .then(([list, readState]) => {
        this.all = list;
        this.setData({ partnerReadAt: Number(readState.partnerReadAt || 0) });
        this.renderMessages();
      })
      .catch((error) => {
        console.warn('getMessages failed', error);
        wx.showToast({ title: error.message || 'Unable to load messages', icon: 'none' });
      });
  },
  // Only the newest `limit` messages are rendered; earlier ones load on demand so
  // a long history does not push the newest message off screen.
  renderMessages() {
    const all = this.all || [];
    const limit = this.data.limit;
    const partnerReadAt = this.data.partnerReadAt;
    const list = all.slice(Math.max(0, all.length - limit)).map((item) => ({
      ...item,
      // 只有对方读过（lastReadAt >= 消息时间）才显示双勾，本地模式恒为单勾
      read: item.from === 'me' && Boolean(partnerReadAt) && Number(item.createdAt || 0) <= partnerReadAt,
    }));
    this.setData({
      list,
      hasMore: all.length > limit,
      loading: false,
      dateLabel: time.formatChatDate(all.length && all[0].createdAt ? all[0].createdAt : Date.now()),
    });
  },
  loadEarlier() {
    if (!this.data.hasMore) return;
    this.setData({ limit: this.data.limit + 20 }, () => this.renderMessages());
  },
  startRealtime() {
    this.watcher = api.watchMessages(this.data.id, (list) => {
      this.all = list;
      this.renderMessages();
    }, () => this.startPolling());
    if (!this.watcher) this.startPolling();
  },
  startPolling() {
    if (this.pollTimer) return;
    if (this.watcher) { this.watcher.close(); this.watcher = null; }
    this.pollTimer = setInterval(() => this.load(), 1500);
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
    wx.showToast({ title: `${e.currentTarget.dataset.name} is not available in the local build`, icon: 'none' });
  },
  // 长按自己的消息：2 分钟内可撤回；任何消息都可举报
  longPress(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.all || []).find((message) => message.id === id);
    if (!item) return;
    const canRecall = item.from === 'me' && !item.recalled && Date.now() - Number(item.createdAt || 0) <= 2 * 60 * 1000;
    const options = canRecall ? ['Recall message', 'Report message'] : ['Report message'];
    wx.showActionSheet({
      itemList: options,
      success: ({ tapIndex }) => {
        const picked = options[tapIndex];
        if (picked === 'Recall message') {
          api.recallMessage(this.data.id, id)
            .then(() => wx.showToast({ title: 'Message recalled' }))
            .catch((error) => wx.showToast({ title: error.message || 'Recall failed', icon: 'none' }))
            .finally(() => this.load());
          return;
        }
        wx.showModal({
          title: 'Report this message?',
          content: 'Our team reviews reports before acting.',
          success: ({ confirm }) => {
            if (!confirm) return;
            api.report({ targetType: 'message', targetId: id, reason: 'Reported from chat' })
              .then(() => wx.showToast({ title: 'Report sent' }))
              .catch(() => wx.showToast({ title: 'Report failed', icon: 'none' }));
          },
        });
      },
    });
  },
  // 会话顶部的联系人区域 → 打开对方主页
  openContact() {
    if (!this.userId) {
      wx.showToast({ title: 'Profile is not available for this chat', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/user/index?id=${this.userId}&name=${encodeURIComponent(this.data.title || '')}&avatar=${encodeURIComponent(this.data.avatar || '')}`,
    });
  },
  back() { wx.navigateBack(); },
});
