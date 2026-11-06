Component({
  properties: { showAdd: { type: Boolean, value: true } },
  data: {
    headerHeight: 88,
    topPadding: 44,
    rightPadding: 12,
  },
  lifetimes: {
    attached() {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
      const statusBarHeight = Number(windowInfo.statusBarHeight || 20);
      const menuGap = menu && menu.top ? Math.max(4, menu.top - statusBarHeight) : 6;
      const navigationHeight = menu && menu.height
        ? Math.max(44, menu.height + menuGap * 2)
        : 44;
      this.setData({
        headerHeight: statusBarHeight + navigationHeight,
        topPadding: statusBarHeight + menuGap,
        rightPadding: menu && menu.left
          ? Math.max(12, Number(windowInfo.windowWidth || 375) - menu.left + 8)
          : 12,
      });
    },
  },
  methods: {
    profile() { wx.navigateTo({ url: '/pages/profile/index' }); },
    map() { wx.switchTab({ url: '/pages/map/index' }); },
    add() { this.triggerEvent('add'); },
  },
});
