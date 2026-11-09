const config = require('../config/index');
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
  HANDLE_FORMAT: 'Handle must be 3-20 letters, numbers or underscores',
  HANDLE_TAKEN: 'That handle is already taken',
  INVALID_CHAT_TARGET: 'This user is not available',
  FORBIDDEN_CONVERSATION: 'You no longer have access to this conversation',
  EMPTY_MESSAGE: 'Message cannot be empty',
  MESSAGE_TOO_FAST: 'Please wait a moment before sending again',
  GROUP_NAME_REQUIRED: 'Please enter a group name',
  ACTIVITY_FIELDS_REQUIRED: 'Please complete the required activity fields',
  ACTIVITY_FULL: 'This activity is full',
  EMPTY_FEEDBACK: 'Please write some feedback first',
  EMPTY_POST: 'Write something first',
  NOT_ALLOWED: 'You are not allowed to do that',
  MESSAGE_TOO_OLD: 'Only messages sent in the last 2 minutes can be recalled',
};

// 网络/环境层面的失败，统一换成能给用户看的一句话；不再静默降级到本地数据。
function makeError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.friendly = true;
  return error;
}

function toFriendlyError(error) {
  if (error && error.friendly) return error;
  const raw = `${(error && error.code) || ''} ${(error && error.message) || ''}`;
  if (/CLOUD_NOT_CONFIGURED|cloud.*not.*init|wx\.cloud/i.test(raw)) {
    return makeError('云开发未初始化：请检查 config/index.js 的 cloudEnvId', 'CLOUD_NOT_CONFIGURED');
  }
  if (/UNKNOWN_ACTION|NO_SUCH_ACTION|action not found/i.test(raw)) {
    return makeError('云函数版本过旧（缺少该接口），请重新部署 linkusApi', 'BACKEND_OUTDATED');
  }
  if (/INVALID_ENV|-501000|env.*not.*exist/i.test(raw)) {
    return makeError('云环境不存在或与 appid 不匹配', 'ENV_NOT_FOUND');
  }
  // -504003：云函数执行超过配置的超时时间（默认 3 秒，冷启动很容易超）
  if (/-504003|FUNCTIONS_TIME_LIMIT_EXCEEDED|timed out/i.test(raw)) {
    return makeError('云函数执行超时：请在云开发控制台把 linkusApi 的超时时间调到 20 秒', 'FUNCTION_TIMEOUT');
  }
  if (/collection.*not.*exist|DATABASE_COLLECTION_NOT_EXIST|-502005/i.test(raw)) {
    return makeError('数据库集合缺失，请先运行 setupLinkUS', 'COLLECTION_MISSING');
  }
  if (/timeout|ETIMEDOUT|request:fail|network|ERR_INTERNET/i.test(raw)) {
    return makeError('网络不稳定，请稍后重试', 'NETWORK');
  }
  if (ERROR_MESSAGES[error.code]) return makeError(ERROR_MESSAGES[error.code], error.code);
  return makeError((error && error.message) || '请求失败，请稍后重试', (error && error.code) || 'REQUEST_FAILED');
}

function avatarOf(item = {}) {
  return item.avatarFileId || item.avatar || AVATARS[item.avatarPosition] || AVATARS['avatar-1'];
}

// 唯一的云端出口。没有本地兜底：失败就抛错，由页面提示用户。
function call(action, data = {}) {
  if (!wx.cloud || !config.cloudEnvId) {
    return Promise.reject(toFriendlyError(makeError('CLOUD_NOT_CONFIGURED', 'CLOUD_NOT_CONFIGURED')));
  }
  return wx.cloud.callFunction({ name: 'linkusApi', data: { action, ...data } })
    .then((response) => {
      const result = (response && response.result) || {};
      if (!result.ok) {
        const code = result.error || 'BACKEND_ERROR';
        // 不带 friendly 标记，交给 toFriendlyError 统一翻译成可读信息
        const error = new Error(ERROR_MESSAGES[code] || code);
        error.code = code;
        throw error;
      }
      return result;
    })
    .catch((error) => { throw toFriendlyError(error); });
}

function me() {
  const profile = store.getProfile();
  return profile.userId || profile.id || '';
}

function normalizeUser(user) {
  if (!user) return null;
  const id = user.userId || user.id;
  return {
    id,
    userId: id,
    nickname: user.nickname || 'LinkUS user',
    handle: user.handle || '',
    avatar: avatarOf(user),
    avatarFileId: user.avatarFileId || '',
    avatarPosition: user.avatarPosition || 'avatar-1',
    faculty: user.faculty || '',
    bio: user.bio || '',
    interests: user.interests || [],
    profileComplete: Boolean(user.profileComplete),
    verified: Boolean(user.verified),
    following: Array.isArray(user.following) ? user.following : [],
  };
}

// ---------------------------------------------------------------- profile

function checkHandle(raw) {
  const value = String(raw || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) return { ok: false, error: 'HANDLE_FORMAT' };
  return { ok: true, value: `@${value.toLowerCase()}` };
}

// 冷启动时首次调用经常撞上 3 秒超时，重试一次通常就成功了。
// 只是重试同一个请求，不改变"失败就报错"的原则。
function bootstrap(attempt = 0) {
  return call('bootstrap')
    .then((result) => {
      const user = normalizeUser(result.user);
      store.saveProfile(user);
      return { configured: true, user };
    })
    .catch((error) => {
      if (error.code === 'FUNCTION_TIMEOUT' && attempt < 1) {
        console.warn('bootstrap 超时，重试一次（冷启动常见）');
        return bootstrap(attempt + 1);
      }
      throw error;
    });
}

function updateProfile(profile) {
  const payload = { ...profile };
  if (payload.handle) {
    const checked = checkHandle(payload.handle);
    if (!checked.ok) return Promise.reject(toFriendlyError(makeError('HANDLE_FORMAT', 'HANDLE_FORMAT')));
    payload.handle = checked.value;
  }
  return call('updateProfile', { profile: payload }).then((result) => {
    const user = normalizeUser(result.user);
    store.saveProfile(user);
    return user;
  });
}

function uploadAvatar(filePath) {
  const profile = store.getProfile();
  const suffix = /\.png$/i.test(filePath) ? 'png' : 'jpg';
  const cloudPath = `avatars/${profile.id || 'new-user'}/${Date.now()}.${suffix}`;
  if (!wx.cloud || !config.cloudEnvId) {
    return Promise.reject(toFriendlyError(makeError('CLOUD_NOT_CONFIGURED', 'CLOUD_NOT_CONFIGURED')));
  }
  return wx.cloud.uploadFile({ cloudPath, filePath })
    .then((result) => result.fileID)
    .catch((error) => { throw toFriendlyError(makeError((error && error.message) || 'Avatar upload failed', 'UPLOAD_FAILED')); });
}

function listUsers() {
  return call('listUsers').then((result) => result.users.map(normalizeUser));
}

function getUser(userId) {
  return call('getUser', { userId }).then((result) => normalizeUser(result.user));
}

// ---------------------------------------------------------------- follow

function followStats(userId) {
  const payload = userId ? { userId } : {};
  return call('getFollowStats', payload).then((r) => ({
    following: Number(r.following || 0),
    followers: Number(r.followers || 0),
    isFollowing: Boolean(r.isFollowing),
  }));
}

function listFollowing(userId) {
  return call('listFollowing', userId ? { userId } : {}).then((r) => r.users.map(normalizeUser));
}

function listFollowers(userId) {
  return call('listFollowers', userId ? { userId } : {}).then((r) => r.users.map(normalizeUser));
}

function follow(userId) {
  if (!userId) return Promise.reject(toFriendlyError(makeError('NOT_ALLOWED', 'NOT_ALLOWED')));
  return call('follow', { userId });
}

function unfollow(userId) {
  return call('unfollow', { userId });
}

// ---------------------------------------------------------------- posts

function normalizePost(item) {
  const likes = Array.isArray(item.likes) ? item.likes : [];
  const myId = me();
  return {
    ...item,
    id: item.id || item._id,
    avatar: item.avatar || AVATARS[item.avatarPosition] || AVATARS['avatar-1'],
    likeCount: item.likeCount !== undefined ? Number(item.likeCount) : likes.length,
    likedByMe: item.likedByMe !== undefined ? Boolean(item.likedByMe) : likes.indexOf(myId) >= 0,
    mine: (item.authorId || '') === myId,
    time: item.time || time.formatRelative(item.createdAt),
  };
}

function listPosts(scope = 'feed') {
  return call('listPosts', { scope }).then((r) => r.posts.map(normalizePost));
}

function createPost({ text, visibility = 'public', placeId = '', placeName = '' }) {
  const body = String(text || '').trim();
  if (!body) return Promise.reject(toFriendlyError(makeError('EMPTY_POST', 'EMPTY_POST')));
  return call('createPost', {
    text: body.slice(0, 500),
    visibility,
    placeId,
    placeName,
  }).then((r) => normalizePost(r.post));
}

function deletePost(postId) {
  return call('deletePost', { postId });
}

function togglePostLike(postId) {
  return call('likePost', { postId }).then((r) => normalizePost(r.post));
}

// ---------------------------------------------------------------- conversations

function normalizeConversation(item) {
  return {
    ...item,
    avatar: avatarOf(item),
    unread: Number(item.unread || 0),
    time: item.time || time.formatConversationTime(item.updatedAt || item.createdAt),
  };
}

function listConversations() {
  return call('listConversations').then((result) => result.conversations.map(normalizeConversation));
}

function markConversationRead(conversationId) {
  if (!conversationId) return Promise.reject(toFriendlyError(makeError('INVALID_CHAT_TARGET', 'INVALID_CHAT_TARGET')));
  return call('markConversationRead', { conversationId });
}

function createDirectConversation(targetUserId) {
  return call('createDirectConversation', { targetUserId }).then((result) => normalizeConversation(result.conversation));
}

function getOrCreatePlaceConversation(placeId, title) {
  return call('getOrCreatePlaceConversation', { placeId, title }).then((result) => normalizeConversation(result.conversation));
}

function normalizeMessage(item, profile) {
  const myId = profile.userId || profile.id;
  const mine = item.senderId ? item.senderId === myId : item.from === 'me';
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
  return call('getMessages', { conversationId })
    .then((result) => result.messages.map((item) => normalizeMessage(item, profile)));
}

// 已读回执：失败只影响双勾显示，不阻塞聊天
function getReadState(conversationId) {
  return call('getReadState', { conversationId })
    .then((r) => ({ partnerReadAt: Number(r.partnerReadAt || 0), readAt: Number(r.readAt || 0) }))
    .catch((error) => {
      console.warn('getReadState failed', error.message || error);
      return { partnerReadAt: 0, readAt: 0 };
    });
}

function sendMessage(conversationId, text, clientId) {
  return call('sendMessage', { conversationId, text, clientId })
    .then((result) => normalizeMessage(result.message, store.getProfile()));
}

function recallMessage(conversationId, messageId) {
  return call('recallMessage', { conversationId, messageId });
}

function watchMessages(conversationId, onChange, onError) {
  if (typeof onChange !== 'function') return null;
  let closed = false;
  let snapshot = '';
  let lastError = '';
  const tick = () => {
    if (closed) return;
    getMessages(conversationId).then((list) => {
      const serialized = JSON.stringify(list.map((item) => [item.id, item.text]));
      if (serialized === snapshot) return;
      snapshot = serialized;
      lastError = '';
      if (!closed) onChange(list);
    }).catch((error) => {
      const message = error.message || String(error);
      if (message === lastError) return;
      lastError = message;
      if (!closed && typeof onError === 'function') onError(error);
    });
  };
  const timer = setInterval(tick, 1500);
  tick();
  return {
    close() {
      closed = true;
      clearInterval(timer);
    },
  };
}

// ---------------------------------------------------------------- groups

function normalizeGroup(group) {
  const profile = store.getProfile();
  return {
    ...group,
    ownerName: group.ownerName || '',
    announcement: group.announcement || '',
    isOwner: Boolean(group.ownerId) && group.ownerId === (profile.userId || profile.id),
  };
}

function listGroups() {
  return call('listGroups').then((result) => result.groups.map(normalizeGroup));
}

function createGroup(group) {
  return call('createGroup', { group }).then((result) => normalizeGroup(result.group));
}

function joinGroup(groupId) {
  return call('joinGroup', { groupId }).then((result) => normalizeGroup(result.group));
}

function leaveGroup(groupId) {
  return call('leaveGroup', { groupId }).then((result) => normalizeGroup(result.group));
}

function setGroupAnnouncement(groupId, announcement) {
  return call('setGroupAnnouncement', { groupId, announcement: String(announcement || '').trim().slice(0, 200) })
    .then((result) => normalizeGroup(result.group));
}

// ---------------------------------------------------------------- activities

function normalizeActivity(item) {
  const profile = store.getProfile();
  const myId = profile.userId || profile.id;
  const memberIds = Array.isArray(item.memberIds) ? item.memberIds.slice() : [];
  const capacity = Math.max(2, Number(item.capacity || 0) || 6);
  return {
    ...item,
    capacity,
    memberIds,
    memberCount: Number(item.memberCount || memberIds.length),
    seats: Math.max(0, capacity - memberIds.length),
    joined: memberIds.indexOf(myId) >= 0,
    isCreator: Boolean(item.creatorId) && item.creatorId === myId,
    creatorName: item.creatorName || '',
    creatorId: item.creatorId || '',
  };
}

function listActivities() {
  return call('listActivities').then((result) => result.activities.map(normalizeActivity));
}

function getActivity(activityId) {
  return listActivities().then((list) => list.find((item) => item.id === activityId) || null);
}

function createActivity(activity) {
  return call('createActivity', { activity }).then((result) => normalizeActivity(result.activity));
}

function joinActivity(activityId) {
  return call('joinActivity', { activityId }).then((result) => normalizeActivity(result.activity));
}

function leaveActivity(activityId) {
  return call('leaveActivity', { activityId }).then((result) => normalizeActivity(result.activity));
}

function cancelActivity(activityId) {
  return call('cancelActivity', { activityId });
}

function updateActivity(activityId, patch) {
  return call('updateActivity', { activityId, patch }).then((result) => normalizeActivity(result.activity));
}

// ---------------------------------------------------------------- notifications

function listNotifications() {
  const settings = store.getSettings();
  return call('listNotifications')
    .then((result) => result.notifications)
    .then((list) => list
      .filter((item) => {
        if (item.type === 'activity') return settings.notifyActivity !== false;
        if (item.type === 'message') return settings.notifyMessage !== false;
        return settings.notifySystem !== false;
      })
      .map((item) => ({ ...item, time: item.time || time.formatRelative(item.createdAt) })));
}

function markNotification(notificationId) {
  return call('markNotification', { notificationId });
}

function markAllNotifications() {
  return call('markAllNotifications');
}

// ---------------------------------------------------------------- favorites / place status

function listFavorites() {
  return call('listFavorites').then((r) => r.placeIds);
}

function toggleFavorite(placeId) {
  return call('toggleFavorite', { placeId });
}

function listPlaceStatuses(placeId) {
  return call('listPlaceStatuses', { placeId }).then((r) => r.items
    .map((item) => ({ ...item, time: time.formatRelative(item.createdAt) })));
}

function setPlaceStatus(placeId, status, note) {
  return call('setPlaceStatus', { placeId, status, note });
}

// ---------------------------------------------------------------- settings（本地偏好）

function getSettings() {
  return store.getSettings();
}

// 设置在本地立即生效（纯偏好），同时同步到云端；同步失败会抛出，由页面提示
function saveSettings(patch) {
  const next = store.saveSettings(patch);
  return call('updateSettings', { settings: next }).then(() => next);
}

// ---------------------------------------------------------------- safety

function report({ targetType, targetId, reason }) {
  return call('reportContent', { targetType, targetId, reason });
}

function listBlocked() {
  return call('listBlocked').then((r) => r.users.map(normalizeUser));
}

function block(userId) {
  return call('blockUser', { userId });
}

function unblock(userId) {
  return call('unblockUser', { userId });
}

function addFeedback(item) {
  return call('addFeedback', item);
}

// ---------------------------------------------------------------- session

function logout() {
  store.clearUserData();
  return Promise.resolve({ ok: true });
}

function deleteAccount() {
  return call('deleteAccount').then(() => {
    store.clearUserData();
    return { ok: true };
  });
}

module.exports = {
  avatarOf,
  checkHandle,
  bootstrap,
  updateProfile,
  uploadAvatar,
  listUsers,
  getUser,
  followStats,
  listFollowing,
  listFollowers,
  follow,
  unfollow,
  listPosts,
  createPost,
  deletePost,
  togglePostLike,
  listConversations,
  markConversationRead,
  createDirectConversation,
  getOrCreatePlaceConversation,
  getMessages,
  getReadState,
  sendMessage,
  recallMessage,
  watchMessages,
  listGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  setGroupAnnouncement,
  listActivities,
  getActivity,
  createActivity,
  joinActivity,
  leaveActivity,
  cancelActivity,
  updateActivity,
  listNotifications,
  markNotification,
  markAllNotifications,
  listFavorites,
  toggleFavorite,
  listPlaceStatuses,
  setPlaceStatus,
  getSettings,
  saveSettings,
  report,
  listBlocked,
  block,
  unblock,
  addFeedback,
  logout,
  deleteAccount,
};
