const store = require('../../services/store');
const api = require('../../services/api');

Page({
  data: { profile: {}, privacy: {}, stats: { following: 0, followers: 0 }, uploading: false },
  onShow() {
    this.setData({ profile: store.getProfile(), privacy: store.getPrivacy() });
    api.bootstrap()
      .then(({ user }) => this.setData({ profile: user }))
      .catch((error) => { console.warn('bootstrap failed', error); wx.showToast({ title: error.message || 'Unable to load profile', icon: 'none' }); });
    api.followStats()
      .then((stats) => this.setData({ stats }))
      .catch((error) => console.warn('followStats failed', error.message || error));
  },
  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/chats/index' }) }); },
  go(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  // 头像上的 ✎ 现在是"换头像"，和下面的 Edit profile 区分开
  chooseAvatar() {
    if (this.data.uploading) return;
    wx.showActionSheet({
      itemList: ['Choose a new photo'],
      success: () => wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        success: ({ tempFiles }) => {
          const filePath = tempFiles && tempFiles[0] && tempFiles[0].tempFilePath;
          if (!filePath) return;
          this.setData({ uploading: true });
          api.uploadAvatar(filePath)
            .then((avatarFileId) => api.updateProfile({ ...this.data.profile, avatarFileId }))
            .then((user) => {
              this.setData({ profile: user });
              wx.showToast({ title: 'Avatar updated' });
            })
            .catch((error) => wx.showToast({ title: error.message || 'Avatar update needs the cloud', icon: 'none' }))
            .finally(() => this.setData({ uploading: false }));
        },
      }),
    });
  },
});
