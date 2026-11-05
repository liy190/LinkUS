const mock = require('../../data/mock');
Page({
  data: { list: [] },
  onShow() { this.setData({ list: mock.conversations }); },
  open(e) { const { id, title } = e.currentTarget.dataset; wx.navigateTo({ url: `/pages/chat/index?id=${id}&title=${encodeURIComponent(title)}` }); },
});
