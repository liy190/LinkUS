const api = require('../../services/api');
const store = require('../../services/store');

const INTEREST_OPTIONS = [
  'Design', 'Badminton', 'Coffee', 'Study buddy', 'Music',
  'Sports', 'Gaming', 'Reading', 'Travel', 'Food',
];

Page({
  data: {
    form: {},
    saving: false,
    avatarPreview: '',
    interests: [],
    interestOptions: INTEREST_OPTIONS,
    handleInput: '',
    handleError: '',
  },
  onLoad(options) {
    this.onboarding = options.onboarding === '1';
    const form = store.getProfile();
    this.setData({
      form,
      avatarPreview: form.avatar,
      interests: Array.isArray(form.interests) ? form.interests.slice() : [],
      handleInput: String(form.handle || '').replace(/^@/, ''),
    });
  },
  change(e) { this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value }); },
  onHandleInput(e) {
    const handleInput = e.detail.value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
    const checked = api.checkHandle(handleInput);
    this.setData({ handleInput, handleError: checked.ok ? '' : (handleInput ? 'Use 3-20 letters, numbers or _' : '') });
  },
  chooseAvatar(e) {
    const avatarPreview = e.detail.avatarUrl;
    this.avatarTempPath = avatarPreview;
    this.setData({ avatarPreview });
  },
  toggleInterest(e) {
    const value = e.currentTarget.dataset.value;
    const interests = this.data.interests.slice();
    const index = interests.indexOf(value);
    if (index >= 0) interests.splice(index, 1);
    else interests.push(value);
    this.setData({ interests });
  },
  cancel() {
    if (this.onboarding) wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/login/index' }) });
    else wx.navigateBack();
  },
  save() {
    if (this.data.saving) return;
    const form = this.data.form;
    if (!String(form.nickname || '').trim()) {
      wx.showToast({ title: 'Please enter a display name', icon: 'none' });
      return;
    }
    const handle = String(this.data.handleInput || '').trim();
    if (handle) {
      const checked = api.checkHandle(handle);
      if (!checked.ok) {
        wx.showToast({ title: 'Handle must be 3-20 letters, numbers or _', icon: 'none' });
        return;
      }
    }
    this.setData({ saving: true });
    const upload = this.avatarTempPath
      ? api.uploadAvatar(this.avatarTempPath).catch((error) => {
        console.warn('avatar upload failed', error);
        return form.avatarFileId || '';
      })
      : Promise.resolve(form.avatarFileId || '');
    upload
      .then((avatarFileId) => api.updateProfile({
        ...form,
        avatarFileId,
        interests: this.data.interests,
        handle: handle ? api.checkHandle(handle).value : form.handle,
      }))
      .then(() => {
        wx.showToast({ title: 'Profile saved' });
        setTimeout(() => {
          if (this.onboarding) wx.switchTab({ url: '/pages/map/index' });
          else wx.navigateBack();
        }, 350);
      })
      .catch((error) => wx.showToast({ title: error.message || 'Save failed', icon: 'none' }))
      .finally(() => this.setData({ saving: false }));
  },
});
