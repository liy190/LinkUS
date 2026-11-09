const mock = require('../data/mock');

// 只保存"用户自己的偏好"和"当前登录用户的缓存"。
// 业务数据（动态、关注、消息、活动…）一律以云端为准，不在本地做副本。
const KEYS = {
  profile: 'linkus.profile',
  privacy: 'linkus.privacy',
  settings: 'linkus.settings',
};

function read(key, fallback) {
  const value = wx.getStorageSync(key);
  return value && typeof value === 'object' ? value : fallback;
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

// 登录后才有内容；未登录返回空对象，不再用演示用户冒充
function getProfile() { return read(KEYS.profile, {}); }
function saveProfile(patch) { return write(KEYS.profile, { ...getProfile(), ...patch }); }

function getPrivacy() { return read(KEYS.privacy, mock.privacy); }
function savePrivacy(patch) { return write(KEYS.privacy, { ...getPrivacy(), ...patch }); }

function getSettings() { return read(KEYS.settings, mock.settings); }
function saveSettings(patch) { return write(KEYS.settings, { ...getSettings(), ...patch }); }

function clearUserData() {
  Object.values(KEYS).forEach((key) => {
    try { wx.removeStorageSync(key); } catch (error) { console.warn('clear storage failed', key, error); }
  });
}

module.exports = {
  KEYS,
  getProfile,
  saveProfile,
  getPrivacy,
  savePrivacy,
  getSettings,
  saveSettings,
  clearUserData,
};
