const api = require('../../services/api');
const store = require('../../services/store');

Page({
  data: { form: {}, saving: false, avatarPreview: '' },
  onLoad(options) {
    this.onboarding = options.onboarding === '1';
    const form = store.getProfile();
    this.setData({ form, avatarPreview: form.avatar });
  },
  change(e) { this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  chooseAvatar(e) {
    const avatarPreview = e.detail.avatarUrl;
    this.avatarTempPath = avatarPreview;
    this.setData({ avatarPreview });
  },
  save() {
    if (this.data.saving) return;
    const form = this.data.form;
    if (!String(form.nickname || '').trim()) {
      wx.showToast({ title: 'Please enter a display name', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    const upload = this.avatarTempPath ? api.uploadAvatar(this.avatarTempPath) : Promise.resolve(form.avatarFileId || '');
    upload.then((avatarFileId) => api.updateProfile({ ...form, avatarFileId })).then(() => {
      wx.showToast({ title: 'Profile saved' });
      setTimeout(() => {
        if (this.onboarding) wx.switchTab({ url: '/pages/map/index' });
        else wx.navigateBack();
      }, 350);
    }).catch((error) => wx.showToast({ title: error.message || 'Save failed', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },
});
