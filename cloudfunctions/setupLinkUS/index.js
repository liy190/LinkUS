const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const COLLECTIONS = [
  'users',
  'conversations',
  'messages',
  'groups',
  'activities',
  'notifications',
  'feedback',
  'sharedLocations',
  'follows',
  'posts',
  'placeStatuses',
  'favorites',
  'reports',
  'blocks',
];

async function createCollections() {
  const results = [];
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      results.push({ name, created: true });
    } catch (error) {
      const message = String(error.errMsg || error.message || '');
      if (/exist|already/i.test(message) || error.errCode === -502005) results.push({ name, created: false, exists: true });
      else throw error;
    }
  }
  return results;
}

async function seedGroups() {
  const existing = await db.collection('groups').limit(1).get();
  if (existing.data.length) return 0;
  const now = Date.now();
  const seeds = [
    { name: 'HKU Tennis Club', avatar: '🎾', description: 'Friendly games, training and tournament meetups.' },
    { name: 'COMP7506 Study Crew', avatar: '📚', description: 'Weekly study sessions and project support.' },
    { name: 'Food only!', avatar: '🍜', description: 'Find people for quick meals near campus.' },
  ];
  for (const seed of seeds) {
    const conversation = await db.collection('conversations').add({
      data: { type: 'group', memberOpenIds: [], memberUserIds: [], title: seed.name, avatarPosition: 'avatar-3', lastMessage: '', lastAt: now, createdAt: now, updatedAt: now, lastReadAt: {}, system: true },
    });
    await db.collection('groups').add({
      data: { ...seed, creatorOpenId: 'system', memberOpenIds: [], conversationId: conversation._id, createdAt: now, updatedAt: now, system: true },
    });
  }
  return seeds.length;
}

async function seedActivities() {
  const existing = await db.collection('activities').limit(1).get();
  if (existing.data.length) return 0;
  const now = Date.now();
  const seeds = [
    { title: 'Evening badminton', emoji: '🏸', place: 'Flora Ho Sports Centre', time: 'Today 18:30', capacity: 6, description: 'Casual doubles. Beginners are welcome.' },
    { title: 'COMP7506 project study', emoji: '💻', place: 'Chi Wah Learning Commons', time: 'Tomorrow 14:00', capacity: 8, description: 'Review requirements and prepare the group demo.' },
    { title: 'Coffee and new friends', emoji: '☕', place: 'Main Building', time: 'Friday 16:00', capacity: 6, description: 'A short, low-pressure meetup for new students.' },
  ];
  for (const seed of seeds) {
    await db.collection('activities').add({ data: { ...seed, creatorOpenId: 'system', memberOpenIds: [], createdAt: now, updatedAt: now, system: true } });
  }
  return seeds.length;
}

// 初始化函数：只建集合 + 播种演示数据，全部幂等（集合已存在就跳过、有数据就不再播种）。
// 不再要求微信身份，这样可以直接在云开发控制台的「云端测试」里运行；
// 因为它不写用户数据，重复运行也不会造成副作用。
exports.main = async () => {
  try {
    const collections = await createCollections();
    const groups = await seedGroups();
    const activities = await seedActivities();
    return { ok: true, collections, seeded: { groups, activities } };
  } catch (error) {
    console.error('setupLinkUS', error);
    return { ok: false, error: error.message || 'SETUP_FAILED' };
  }
};
