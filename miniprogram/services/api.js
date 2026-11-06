const config = require('../config/index');
const mock = require('../data/mock');
const store = require('./store');
const time = require('../utils/time');

const AVATARS = {
  'avatar-1': '/images/avatars/saber.svg',
  'avatar-2': '/images/avatars/george.svg',
  'avatar-3': '/images/avatars/dan.svg',
  'avatar-4': '/images/avatars/cayla.svg',
};

const ERROR_MESSAGES = {
  NICKNAME_REQUIRED: 'Please enter a display name',
  INVALID_CHAT_TARGET: 'This user is not available',
  FORBIDDEN_CONVERSATION: 'You no longer have access to this conversation',
  EMPTY_MESSAGE: 'Message cannot be empty',
  MESSAGE_TOO_FAST: 'Please wait a moment before sending again',
  GROUP_NAME_REQUIRED: 'Please enter a group name',
  ACTIVITY_FIELDS_REQUIRED: 'Please complete the required activity fields',
  ACTIVITY_FULL: 'This activity is full',
  EMPTY_FEEDBACK: 'Please write some feedback first',
};

function avatarOf(item = {}) {
  return item.avatarFileId || item.avatar || AVATARS[item.avatarPosition] || AVATARS['avatar-1'];
}

function call(action, data = {}) {
  if (!wx.cloud || !config.cloudEnvId) return Promise.reject(new Error('CLOUD_NOT_CONFIGURED'));
  return wx.cloud.callFunction({ name: 'linkusApi', data: { action, ...data } }).then((response) => {
    const result = response.result || {};
    if (!result.ok) {
      const code = result.error || 'BACKEND_ERROR';
      const error = new Error(ERROR_MESSAGES[code] || code);
      error.code = code;
      error.backendResponse = true;
      throw error;
    }
    return result;
  });
}

function withFallback(promise, fallback) {
  return promise.catch((error) => {
    console.warn('LinkUS backend fallback:', error.message || error);
    if (!config.allowMockFallback) throw error;
    if (error.backendResponse && !/collection|database|not.exist|setup/i.test(`${error.code || ''} ${error.message || ''}`)) throw error;
    return typeof fallback === 'function' ? fallback() : fallback;
  });
}

function normalizeUser(user) {
  return {
    id: user.userId || user.id,
    userId: user.userId || user.id,
    nickname: user.nickname || 'LinkUS user',
    handle: user.handle || `@${String(user.userId || 'linkus').slice(-8)}`,
    avatar: avatarOf(user),
    avatarFileId: user.avatarFileId || '',
    avatarPosition: user.avatarPosition || 'avatar-1',
    faculty: user.faculty || '',
    bio: user.bio || '',
    interests: user.interests || [],
    profileComplete: Boolean(user.profileComplete),
    verified: Boolean(user.verified),
  };
}

function bootstrap() {
  return withFallback(call('bootstrap').then((result) => {
    const user = normalizeUser(result.user);
    store.saveProfile(user);
    return { configured: true, user };
  }), () => ({ configured: false, user: store.getProfile() }));
}

function updateProfile(profile) {
  return withFallback(call('updateProfile', { profile }).then((result) => {
    const user = normalizeUser(result.user);
    store.saveProfile(user);
    return user;
  }), () => store.saveProfile({ ...profile, profileComplete: true }));
}

function uploadAvatar(filePath) {
  const profile = store.getProfile();
  const suffix = /\.png$/i.test(filePath) ? 'png' : 'jpg';
  const cloudPath = `avatars/${profile.id || 'new-user'}/${Date.now()}.${suffix}`;
  return wx.cloud.uploadFile({ cloudPath, filePath }).then((result) => result.fileID);
}

function listUsers() {
  const demoUsers = () => mock.people.map((person) => ({ ...person, userId: person.id }));
  return withFallback(call('listUsers').then((result) => {
    const users = result.users.map(normalizeUser);
    return users.length ? users : demoUsers();
  }), demoUsers);
}

function normalizeConversation(item) {
  return { ...item, avatar: avatarOf(item), unread: Number(item.unread || 0) };
}

function listConversations() {
  return withFallback(call('listConversations').then((result) => {
    const conversations = result.conversations.map(normalizeConversation);
    return conversations.length ? conversations : mock.conversations;
  }), () => mock.conversations);
}

function createDirectConversation(targetUserId) {
  const demoPerson = mock.people.find((item) => item.id === targetUserId);
  if (demoPerson) {
    return Promise.resolve({ id: demoPerson.conversationId || `dm-${demoPerson.id}`, type: 'direct', title: demoPerson.name, avatar: demoPerson.avatar, preview: '', unread: 0 });
  }
  return withFallback(call('createDirectConversation', { targetUserId }).then((result) => normalizeConversation(result.conversation)), () => {
    const person = mock.people.find((item) => item.id === targetUserId) || mock.people[0];
    return { id: person.conversationId || `dm-${person.id}`, type: 'direct', title: person.name, avatar: person.avatar, preview: '', unread: 0 };
  });
}

function getOrCreatePlaceConversation(placeId, title) {
  return withFallback(call('getOrCreatePlaceConversation', { placeId, title }).then((result) => normalizeConversation(result.conversation)), () => ({ id: 'place-library', type: 'place', title, avatar: AVATARS['avatar-4'], preview: '', unread: 0 }));
}

function normalizeMessage(item, profile) {
  const mine = item.senderId ? item.senderId === profile.id : item.from === 'me';
  return {
    ...item,
    id: item._id || item.id,
    from: mine ? 'me' : 'them',
    author: mine ? '' : (item.senderName || item.author || ''),
    avatar: item.senderAvatarFileId || AVATARS[item.senderAvatarPosition] || item.avatar || AVATARS['avatar-2'],
    time: item.createdAt ? time.formatTime(item.createdAt) : item.time,
  };
}

function getMessages(conversationId) {
  const profile = store.getProfile();
  const demoMessages = () => {
    const all = store.getMessages();
    return (all[conversationId] || []).map((item) => normalizeMessage(item, profile));
  };
  return call('getMessages', { conversationId })
    .then((result) => {
      const messages = result.messages.map((item) => normalizeMessage(item, profile));
      return messages.length ? messages : demoMessages();
    })
    .catch((error) => {
      if (config.allowMockFallback && mock.messages[conversationId]) return demoMessages();
      return withFallback(Promise.reject(error), demoMessages);
    });
}

function sendMessage(conversationId, text, clientId) {
  const saveDemoMessage = () => {
    const all = store.getMessages();
    const message = { id: clientId, from: 'me', text, time: time.formatTime(Date.now()), createdAt: Date.now() };
    all[conversationId] = [...(all[conversationId] || []), message];
    store.saveMessages(all);
    return message;
  };
  if (mock.conversations.some((item) => item.id === conversationId)) return Promise.resolve(saveDemoMessage());
  return withFallback(call('sendMessage', { conversationId, text, clientId }).then((result) => normalizeMessage(result.message, store.getProfile())), saveDemoMessage);
}

function watchMessages(conversationId, onChange, onError) {
  // Message documents contain server-only membership identifiers. Keep direct
  // database reads disabled and use the page's short secure polling fallback.
  return null;
}

function listGroups() {
  return withFallback(call('listGroups').then((result) => result.groups.length ? result.groups : store.getGroups()), () => store.getGroups());
}
function createGroup(group) { return withFallback(call('createGroup', { group }).then((result) => result.group), () => { const item = { ...group, id: `g-${Date.now()}`, avatar: group.avatar || '👥', members: 1, joined: true, conversationId: `group-${Date.now()}` }; store.saveGroups([item, ...store.getGroups()]); return item; }); }
function joinGroup(groupId) { return withFallback(call('joinGroup', { groupId }).then((result) => result.group), () => { let item; const groups = store.getGroups().map((group) => { if (group.id !== groupId) return group; item = { ...group, joined: true, members: group.members + (group.joined ? 0 : 1) }; return item; }); store.saveGroups(groups); return item; }); }
function leaveGroup(groupId) { return withFallback(call('leaveGroup', { groupId }).then((result) => result.group), () => { let item; const groups = store.getGroups().map((group) => { if (group.id !== groupId) return group; item = { ...group, joined: false, members: Math.max(0, group.members - (group.joined ? 1 : 0)) }; return item; }); store.saveGroups(groups); return item; }); }

function listActivities() {
  return withFallback(call('listActivities').then((result) => result.activities.length ? result.activities : store.getActivities()), () => store.getActivities());
}
function createActivity(activity) { return withFallback(call('createActivity', { activity }).then((result) => result.activity), () => { const item = { ...activity, id: `a-${Date.now()}`, emoji: activity.emoji || '📅', seats: Math.max(1, Number(activity.capacity || 6) - 1), joined: true }; store.saveActivities([item, ...store.getActivities()]); return item; }); }
function joinActivity(activityId) { return withFallback(call('joinActivity', { activityId }).then((result) => result.activity), () => { let item; const list = store.getActivities().map((activity) => { if (activity.id !== activityId) return activity; item = { ...activity, joined: true, seats: Math.max(0, activity.seats - (activity.joined ? 0 : 1)) }; return item; }); store.saveActivities(list); return item; }); }
function leaveActivity(activityId) { return withFallback(call('leaveActivity', { activityId }).then((result) => result.activity), () => { let item; const list = store.getActivities().map((activity) => { if (activity.id !== activityId) return activity; item = { ...activity, joined: false, seats: activity.seats + (activity.joined ? 1 : 0) }; return item; }); store.saveActivities(list); return item; }); }

function listNotifications() {
  return withFallback(call('listNotifications').then((result) => result.notifications.length ? result.notifications : store.getNotifications()), () => store.getNotifications());
}
function markNotification(notificationId) { return withFallback(call('markNotification', { notificationId }), { ok: true }); }
function markAllNotifications() { return withFallback(call('markAllNotifications'), { ok: true }); }
function addFeedback(item) { return withFallback(call('addFeedback', item), () => store.addFeedback(item)); }

module.exports = {
  avatarOf,
  bootstrap,
  updateProfile,
  uploadAvatar,
  listUsers,
  listConversations,
  createDirectConversation,
  getOrCreatePlaceConversation,
  getMessages,
  sendMessage,
  watchMessages,
  listGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  listActivities,
  createActivity,
  joinActivity,
  leaveActivity,
  listNotifications,
  markNotification,
  markAllNotifications,
  addFeedback,
};
