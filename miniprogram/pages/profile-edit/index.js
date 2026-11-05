const store = require('../../services/store');
Page({
  data: { form: {} },
  onLoad() { this.setData({ form: store.getProfile() }); },
  change(e) { this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  save() { store.saveProfile(this.data.form); wx.showToast({ title: 'Saved' }); setTimeout(() => wx.navigateBack(), 500); },
});
