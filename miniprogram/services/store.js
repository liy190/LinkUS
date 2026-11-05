const mock = require('../data/mock');

const KEYS = {
  profile: 'linkus.profile',
  privacy: 'linkus.privacy',
  messages: 'linkus.messages',
  groups: 'linkus.groups',
  activities: 'linkus.activities',
  notifications: 'linkus.notifications',
  feedback: 'linkus.feedback',
};

function read(key, fallback) {
  const value = wx.getStorageSync(key);
  return value && typeof value === 'object' ? value : fallback;
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function getProfile() { return read(KEYS.profile, mock.currentUser); }
function saveProfile(patch) { return write(KEYS.profile, { ...getProfile(), ...patch }); }
function getPrivacy() { return read(KEYS.privacy, mock.privacy); }
function savePrivacy(patch) { return write(KEYS.privacy, { ...getPrivacy(), ...patch }); }
function getMessages() { return read(KEYS.messages, mock.messages); }
function saveMessages(value) { return write(KEYS.messages, value); }
function getGroups() { return read(KEYS.groups, mock.groups); }
function saveGroups(value) { return write(KEYS.groups, value); }
function getActivities() { return read(KEYS.activities, mock.activities); }
function saveActivities(value) { return write(KEYS.activities, value); }
function getNotifications() { return read(KEYS.notifications, mock.notifications); }
function saveNotifications(value) { return write(KEYS.notifications, value); }
function addFeedback(item) {
  const list = read(KEYS.feedback, []);
  return write(KEYS.feedback, [{ ...item, id: `feedback-${Date.now()}` }, ...list]);
}

module.exports = {
  getProfile,
  saveProfile,
  getPrivacy,
  savePrivacy,
  getMessages,
  saveMessages,
  getGroups,
  saveGroups,
  getActivities,
  saveActivities,
  getNotifications,
  saveNotifications,
  addFeedback,
};
