const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const command = db.command;

const COLLECTIONS = {
  users: 'users',
  conversations: 'conversations',
  messages: 'messages',
  groups: 'groups',
  activities: 'activities',
  notifications: 'notifications',
  feedback: 'feedback',
  follows: 'follows',
  posts: 'posts',
  placeStatuses: 'placeStatuses',
  favorites: 'favorites',
  reports: 'reports',
  blocks: 'blocks',
};

function cleanText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha256').update(value).digest('hex').slice(0, 20)}`;
}

function defaultAvatar(position = 'avatar-1') {
  const allowed = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'];
  return allowed.includes(position) ? position : 'avatar-1';
}

function publicUser(user) {
  return {
    userId: user.userId,
    nickname: user.nickname,
    handle: user.handle || '',
    avatarFileId: user.avatarFileId || '',
    avatarPosition: user.avatarPosition || 'avatar-1',
    faculty: user.faculty || '',
    bio: user.bio || '',
    interests: Array.isArray(user.interests) ? user.interests.slice(0, 12) : [],
    profileComplete: Boolean(user.profileComplete),
    verified: Boolean(user.verified),
  };
}

function publicMessage(message) {
  return {
    _id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.senderName,
    senderAvatarFileId: message.senderAvatarFileId || '',
    senderAvatarPosition: message.senderAvatarPosition || 'avatar-1',
    type: message.type,
    text: message.text,
    clientId: message.clientId,
    createdAt: message.createdAt,
  };
}

async function getUserByOpenId(openid, create = true) {
  try {
    const result = await db.collection(COLLECTIONS.users).doc(openid).get();
    return { ...result.data, _openid: openid };
  } catch (error) {
    if (!create) return null;
    const now = Date.now();
    const user = {
      userId: stableId('usr', openid),
      nickname: 'LinkUS user',
      avatarFileId: '',
      avatarPosition: 'avatar-1',
      faculty: '',
      bio: '',
      interests: [],
      profileComplete: false,
      verified: false,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    await db.collection(COLLECTIONS.users).doc(openid).set({ data: user });
    return { ...user, _openid: openid };
  }
}

async function findUserByPublicId(userId) {
  const result = await db.collection(COLLECTIONS.users).where({ userId: cleanText(userId, 64) }).limit(1).get();
  if (!result.data.length) return null;
  return { ...result.data[0], _openid: result.data[0]._id };
}

async function requireConversation(conversationId, openid) {
  const result = await db.collection(COLLECTIONS.conversations).doc(cleanText(conversationId, 80)).get();
  const conversation = result.data;
  if (!Array.isArray(conversation.memberOpenIds) || !conversation.memberOpenIds.includes(openid)) {
    throw new Error('FORBIDDEN_CONVERSATION');
  }
  return conversation;
}

async function addNotification(recipientOpenId, item) {
  if (!recipientOpenId) return;
  await db.collection(COLLECTIONS.notifications).add({
    data: {
      recipientOpenId,
      title: cleanText(item.title, 80),
      body: cleanText(item.body, 180),
      icon: cleanText(item.icon || '💬', 8),
      target: cleanText(item.target, 240),
      unread: true,
      createdAt: Date.now(),
    },
  });
}

async function bootstrap(openid) {
  const user = await getUserByOpenId(openid, true);
  await db.collection(COLLECTIONS.users).doc(openid).update({ data: { lastLoginAt: Date.now() } });
  return { user: publicUser(user) };
}

async function updateProfile(openid, data) {
  const nickname = cleanText(data.nickname, 30);
  if (!nickname) throw new Error('NICKNAME_REQUIRED');
  const patch = {
    nickname,
    avatarFileId: cleanText(data.avatarFileId, 260),
    avatarPosition: defaultAvatar(data.avatarPosition),
    faculty: cleanText(data.faculty, 80),
    bio: cleanText(data.bio, 240),
    interests: Array.isArray(data.interests) ? data.interests.map((item) => cleanText(item, 30)).filter(Boolean).slice(0, 12) : [],
    profileComplete: true,
    updatedAt: Date.now(),
  };
  await db.collection(COLLECTIONS.users).doc(openid).update({ data: patch });
  const user = await getUserByOpenId(openid, false);
  return { user: publicUser(user) };
}

async function listUsers(openid) {
  const result = await db.collection(COLLECTIONS.users).where({ status: 'active', profileComplete: true }).limit(50).get();
  return { users: result.data.filter((user) => user._id !== openid).map(publicUser) };
}

async function createDirectConversation(openid, targetUserId) {
  const me = await getUserByOpenId(openid, true);
  const target = await findUserByPublicId(targetUserId);
  if (!target || target._openid === openid) throw new Error('INVALID_CHAT_TARGET');
  const memberOpenIds = [openid, target._openid].sort();
  const conversationId = stableId('dm', memberOpenIds.join('|'));
  const now = Date.now();
  const conversation = {
    type: 'direct',
    memberOpenIds,
    memberUserIds: [me.userId, target.userId],
    title: '',
    avatar: '',
    lastMessage: '',
    lastAt: now,
    createdAt: now,
    updatedAt: now,
    lastReadAt: { [me.userId]: now, [target.userId]: 0 },
  };
  try {
    await db.collection(COLLECTIONS.conversations).doc(conversationId).get();
  } catch (error) {
    await db.collection(COLLECTIONS.conversations).doc(conversationId).set({ data: conversation });
  }
  return { conversation: { id: conversationId, type: 'direct', title: target.nickname, avatarFileId: target.avatarFileId || '', avatarPosition: target.avatarPosition || 'avatar-1', preview: '', unread: 0 } };
}

async function getOrCreatePlaceConversation(openid, data) {
  const user = await getUserByOpenId(openid, true);
  const placeId = cleanText(data.placeId, 64);
  const title = cleanText(data.title, 100) || 'Place discussion';
  if (!placeId) throw new Error('PLACE_REQUIRED');
  const conversationId = `place_${placeId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  try {
    const result = await db.collection(COLLECTIONS.conversations).doc(conversationId).get();
    const conversation = result.data;
    const members = Array.isArray(conversation.memberOpenIds) ? conversation.memberOpenIds : [];
    const userIds = Array.isArray(conversation.memberUserIds) ? conversation.memberUserIds : [];
    if (!members.includes(openid)) {
      await db.collection(COLLECTIONS.conversations).doc(conversationId).update({
        data: { memberOpenIds: [...members, openid], memberUserIds: [...new Set([...userIds, user.userId])], updatedAt: Date.now(), [`lastReadAt.${user.userId}`]: Date.now() },
      });
    }
  } catch (error) {
    const now = Date.now();
    await db.collection(COLLECTIONS.conversations).doc(conversationId).set({
      data: { type: 'place', placeId, memberOpenIds: [openid], memberUserIds: [user.userId], title, avatarPosition: 'avatar-4', lastMessage: '', lastAt: now, createdAt: now, updatedAt: now, lastReadAt: { [user.userId]: now } },
    });
  }
  return { conversation: { id: conversationId, type: 'place', title, avatarPosition: 'avatar-4', preview: '', unread: 0 } };
}

async function listConversations(openid) {
  const me = await getUserByOpenId(openid, true);
  const result = await db.collection(COLLECTIONS.conversations)
    .where({ memberOpenIds: command.all([openid]) })
    .orderBy('lastAt', 'desc')
    .limit(50)
    .get();
  const rows = [];
  for (const conversation of result.data) {
    let title = conversation.title || 'Conversation';
    let avatarFileId = conversation.avatarFileId || '';
    let avatarPosition = conversation.avatarPosition || 'avatar-3';
    if (conversation.type === 'direct') {
      const otherOpenId = (conversation.memberOpenIds || []).find((id) => id !== openid);
      const other = otherOpenId ? await getUserByOpenId(otherOpenId, false) : null;
      if (other) {
        title = other.nickname;
        avatarFileId = other.avatarFileId || '';
        avatarPosition = other.avatarPosition || 'avatar-1';
      }
    }
    const lastReadAt = conversation.lastReadAt && conversation.lastReadAt[me.userId] ? conversation.lastReadAt[me.userId] : 0;
    let unread = 0;
    if ((conversation.lastAt || 0) > lastReadAt) {
      const unreadResult = await db.collection(COLLECTIONS.messages).where({ conversationId: conversation._id, createdAt: command.gt(lastReadAt) }).count();
      unread = unreadResult.total || 0;
    }
    rows.push({
      id: conversation._id,
      type: conversation.type,
      title,
      avatarFileId,
      avatarPosition,
      preview: conversation.lastMessage || 'Start a conversation',
      lastAt: conversation.lastAt || conversation.createdAt,
      unread,
    });
  }
  return { conversations: rows };
}

async function getMessages(openid, conversationId, before) {
  await requireConversation(conversationId, openid);
  const user = await getUserByOpenId(openid, true);
  const where = { conversationId: cleanText(conversationId, 80) };
  if (before) where.createdAt = command.lt(Number(before));
  const result = await db.collection(COLLECTIONS.messages).where(where).orderBy('createdAt', 'desc').limit(50).get();
  await db.collection(COLLECTIONS.conversations).doc(conversationId).update({ data: { [`lastReadAt.${user.userId}`]: Date.now() } });
  return { messages: result.data.reverse().map(publicMessage) };
}

async function sendMessage(openid, data) {
  const conversation = await requireConversation(data.conversationId, openid);
  const sender = await getUserByOpenId(openid, true);
  const text = cleanText(data.text, 1000);
  if (!text) throw new Error('EMPTY_MESSAGE');
  const now = Date.now();
  if (sender.lastMessageAt && now - sender.lastMessageAt < 500) throw new Error('MESSAGE_TOO_FAST');
  const message = {
    conversationId: cleanText(data.conversationId, 80),
    memberOpenIds: conversation.memberOpenIds,
    senderOpenId: openid,
    senderId: sender.userId,
    senderName: sender.nickname,
    senderAvatarFileId: sender.avatarFileId || '',
    senderAvatarPosition: sender.avatarPosition || 'avatar-1',
    type: 'text',
    text,
    clientId: cleanText(data.clientId, 80),
    createdAt: now,
  };
  const inserted = await db.collection(COLLECTIONS.messages).add({ data: message });
  await db.collection(COLLECTIONS.users).doc(openid).update({ data: { lastMessageAt: now } });
  await db.collection(COLLECTIONS.conversations).doc(data.conversationId).update({ data: { lastMessage: text.slice(0, 120), lastAt: now, updatedAt: now, [`lastReadAt.${sender.userId}`]: now } });
  const recipients = (conversation.memberOpenIds || []).filter((id) => id !== openid);
  await Promise.all(recipients.map((recipient) => addNotification(recipient, {
    title: sender.nickname,
    body: text.slice(0, 120),
    icon: '💬',
    target: `/pages/chat/index?id=${encodeURIComponent(data.conversationId)}&title=${encodeURIComponent(conversation.title || sender.nickname)}`,
  })));
  return { message: publicMessage({ _id: inserted._id, ...message }) };
}

function publicGroup(group, openid) {
  const members = Array.isArray(group.memberOpenIds) ? group.memberOpenIds : [];
  return {
    id: group._id,
    name: group.name,
    avatar: group.avatar || '👥',
    members: members.length,
    description: group.description || '',
    joined: members.includes(openid),
    conversationId: group.conversationId,
    ownerId: group.creatorUserId || '',
    ownerName: group.creatorName || '',
    announcement: group.announcement || '',
    isOwner: group.creatorOpenId === openid,
  };
}

async function listGroups(openid) {
  const result = await db.collection(COLLECTIONS.groups).orderBy('createdAt', 'desc').limit(50).get();
  return { groups: result.data.map((group) => publicGroup(group, openid)) };
}

async function createGroup(openid, data) {
  const creator = await getUserByOpenId(openid, true);
  const name = cleanText(data.name, 60);
  if (!name) throw new Error('GROUP_NAME_REQUIRED');
  const now = Date.now();
  const conversationResult = await db.collection(COLLECTIONS.conversations).add({
    data: { type: 'group', memberOpenIds: [openid], memberUserIds: [creator.userId], title: name, avatarPosition: 'avatar-3', lastMessage: '', lastAt: now, createdAt: now, updatedAt: now, lastReadAt: { [creator.userId]: now } },
  });
  const groupResult = await db.collection(COLLECTIONS.groups).add({
    data: { name, avatar: cleanText(data.avatar || '👥', 8), description: cleanText(data.description || 'A new LinkUS community.', 240), creatorOpenId: openid, memberOpenIds: [openid], conversationId: conversationResult._id, createdAt: now, updatedAt: now },
  });
  const group = await db.collection(COLLECTIONS.groups).doc(groupResult._id).get();
  return { group: publicGroup(group.data, openid) };
}

async function toggleGroup(openid, groupId, join) {
  const user = await getUserByOpenId(openid, true);
  const result = await db.collection(COLLECTIONS.groups).doc(cleanText(groupId, 80)).get();
  const group = result.data;
  const members = Array.isArray(group.memberOpenIds) ? group.memberOpenIds : [];
  const updated = join ? [...new Set([...members, openid])] : members.filter((id) => id !== openid);
  await db.collection(COLLECTIONS.groups).doc(groupId).update({ data: { memberOpenIds: updated, updatedAt: Date.now() } });
  if (group.conversationId) {
    const conversation = await db.collection(COLLECTIONS.conversations).doc(group.conversationId).get();
    const conversationMembers = Array.isArray(conversation.data.memberOpenIds) ? conversation.data.memberOpenIds : [];
    const next = join ? [...new Set([...conversationMembers, openid])] : conversationMembers.filter((id) => id !== openid);
    const conversationPatch = { memberOpenIds: next, updatedAt: Date.now() };
    if (join) conversationPatch[`lastReadAt.${user.userId}`] = Date.now();
    await db.collection(COLLECTIONS.conversations).doc(group.conversationId).update({ data: conversationPatch });
  }
  return { group: publicGroup({ ...group, memberOpenIds: updated }, openid) };
}

function publicActivity(activity, openid) {
  const members = Array.isArray(activity.memberOpenIds) ? activity.memberOpenIds : [];
  const memberUserIds = Array.isArray(activity.memberUserIds) ? activity.memberUserIds : [];
  const capacity = Math.max(2, Number(activity.capacity || 0) || 6);
  return {
    id: activity._id,
    title: activity.title,
    emoji: activity.emoji || '📅',
    place: activity.place,
    time: activity.time,
    seats: Math.max(0, capacity - members.length),
    capacity,
    memberIds: memberUserIds.length ? memberUserIds : members,
    creatorId: activity.creatorUserId || '',
    creatorName: activity.creatorName || '',
    joined: members.includes(openid),
    description: activity.description || '',
  };
}

async function listActivities(openid) {
  const result = await db.collection(COLLECTIONS.activities).orderBy('createdAt', 'desc').limit(100).get();
  return { activities: result.data.map((activity) => publicActivity(activity, openid)) };
}

async function createActivity(openid, data) {
  const title = cleanText(data.title, 80);
  const place = cleanText(data.place, 100);
  const time = cleanText(data.time, 80);
  if (!title || !place || !time) throw new Error('ACTIVITY_FIELDS_REQUIRED');
  const creator = await getUserByOpenId(openid, true);
  const activity = {
    title,
    place,
    time,
    description: cleanText(data.description, 400),
    emoji: cleanText(data.emoji || '📅', 8),
    capacity: Math.max(2, Math.min(100, Number(data.capacity) || 6)),
    creatorOpenId: openid,
    creatorUserId: creator.userId,
    creatorName: creator.nickname,
    memberOpenIds: [openid],
    memberUserIds: [creator.userId],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const inserted = await db.collection(COLLECTIONS.activities).add({ data: activity });
  return { activity: publicActivity({ _id: inserted._id, ...activity }, openid) };
}

async function updateActivity(openid, activityId, patch) {
  const result = await db.collection(COLLECTIONS.activities).doc(cleanText(activityId, 80)).get();
  const activity = result.data;
  if (activity.creatorOpenId !== openid) throw new Error('NOT_ALLOWED');
  const next = { updatedAt: Date.now() };
  if (patch.title !== undefined) next.title = cleanText(patch.title, 80);
  if (patch.place !== undefined) next.place = cleanText(patch.place, 100);
  if (patch.time !== undefined) next.time = cleanText(patch.time, 80);
  if (patch.description !== undefined) next.description = cleanText(patch.description, 400);
  if (patch.capacity !== undefined) next.capacity = Math.max(2, Math.min(100, Number(patch.capacity) || 6));
  await db.collection(COLLECTIONS.activities).doc(activityId).update({ data: next });
  return { activity: publicActivity({ ...activity, ...next }, openid) };
}

async function cancelActivity(openid, activityId) {
  const result = await db.collection(COLLECTIONS.activities).doc(cleanText(activityId, 80)).get();
  const activity = result.data;
  if (activity.creatorOpenId !== openid) throw new Error('NOT_ALLOWED');
  const memberOpenIds = Array.isArray(activity.memberOpenIds) ? activity.memberOpenIds : [];
  await Promise.all(memberOpenIds.filter((id) => id !== openid).map((id) => addNotification(id, {
    title: 'Activity cancelled',
    body: `${cleanText(activity.title, 40)} was cancelled by the host.`,
    icon: '⚠️',
    target: '/pages/activities/index',
  })));
  await db.collection(COLLECTIONS.activities).doc(activityId).remove();
  return { ok: true };
}

async function toggleActivity(openid, activityId, join) {
  const user = await getUserByOpenId(openid, true);
  const result = await db.collection(COLLECTIONS.activities).doc(cleanText(activityId, 80)).get();
  const activity = result.data;
  const members = Array.isArray(activity.memberOpenIds) ? activity.memberOpenIds : [];
  const memberUserIds = Array.isArray(activity.memberUserIds) ? activity.memberUserIds : [];
  if (join && members.length >= Number(activity.capacity || 0)) throw new Error('ACTIVITY_FULL');
  const updated = join ? [...new Set([...members, openid])] : members.filter((id) => id !== openid);
  const updatedUserIds = join ? [...new Set([...memberUserIds, user.userId])] : memberUserIds.filter((id) => id !== user.userId);
  await db.collection(COLLECTIONS.activities).doc(activityId).update({
    data: { memberOpenIds: updated, memberUserIds: updatedUserIds, updatedAt: Date.now() },
  });
  if (join) {
    if (activity.creatorOpenId && activity.creatorOpenId !== openid) {
      await addNotification(activity.creatorOpenId, {
        title: 'New activity sign-up',
        body: `${user.nickname} joined ${cleanText(activity.title, 40)}.`,
        icon: '🙋',
        target: `/pages/activity-detail/index?id=${activityId}`,
      });
    }
  }
  return { activity: publicActivity({ ...activity, memberOpenIds: updated, memberUserIds: updatedUserIds }, openid) };
}

async function listNotifications(openid) {
  const result = await db.collection(COLLECTIONS.notifications).where({ recipientOpenId: openid }).orderBy('createdAt', 'desc').limit(100).get();
  return { notifications: result.data.map((item) => ({ id: item._id, title: item.title, body: item.body, icon: item.icon, target: item.target, unread: item.unread, createdAt: item.createdAt })) };
}

async function markNotification(openid, notificationId) {
  const result = await db.collection(COLLECTIONS.notifications).doc(cleanText(notificationId, 80)).get();
  if (result.data.recipientOpenId !== openid) throw new Error('FORBIDDEN_NOTIFICATION');
  await db.collection(COLLECTIONS.notifications).doc(notificationId).update({ data: { unread: false } });
  return { ok: true };
}

async function markAllNotifications(openid) {
  const result = await db.collection(COLLECTIONS.notifications).where({ recipientOpenId: openid, unread: true }).limit(100).get();
  await Promise.all(result.data.map((item) => db.collection(COLLECTIONS.notifications).doc(item._id).update({ data: { unread: false } })));
  return { ok: true };
}

async function addFeedback(openid, data) {
  const text = cleanText(data.text, 1000);
  if (!text) throw new Error('EMPTY_FEEDBACK');
  await db.collection(COLLECTIONS.feedback).add({ data: { ownerOpenId: openid, type: cleanText(data.type || 'Suggestion', 40), text, createdAt: Date.now() } });
  return { ok: true };
}

// ---------------------------------------------------------------- social graph

async function currentUserId(openid) {
  const user = await getUserByOpenId(openid, true);
  return user.userId;
}

async function getUser(openid, userId) {
  const user = await findUserByPublicId(userId);
  if (!user) throw new Error('USER_NOT_FOUND');
  return { user: publicUser(user) };
}

async function getFollowStats(openid, userId) {
  const target = cleanText(userId, 64) || (await currentUserId(openid));
  const [following, followers, mine] = await Promise.all([
    db.collection(COLLECTIONS.follows).where({ followerUserId: target }).count(),
    db.collection(COLLECTIONS.follows).where({ targetUserId: target }).count(),
    target === (await currentUserId(openid))
      ? Promise.resolve({ total: 0 })
      : db.collection(COLLECTIONS.follows).where({ followerUserId: await currentUserId(openid), targetUserId: target }).count(),
  ]);
  return { following: following.total, followers: followers.total, isFollowing: mine.total > 0 };
}

async function listFollowing(openid, userId) {
  const target = cleanText(userId, 64) || (await currentUserId(openid));
  const result = await db.collection(COLLECTIONS.follows).where({ followerUserId: target }).orderBy('createdAt', 'desc').limit(100).get();
  const users = await Promise.all(result.data.map((row) => findUserByPublicId(row.targetUserId)));
  return { users: users.filter(Boolean).map(publicUser) };
}

async function listFollowers(openid, userId) {
  const target = cleanText(userId, 64) || (await currentUserId(openid));
  const result = await db.collection(COLLECTIONS.follows).where({ targetUserId: target }).orderBy('createdAt', 'desc').limit(100).get();
  const users = await Promise.all(result.data.map((row) => findUserByPublicId(row.followerUserId)));
  return { users: users.filter(Boolean).map(publicUser) };
}

async function follow(openid, targetUserId) {
  const meId = await currentUserId(openid);
  if (!targetUserId || targetUserId === meId) throw new Error('NOT_ALLOWED');
  const existing = await db.collection(COLLECTIONS.follows).where({ followerUserId: meId, targetUserId }).limit(1).get();
  if (existing.data.length) return { ok: true };
  await db.collection(COLLECTIONS.follows).add({ data: { followerUserId: meId, followerOpenId: openid, targetUserId, createdAt: Date.now() } });
  return { ok: true };
}

async function unfollow(openid, targetUserId) {
  const meId = await currentUserId(openid);
  const existing = await db.collection(COLLECTIONS.follows).where({ followerUserId: meId, targetUserId }).limit(20).get();
  await Promise.all(existing.data.map((row) => db.collection(COLLECTIONS.follows).doc(row._id).remove()));
  return { ok: true };
}

// ---------------------------------------------------------------- moments

function publicPost(post, meId) {
  const likes = Array.isArray(post.likes) ? post.likes : [];
  return {
    id: post._id,
    authorId: post.authorUserId,
    authorName: post.authorName,
    avatarFileId: post.avatarFileId || '',
    avatarPosition: post.avatarPosition || 'avatar-1',
    text: post.text,
    placeId: post.placeId || '',
    placeName: post.placeName || '',
    visibility: post.visibility || 'public',
    likes,
    likeCount: likes.length,
    likedByMe: likes.indexOf(meId) >= 0,
    createdAt: post.createdAt,
  };
}

async function listPosts(openid, scope) {
  const meId = await currentUserId(openid);
  const mine = await db.collection(COLLECTIONS.follows).where({ followerUserId: meId }).limit(100).get();
  const following = mine.data.map((row) => row.targetUserId);
  const result = await db.collection(COLLECTIONS.posts).orderBy('createdAt', 'desc').limit(60).get();
  let rows = result.data;
  if (scope === 'mine') rows = rows.filter((post) => post.authorUserId === meId);
  else if (scope === 'liked') rows = rows.filter((post) => (post.likes || []).indexOf(meId) >= 0);
  else rows = rows.filter((post) => post.visibility === 'public'
    || post.authorUserId === meId
    || (post.visibility === 'followers' && following.indexOf(post.authorUserId) >= 0));
  return { posts: rows.map((post) => publicPost(post, meId)) };
}

async function createPost(openid, data) {
  const user = await getUserByOpenId(openid, true);
  const text = cleanText(data.text, 500);
  if (!text) throw new Error('EMPTY_POST');
  const visibility = ['public', 'followers', 'private'].includes(data.visibility) ? data.visibility : 'public';
  const post = {
    authorOpenId: openid,
    authorUserId: user.userId,
    authorName: user.nickname,
    avatarFileId: user.avatarFileId || '',
    avatarPosition: user.avatarPosition || 'avatar-1',
    text,
    visibility,
    placeId: cleanText(data.placeId, 60),
    placeName: cleanText(data.placeName, 60),
    likes: [],
    createdAt: Date.now(),
  };
  const inserted = await db.collection(COLLECTIONS.posts).add({ data: post });
  return { post: publicPost({ _id: inserted._id, ...post }, user.userId) };
}

async function deletePost(openid, postId) {
  const result = await db.collection(COLLECTIONS.posts).doc(cleanText(postId, 80)).get();
  if (result.data.authorOpenId !== openid) throw new Error('NOT_ALLOWED');
  await db.collection(COLLECTIONS.posts).doc(postId).remove();
  return { ok: true };
}

async function likePost(openid, postId) {
  const meId = await currentUserId(openid);
  const result = await db.collection(COLLECTIONS.posts).doc(cleanText(postId, 80)).get();
  const likes = Array.isArray(result.data.likes) ? result.data.likes.slice() : [];
  const index = likes.indexOf(meId);
  if (index >= 0) likes.splice(index, 1);
  else likes.push(meId);
  await db.collection(COLLECTIONS.posts).doc(postId).update({ data: { likes } });
  return { post: publicPost({ ...result.data, likes }, meId) };
}

// ---------------------------------------------------------------- conversations: read + recall

async function markConversationRead(openid, conversationId) {
  const conversation = await requireConversation(conversationId, openid);
  const meId = await currentUserId(openid);
  const patch = { updatedAt: Date.now() };
  patch[`lastReadAt.${meId}`] = Date.now();
  await db.collection(COLLECTIONS.conversations).doc(conversationId).update({ data: patch });
  return { ok: true, readAt: patch[`lastReadAt.${meId}`] };
}

async function getReadState(openid, conversationId) {
  const conversation = await requireConversation(conversationId, openid);
  const meId = await currentUserId(openid);
  const lastReadAt = conversation.lastReadAt || {};
  const partnerIds = (conversation.memberUserIds || []).filter((id) => id !== meId);
  const partnerReadAt = partnerIds.reduce((latest, id) => Math.max(latest, Number(lastReadAt[id] || 0)), 0);
  return { partnerReadAt, readAt: Number(lastReadAt[meId] || 0) };
}

async function recallMessage(openid, conversationId, messageId) {
  const message = await db.collection(COLLECTIONS.messages).doc(cleanText(messageId, 80)).get();
  if (message.data.senderOpenId !== openid) throw new Error('NOT_ALLOWED');
  if (Date.now() - Number(message.data.createdAt || 0) > 2 * 60 * 1000) throw new Error('MESSAGE_TOO_OLD');
  await db.collection(COLLECTIONS.messages).doc(messageId).update({ data: { text: 'Message recalled', recalled: true } });
  return { ok: true };
}

// ---------------------------------------------------------------- groups: announcement

async function setGroupAnnouncement(openid, groupId, announcement) {
  const result = await db.collection(COLLECTIONS.groups).doc(cleanText(groupId, 80)).get();
  if (result.data.creatorOpenId !== openid) throw new Error('NOT_ALLOWED');
  const text = cleanText(announcement, 200);
  await db.collection(COLLECTIONS.groups).doc(groupId).update({ data: { announcement: text, updatedAt: Date.now() } });
  return { group: publicGroup({ ...result.data, announcement: text }, openid) };
}

// ---------------------------------------------------------------- favorites / place status

async function listFavorites(openid) {
  const meId = await currentUserId(openid);
  const result = await db.collection(COLLECTIONS.favorites).where({ ownerUserId: meId }).limit(100).get();
  return { placeIds: result.data.map((row) => row.placeId) };
}

async function toggleFavorite(openid, placeId) {
  const meId = await currentUserId(openid);
  const existing = await db.collection(COLLECTIONS.favorites).where({ ownerUserId: meId, placeId }).limit(1).get();
  if (existing.data.length) {
    await db.collection(COLLECTIONS.favorites).doc(existing.data[0]._id).remove();
    return { ok: true, favorited: false };
  }
  await db.collection(COLLECTIONS.favorites).add({ data: { ownerUserId: meId, placeId, createdAt: Date.now() } });
  return { ok: true, favorited: true };
}

function publicPlaceStatus(item) {
  return {
    id: item._id,
    placeId: item.placeId,
    status: item.status,
    note: item.note || '',
    authorName: item.authorName || '',
    createdAt: item.createdAt,
  };
}

async function listPlaceStatuses(openid, placeId) {
  const query = placeId
    ? db.collection(COLLECTIONS.placeStatuses).where({ placeId }).orderBy('createdAt', 'desc').limit(20)
    : db.collection(COLLECTIONS.placeStatuses).orderBy('createdAt', 'desc').limit(20);
  const result = await query.get();
  return { items: result.data.map(publicPlaceStatus) };
}

async function setPlaceStatus(openid, data) {
  const user = await getUserByOpenId(openid, true);
  const status = cleanText(data.status, 40);
  if (!status) throw new Error('EMPTY_STATUS');
  const item = {
    placeId: cleanText(data.placeId, 60),
    status,
    note: cleanText(data.note, 120),
    authorOpenId: openid,
    authorUserId: user.userId,
    authorName: user.nickname,
    createdAt: Date.now(),
  };
  const inserted = await db.collection(COLLECTIONS.placeStatuses).add({ data: item });
  return { item: publicPlaceStatus({ _id: inserted._id, ...item }) };
}

// ---------------------------------------------------------------- settings / safety / account

async function updateSettings(openid, settings) {
  const allowed = ['dmPrivacy', 'showFollowing', 'notifyActivity', 'notifyMessage', 'notifySystem'];
  const next = {};
  allowed.forEach((key) => {
    if (settings && settings[key] !== undefined) next[`settings.${key}`] = settings[key];
  });
  if (Object.keys(next).length) {
    await db.collection(COLLECTIONS.users).doc(openid).update({ data: next });
  }
  return { ok: true };
}

async function reportContent(openid, data) {
  await db.collection(COLLECTIONS.reports).add({
    data: {
      reporterOpenId: openid,
      targetType: cleanText(data.targetType, 20),
      targetId: cleanText(data.targetId, 80),
      reason: cleanText(data.reason, 200),
      status: 'open',
      createdAt: Date.now(),
    },
  });
  return { ok: true };
}

async function blockUser(openid, targetUserId) {
  const meId = await currentUserId(openid);
  if (!targetUserId || targetUserId === meId) throw new Error('NOT_ALLOWED');
  const existing = await db.collection(COLLECTIONS.blocks).where({ ownerUserId: meId, blockedUserId: targetUserId }).limit(1).get();
  if (!existing.data.length) {
    await db.collection(COLLECTIONS.blocks).add({ data: { ownerUserId: meId, blockedUserId: targetUserId, createdAt: Date.now() } });
  }
  return { ok: true };
}

async function unblockUser(openid, targetUserId) {
  const meId = await currentUserId(openid);
  const existing = await db.collection(COLLECTIONS.blocks).where({ ownerUserId: meId, blockedUserId: targetUserId }).limit(20).get();
  await Promise.all(existing.data.map((row) => db.collection(COLLECTIONS.blocks).doc(row._id).remove()));
  return { ok: true };
}

async function listBlocked(openid) {
  const meId = await currentUserId(openid);
  const result = await db.collection(COLLECTIONS.blocks).where({ ownerUserId: meId }).limit(100).get();
  const users = await Promise.all(result.data.map((row) => findUserByPublicId(row.blockedUserId)));
  return { users: users.filter(Boolean).map(publicUser) };
}

async function deleteAccount(openid) {
  // 软删除：保留消息完整性，但立即退出所有可检索入口
  await db.collection(COLLECTIONS.users).doc(openid).update({
    data: { status: 'deleted', nickname: 'Deleted user', bio: '', interests: [], handle: '', updatedAt: Date.now() },
  });
  return { ok: true };
}

exports.main = async (event = {}) => {
  // 部署自检：不需要微信身份，云开发控制台的「云端测试」可直接调用
  if (event.action === 'ping') {
    return { ok: true, build: 'linkus-api-2026-11-09', actions: 47, time: Date.now() };
  }
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'NO_WECHAT_IDENTITY' };
  try {
    const action = event.action;
    let result;
    if (action === 'bootstrap') result = await bootstrap(OPENID);
    else if (action === 'updateProfile') result = await updateProfile(OPENID, event.profile || {});
    else if (action === 'listUsers') result = await listUsers(OPENID);
    else if (action === 'createDirectConversation') result = await createDirectConversation(OPENID, event.targetUserId);
    else if (action === 'getOrCreatePlaceConversation') result = await getOrCreatePlaceConversation(OPENID, event);
    else if (action === 'listConversations') result = await listConversations(OPENID);
    else if (action === 'getMessages') result = await getMessages(OPENID, event.conversationId, event.before);
    else if (action === 'sendMessage') result = await sendMessage(OPENID, event);
    else if (action === 'listGroups') result = await listGroups(OPENID);
    else if (action === 'createGroup') result = await createGroup(OPENID, event.group || {});
    else if (action === 'joinGroup') result = await toggleGroup(OPENID, event.groupId, true);
    else if (action === 'leaveGroup') result = await toggleGroup(OPENID, event.groupId, false);
    else if (action === 'listActivities') result = await listActivities(OPENID);
    else if (action === 'createActivity') result = await createActivity(OPENID, event.activity || {});
    else if (action === 'joinActivity') result = await toggleActivity(OPENID, event.activityId, true);
    else if (action === 'leaveActivity') result = await toggleActivity(OPENID, event.activityId, false);
    else if (action === 'listNotifications') result = await listNotifications(OPENID);
    else if (action === 'markNotification') result = await markNotification(OPENID, event.notificationId);
    else if (action === 'markAllNotifications') result = await markAllNotifications(OPENID);
    else if (action === 'addFeedback') result = await addFeedback(OPENID, event);
    else if (action === 'getUser') result = await getUser(OPENID, event.userId);
    else if (action === 'getFollowStats') result = await getFollowStats(OPENID, event.userId);
    else if (action === 'listFollowing') result = await listFollowing(OPENID, event.userId);
    else if (action === 'listFollowers') result = await listFollowers(OPENID, event.userId);
    else if (action === 'follow') result = await follow(OPENID, event.userId);
    else if (action === 'unfollow') result = await unfollow(OPENID, event.userId);
    else if (action === 'listPosts') result = await listPosts(OPENID, event.scope);
    else if (action === 'createPost') result = await createPost(OPENID, event);
    else if (action === 'deletePost') result = await deletePost(OPENID, event.postId);
    else if (action === 'likePost') result = await likePost(OPENID, event.postId);
    else if (action === 'markConversationRead') result = await markConversationRead(OPENID, event.conversationId);
    else if (action === 'getReadState') result = await getReadState(OPENID, event.conversationId);
    else if (action === 'recallMessage') result = await recallMessage(OPENID, event.conversationId, event.messageId);
    else if (action === 'setGroupAnnouncement') result = await setGroupAnnouncement(OPENID, event.groupId, event.announcement);
    else if (action === 'cancelActivity') result = await cancelActivity(OPENID, event.activityId);
    else if (action === 'updateActivity') result = await updateActivity(OPENID, event.activityId, event.patch || {});
    else if (action === 'listFavorites') result = await listFavorites(OPENID);
    else if (action === 'toggleFavorite') result = await toggleFavorite(OPENID, event.placeId);
    else if (action === 'listPlaceStatuses') result = await listPlaceStatuses(OPENID, event.placeId);
    else if (action === 'setPlaceStatus') result = await setPlaceStatus(OPENID, event);
    else if (action === 'updateSettings') result = await updateSettings(OPENID, event.settings);
    else if (action === 'reportContent') result = await reportContent(OPENID, event);
    else if (action === 'blockUser') result = await blockUser(OPENID, event.userId);
    else if (action === 'unblockUser') result = await unblockUser(OPENID, event.userId);
    else if (action === 'listBlocked') result = await listBlocked(OPENID);
    else if (action === 'deleteAccount') result = await deleteAccount(OPENID);
    else throw new Error('UNKNOWN_ACTION');
    return { ok: true, ...result };
  } catch (error) {
    console.error('linkusApi', event.action, error);
    return { ok: false, error: error.message || 'SERVER_ERROR' };
  }
};
