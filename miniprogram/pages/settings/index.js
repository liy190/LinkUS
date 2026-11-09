const api = require('../../services/api');
const store = require('../../services/store');

const DM_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'followers', label: 'People I follow' },
  { value: 'mutual', label: 'Mutual follows only' },
];

Page({
  data: {
    settings: {},
    dmLabel: 'Everyone',
    version: '1.0.0',
    cacheSize: '',
  },
  onShow() {
    const settings = api.getSettings();
    const dm = DM_OPTIONS.find((item) => item.value === settings.dmPrivacy) || DM_OPTIONS[0];
    this.setData({ settings, dmLabel: dm.label, cacheSize: this.describeCache() });
  },
  describeCache() {
    try {
      const info = wx.getStorageInfoSync();
      return `${info.currentSize || 0} KB / ${info.limitSize || 0} KB`;
    } catch (error) {
      console.warn('storage info failed', error);
      return 'unknown';
    }
  },
  // 设置先在本地生效，再同步云端；同步失败就把本地改回去并提示
  persist(patch, onSuccess, onFailure) {
    const before = store.getSettings();
    api.saveSettings(patch)
      .then((next) => {
        this.setData({ settings: next });
        if (onSuccess) onSuccess(next);
      })
      .catch((error) => {
        store.saveSettings(before);
        this.setData({ settings: store.getSettings() });
        wx.showToast({ title: error.message || 'Sync failed', icon: 'none' });
        if (onFailure) onFailure(error);
      });
  },
  toggle(e) {
    const key = e.currentTarget.dataset.key;
    this.persist({ [key]: e.detail.value });
  },
  pickDmPrivacy() {
    wx.showActionSheet({
      itemList: DM_OPTIONS.map((item) => item.label),
      success: ({ tapIndex }) => {
        const option = DM_OPTIONS[tapIndex];
        this.persist({ dmPrivacy: option.value }, () => this.setData({ dmLabel: option.label }));
      },
    });
  },
  clearCache() {
    wx.showModal({
      title: 'Clear local data?',
      content: 'Messages, moments and profile changes stored on this phone will be removed.',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.logout();
        this.setData({ cacheSize: this.describeCache() });
        wx.showToast({ title: 'Local data cleared' });
        setTimeout(() => wx.reLaunch({ url: '/pages/welcome/index' }), 600);
      },
    });
  },
  logout() {
    wx.showModal({
      title: 'Log out?',
      content: 'You can sign in again with WeChat at any time.',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.logout();
        wx.reLaunch({ url: '/pages/welcome/index' });
      },
    });
  },
  deleteAccount() {
    wx.showModal({
      title: 'Delete account?',
      content: 'Your profile will be removed and you will be signed out. This cannot be undone.',
      confirmText: 'Delete',
      confirmColor: '#c0332e',
      success: ({ confirm }) => {
        if (!confirm) return;
        api.deleteAccount().then(() => {
          wx.showToast({ title: 'Account deleted' });
          setTimeout(() => wx.reLaunch({ url: '/pages/welcome/index' }), 600);
        });
      },
    });
  },
  about() {
    wx.showModal({
      title: 'LinkUS',
      content: 'Campus social map for HKU. Local build — cloud sync is optional.',
      showCancel: false,
    });
  },
});
