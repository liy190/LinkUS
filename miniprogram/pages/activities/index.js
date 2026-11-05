const store = require('../../services/store');
Page({ data: { list: [] }, onShow() { this.setData({ list: store.getActivities() }); }, open(e) { wx.navigateTo({ url: `/pages/activity-detail/index?id=${e.currentTarget.dataset.id}` }); }, create() { wx.navigateTo({ url: '/pages/activity-create/index' }); } });
