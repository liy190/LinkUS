const currentUser = {
  id: 'user-me',
  nickname: 'Maus',
  handle: '@maus_hku',
  avatar: '🐬',
  bio: 'Design, badminton and late-night study sessions.',
  faculty: 'Faculty of Engineering',
  interests: ['Design', 'Badminton', 'Coffee', 'Study buddy'],
};

const privacy = { enabled: false, scope: 'sameActivity', duration: 60, precision: 'place' };

const people = [
  { id: 'u-george', name: 'George', avatar: '🦊', status: 'Design thinking all day', placeId: 'main-library' },
  { id: 'u-saber', name: 'Saber', avatar: '🐼', status: 'Looking for a study buddy', placeId: 'chi-wah' },
  { id: 'u-dan', name: 'Dan King', avatar: '🐯', status: 'Badminton after class?', placeId: 'flora-ho' },
  { id: 'u-cayla', name: 'Cayla', avatar: '🐸', status: 'Coffee break', placeId: 'main-building' },
];

const places = [
  { id: 'main-library', name: 'Main Library', short: 'Library', emoji: '📚', x: 55, y: 36, description: 'A central study and research space with quiet floors and group-study areas.', status: 'Moderately busy', people: 12, tags: ['Study', 'Quiet', 'Printing'] },
  { id: 'chi-wah', name: 'Chi Wah Learning Commons', short: 'Chi Wah', emoji: '💻', x: 36, y: 52, description: 'Flexible learning space for collaboration, computing and project work.', status: 'Seats available', people: 18, tags: ['Group work', 'Computers', '24-hour zone'] },
  { id: 'main-building', name: 'Main Building', short: 'Main', emoji: '🏛️', x: 70, y: 61, description: 'Historic campus landmark and meeting point.', status: 'Open', people: 7, tags: ['Landmark', 'Meeting point'] },
  { id: 'flora-ho', name: 'Flora Ho Sports Centre', short: 'Sports', emoji: '🏸', x: 22, y: 72, description: 'Sports facilities and a popular place to meet for activities.', status: 'Courts busy', people: 9, tags: ['Sports', 'Badminton', 'Fitness'] },
];

const conversations = [
  { id: 'dm-george', title: 'George', avatar: '🦊', preview: 'I am around the corner from your place.', unread: 5, type: 'dm' },
  { id: 'dm-saber', title: 'Saber', avatar: '🐼', preview: 'Great, thanks so much!', unread: 2, type: 'dm' },
  { id: 'group-tennis', title: 'HKU Tennis Club', avatar: '🎾', preview: 'See you at 5 PM.', unread: 3, type: 'group' },
  { id: 'place-library', title: 'Main Library discussion', avatar: '📚', preview: 'Any seats on Level 3?', unread: 0, type: 'place' },
];

const messages = {
  'dm-george': [
    { id: 'm1', from: 'them', text: 'I am around the corner from your place.', time: '10:10' },
    { id: 'm2', from: 'me', text: 'Awesome, thanks for letting me know!', time: '10:11' },
    { id: 'm3', from: 'them', text: 'No problem. I will be there in about 15 minutes.', time: '10:11' },
  ],
  'group-tennis': [
    { id: 'g1', from: 'them', author: 'Adela', text: 'Court 2 is booked for 5 PM.', time: '09:30' },
    { id: 'g2', from: 'me', text: 'Great, see everyone there.', time: '09:33' },
  ],
  'place-library': [
    { id: 'p1', from: 'them', author: 'Cayla', text: 'Level 3 has a few open desks.', time: '14:20' },
  ],
};

const groups = [
  { id: 'g-tennis', name: 'HKU Tennis Club', avatar: '🎾', members: 19, description: 'Friendly games, training and tournament meetups.', joined: true, conversationId: 'group-tennis' },
  { id: 'g-study', name: 'COMP7506 Study Crew', avatar: '💡', members: 8, description: 'Weekly study sessions and project support.', joined: true, conversationId: 'place-library' },
  { id: 'g-food', name: 'Food only!', avatar: '🍜', members: 7, description: 'Find people for quick meals near campus.', joined: false, conversationId: 'group-food' },
];

const activities = [
  { id: 'a-badminton', title: 'Evening badminton', emoji: '🏸', place: 'Flora Ho Sports Centre', time: 'Today 18:30', seats: 3, joined: false, description: 'Casual doubles. Beginners are welcome.' },
  { id: 'a-study', title: 'COMP7506 project study', emoji: '📖', place: 'Chi Wah Learning Commons', time: 'Tomorrow 14:00', seats: 5, joined: true, description: 'Review requirements and prepare the group demo.' },
  { id: 'a-coffee', title: 'Coffee and new friends', emoji: '☕', place: 'Main Building', time: 'Friday 16:00', seats: 4, joined: false, description: 'A short, low-pressure meetup for new students.' },
];

const notifications = [
  { id: 'n1', title: 'Activity reminder', body: 'COMP7506 project study starts tomorrow at 14:00.', icon: '⏰', unread: true, target: '/pages/activity-detail/index?id=a-study' },
  { id: 'n2', title: 'Campus update', body: 'Main Library is moderately busy.', icon: '📚', unread: true, target: '/pages/place-detail/index?id=main-library' },
  { id: 'n3', title: 'Group message', body: 'HKU Tennis Club posted a new message.', icon: '🎾', unread: false, target: '/pages/chat/index?id=group-tennis&title=HKU%20Tennis%20Club' },
  { id: 'n4', title: 'Location sharing ended', body: 'Your one-hour location-sharing session has expired.', icon: '🔒', unread: false, target: '/pages/privacy/index' },
];

const posts = [
  { id: 'post1', author: 'Cayla', avatar: '🐸', title: 'Quiet study spots?', text: 'Chi Wah has open tables near the windows.', emoji: '📖', place: 'Chi Wah', likes: 20 },
  { id: 'post2', author: 'Dan King', avatar: '🐯', title: 'Badminton tonight', text: 'One more player needed for casual doubles.', emoji: '🏸', place: 'Flora Ho', likes: 12 },
  { id: 'post3', author: 'Saber', avatar: '🐼', title: 'Coffee break', text: 'Anyone around Main Building?', emoji: '☕', place: 'Main Building', likes: 8 },
];

module.exports = { currentUser, privacy, people, places, conversations, messages, groups, activities, notifications, posts };
