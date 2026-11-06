const api = require('../../services/api');

Page({
  data: { loading: false, error: '' },
  continue() {
    if (this.data.loading) return;
    this.setData({ loading: true, error: '' });
    api.bootstrap().then(({ user }) => {
      if (user.profileComplete) wx.switchTab({ url: '/pages/map/index' });
      else wx.redirectTo({ url: '/pages/profile-edit/index?onboarding=1' });
    }).catch((error) => {
      this.setData({ error: error.message || 'Unable to sign in' });
      wx.showToast({ title: 'Cloud backend is not ready', icon: 'none' });
    }).finally(() => this.setData({ loading: false }));
  },
});
