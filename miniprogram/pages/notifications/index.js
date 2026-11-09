const api = require('../../services/api');

Page({
  data: { list: [], visible: [], keyword: '', unreadCount: 0, loading: true },
  onShow() {
    this.load();
    if (this.getTabBar()) this.getTabBar().setData({ selected: 4, hidden: false });
  },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  load() {
    this.setData({ loading: true });
    return api.listNotifications()
      .then((list) => {
        this.setData({ list: list.map((item, index) => ({ ...item, iconKind: index % 4 })) });
        this.applyFilter();
      })
      .catch((error) => {
        console.warn('listNotifications failed', error);
        wx.showToast({ title: 'Unable to load notifications', icon: 'none' });
      })
      .finally(() => this.setData({ loading: false }));
  },
  applyFilter() {
    const keyword = String(this.data.keyword || '').trim().toLowerCase();
    const visible = keyword
      ? this.data.list.filter((item) => `${item.title} ${item.body || ''}`.toLowerCase().indexOf(keyword) >= 0)
      : this.data.list;
    const unreadCount = this.data.list.filter((item) => item.unread).length;
    this.setData({ visible, unreadCount });
  },
  search(e) { this.setData({ keyword: e.detail.value }); this.applyFilter(); },
  clearSearch() { this.setData({ keyword: '' }); this.applyFilter(); },
  open(e) {
    const item = this.data.list.find((notice) => notice.id === e.currentTarget.dataset.id);
    if (!item) return;
    if (item.unread) api.markNotification(item.id).then(() => this.load()).catch((error) => console.warn('markNotification failed', error));
    if (item.target) wx.navigateTo({ url: item.target });
  },
  readAll() {
    api.markAllNotifications()
      .then(() => this.load())
      .catch((error) => console.warn('markAllNotifications failed', error));
  },
});
