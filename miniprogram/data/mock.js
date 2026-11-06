const AVATAR_SHEET = '/images/avatars/students.svg';

const currentUser = {
  id: 'user-me', nickname: 'Maus', handle: '@maus_hku', avatar: '/images/avatars/saber.svg', avatarPosition: 'avatar-1',
  bio: 'Design, badminton and late-night study sessions.', faculty: 'Faculty of Engineering',
  interests: ['Design', 'Badminton', 'Coffee', 'Study buddy'],
};

const privacy = { enabled: false, scope: 'sameActivity', duration: 60, precision: 'place', mutualDistance: false };

const people = [
  { id: 'u-george', name: 'George', avatar: '/images/avatars/george.svg', avatarPosition: 'avatar-2', status: 'Design thinking all day', placeId: 'main-library', conversationId: 'dm-george' },
  { id: 'u-saber', name: 'Saber', avatar: '/images/avatars/saber.svg', avatarPosition: 'avatar-1', status: 'Looking for a study buddy', placeId: 'chi-wah', conversationId: 'dm-saber' },
  { id: 'u-dan', name: 'Dan King', avatar: '/images/avatars/dan.svg', avatarPosition: 'avatar-3', status: 'Badminton after class?', placeId: 'flora-ho', conversationId: 'dm-dan' },
  { id: 'u-cayla', name: 'Cayla', avatar: '/images/avatars/cayla.svg', avatarPosition: 'avatar-4', status: 'Coffee break', placeId: 'main-building', conversationId: 'dm-cayla' },
];

// Source coordinates remain WGS-84; pages convert them to GCJ-02 for WeChat's map.
const places = [
  { id: 'main-library', name: 'Main Library', short: 'Library', emoji: '📚', latitude: 22.283236, longitude: 114.137743, address: 'Main Library, The University of Hong Kong, Pok Fu Lam', description: 'A central study and research space with quiet floors and group-study areas.', status: 'Moderately busy', people: 12, tags: ['Study', 'Quiet', 'Printing'] },
  { id: 'chi-wah', name: 'Chi Wah Learning Commons', short: 'Chi Wah', emoji: '💻', latitude: 22.2835196, longitude: 114.1347217, address: 'Centennial Campus, The University of Hong Kong, Pok Fu Lam', description: 'Flexible learning space for collaboration, computing and project work.', status: 'Seats available', people: 18, tags: ['Group work', 'Computers', '24-hour zone'] },
  { id: 'main-building', name: 'Main Building', short: 'Main', emoji: '🏛️', latitude: 22.2840174, longitude: 114.1378437, address: 'Main Building, The University of Hong Kong, Pok Fu Lam', description: 'Historic campus landmark and meeting point.', status: 'Open', people: 7, tags: ['Landmark', 'Meeting point'] },
  { id: 'flora-ho', name: 'Flora Ho Sports Centre', short: 'Sports', emoji: '🏸', latitude: 22.2806444, longitude: 114.1311903, address: 'Flora Ho Sports Centre, 111-113 Pok Fu Lam Road', description: 'Sports facilities and a popular place to meet for activities.', status: 'Courts busy', people: 9, tags: ['Sports', 'Badminton', 'Fitness'] },
];

// Building centroids are sourced from OpenStreetMap's HKU campus geometry
// (WGS-84). Short labels follow the official HKU campus-map abbreviations.
const additionalPlaces = [
  { id: 'library-extension', name: 'Library Extension', short: 'LE', category: 'Learning', emoji: 'LE', latitude: 22.2833994, longitude: 114.1377832, address: 'Library Extension, HKU Main Campus', description: 'Teaching rooms and study spaces beside the Main Library.', status: 'Open', people: 6, tags: ['Study', 'Teaching', 'Library'] },
  { id: 'knowles-building', name: 'Knowles Building', short: 'KB', category: 'Learning', emoji: 'KB', latitude: 22.2832509, longitude: 114.1384217, address: 'Knowles Building, HKU Main Campus', description: 'A central teaching building and common meeting point near the library.', status: 'Open', people: 11, tags: ['Classrooms', 'Meeting point'] },
  { id: 'kk-leung', name: 'K.K. Leung Building', short: 'KK', category: 'Learning', emoji: 'KK', latitude: 22.2832968, longitude: 114.1390145, address: 'K.K. Leung Building, HKU Main Campus', description: 'Teaching rooms, offices and student learning spaces.', status: 'Open', people: 8, tags: ['Classrooms', 'Study'] },
  { id: 'runme-shaw', name: 'Runme Shaw Building', short: 'RM', category: 'Main campus', emoji: 'RM', latitude: 22.2825062, longitude: 114.1385804, address: 'Runme Shaw Building, HKU Main Campus', description: 'A teaching and research building on the upper main campus.', status: 'Open', people: 5, tags: ['Teaching', 'Research'] },
  { id: 'run-run-shaw-building', name: 'Run Run Shaw Building', short: 'RR', category: 'Main campus', emoji: 'RR', latitude: 22.2825265, longitude: 114.1380907, address: 'Run Run Shaw Building, HKU Main Campus', description: 'Science teaching and research space near Rayson Huang Theatre.', status: 'Open', people: 6, tags: ['Science', 'Teaching'] },
  { id: 'rayson-huang', name: 'Rayson Huang Theatre', short: 'RHT', category: 'Main campus', emoji: 'RHT', latitude: 22.2825158, longitude: 114.1383461, address: 'Rayson Huang Theatre, HKU Main Campus', description: 'A major lecture theatre used for classes, talks and campus events.', status: 'Check schedule', people: 10, tags: ['Lectures', 'Events'] },
  { id: 'eliot-hall', name: 'Eliot Hall', short: 'EH', category: 'Main campus', emoji: 'EH', latitude: 22.2825462, longitude: 114.1396905, address: 'Eliot Hall, HKU Main Campus', description: 'A heritage hall on the eastern side of the main campus.', status: 'Open', people: 3, tags: ['Heritage', 'Hall'] },
  { id: 'tt-tsui', name: 'T.T. Tsui Building', short: 'TT', category: 'Main campus', emoji: 'TT', latitude: 22.2839193, longitude: 114.1393865, address: 'T.T. Tsui Building, HKU Main Campus', description: 'Teaching and administrative space near Bonham Road.', status: 'Open', people: 5, tags: ['Teaching', 'Offices'] },
  { id: 'kadoorie-science', name: 'Kadoorie Biological Sciences Building', short: 'KBS', category: 'Science', emoji: 'KBS', latitude: 22.2834809, longitude: 114.1370944, address: 'Kadoorie Biological Sciences Building, HKU Main Campus', description: 'Laboratories and teaching facilities for biological sciences.', status: 'Open', people: 8, tags: ['Science', 'Laboratories'] },
  { id: 'james-lee-science', name: 'James Hsioung Lee Science Building', short: 'JL', category: 'Science', emoji: 'JL', latitude: 22.2825604, longitude: 114.1374217, address: 'James Hsioung Lee Science Building, HKU Main Campus', description: 'Science laboratories, teaching rooms and the geological museum.', status: 'Open', people: 7, tags: ['Science', 'Museum'] },
  { id: 'hui-oi-chow', name: 'Hui Oi Chow Science Building', short: 'HC', category: 'Science', emoji: 'HC', latitude: 22.2828281, longitude: 114.1377040, address: 'Hui Oi Chow Science Building, HKU Main Campus', description: 'Science teaching and research facilities near the library.', status: 'Open', people: 6, tags: ['Science', 'Laboratories'] },
  { id: 'cym-chemistry', name: 'Chong Yuet Ming Chemistry Building', short: 'CYC', category: 'Science', emoji: 'CYC', latitude: 22.2829493, longitude: 114.1400112, address: 'Chong Yuet Ming Chemistry Building, HKU Main Campus', description: 'Chemistry laboratories and teaching rooms.', status: 'Open', people: 5, tags: ['Chemistry', 'Laboratories'] },
  { id: 'cym-physics', name: 'Chong Yuet Ming Physics Building', short: 'CYP', category: 'Science', emoji: 'CYP', latitude: 22.2831531, longitude: 114.1398407, address: 'Chong Yuet Ming Physics Building, HKU Main Campus', description: 'Physics teaching rooms and research laboratories.', status: 'Open', people: 5, tags: ['Physics', 'Laboratories'] },
  { id: 'meng-wah', name: 'Meng Wah Complex', short: 'MW', category: 'Science', emoji: 'MW', latitude: 22.2823734, longitude: 114.1391622, address: 'Meng Wah Complex, HKU Main Campus', description: 'A multi-purpose teaching complex on the upper campus.', status: 'Open', people: 9, tags: ['Teaching', 'Lecture rooms'] },
  { id: 'chow-yei-ching', name: 'Chow Yei Ching Building', short: 'CB', category: 'Centennial', emoji: 'CB', latitude: 22.2830786, longitude: 114.1354755, address: 'Chow Yei Ching Building, HKU', description: 'Teaching and student facilities connecting the main and Centennial campuses.', status: 'Open', people: 10, tags: ['Teaching', 'Campus link'] },
  { id: 'haking-wong', name: 'Haking Wong Building', short: 'HW', category: 'Centennial', emoji: 'HW', latitude: 22.2829637, longitude: 114.1364628, address: 'Haking Wong Building, HKU', description: 'A key campus access and teaching building near the MTR exit.', status: 'Open', people: 13, tags: ['Access', 'Teaching'] },
  { id: 'jockey-club-tower', name: 'The Jockey Club Tower', short: 'JCT', category: 'Centennial', emoji: 'JCT', latitude: 22.2832308, longitude: 114.1347222, address: 'The Jockey Club Tower, Centennial Campus, HKU', description: 'A Centennial Campus tower housing teaching and faculty facilities.', status: 'Open', people: 16, tags: ['Centennial', 'Classrooms'] },
  { id: 'cheng-yu-tung-tower', name: 'Cheng Yu Tung Tower', short: 'CCT', category: 'Centennial', emoji: 'CCT', latitude: 22.2832970, longitude: 114.1337802, address: 'Cheng Yu Tung Tower, Centennial Campus, HKU', description: 'Law teaching, library and faculty facilities.', status: 'Open', people: 14, tags: ['Law', 'Centennial'] },
  { id: 'run-run-shaw-tower', name: 'Run Run Shaw Tower', short: 'RST', category: 'Centennial', emoji: 'RST', latitude: 22.2837028, longitude: 114.1345016, address: 'Run Run Shaw Tower, Centennial Campus, HKU', description: 'Teaching spaces and the Music Library in the Centennial Campus.', status: 'Open', people: 12, tags: ['Centennial', 'Music Library'] },
  { id: 'central-podium', name: 'Central Podium Levels', short: 'CPD', category: 'Centennial', emoji: 'CPD', latitude: 22.2834053, longitude: 114.1343029, address: 'Central Podium Levels, Centennial Campus, HKU', description: 'The central circulation and classroom levels connecting Centennial Campus towers.', status: 'Open', people: 20, tags: ['Classrooms', 'Campus link'] },
];

const campusPlaces = [...places, ...additionalPlaces];

const conversations = [
  { id: 'dm-george', title: 'George', avatar: '/images/avatars/george.svg', avatarPosition: 'avatar-2', preview: 'I am around the corner from your place.', unread: 5, type: 'dm' },
  { id: 'dm-saber', title: 'Saber', avatar: '/images/avatars/saber.svg', avatarPosition: 'avatar-1', preview: 'Great, thanks so much!', unread: 2, type: 'dm' },
  { id: 'group-tennis', title: 'HKU Tennis Club', avatar: '/images/avatars/dan.svg', avatarPosition: 'avatar-3', preview: 'See you at 5 PM.', unread: 3, type: 'group' },
  { id: 'place-library', title: 'Main Library discussion', avatar: '/images/avatars/cayla.svg', avatarPosition: 'avatar-4', preview: 'Any seats on Level 3?', unread: 0, type: 'place' },
];

const messages = {
  'dm-george': [
      { id: 'm1', from: 'them', author: 'George', avatar: '/images/avatars/george.svg', avatarPosition: 'avatar-2', text: 'I am around the corner from your place.', time: '10:10' },
    { id: 'm2', from: 'me', text: 'Awesome, thanks for letting me know!', time: '10:11' },
      { id: 'm3', from: 'them', author: 'George', avatar: '/images/avatars/george.svg', avatarPosition: 'avatar-2', text: 'No problem. I will be there in about 15 minutes.', time: '10:11' },
  ],
    'dm-saber': [{ id: 's1', from: 'them', author: 'Saber', avatar: '/images/avatars/saber.svg', avatarPosition: 'avatar-1', text: 'Great, thanks so much!', time: '12:04' }],
  'group-tennis': [
      { id: 'g1', from: 'them', author: 'Adela', avatar: '/images/avatars/cayla.svg', avatarPosition: 'avatar-4', text: 'Court 2 is booked for 5 PM.', time: '09:30' },
    { id: 'g2', from: 'me', text: 'Great, see everyone there.', time: '09:33' },
  ],
    'place-library': [{ id: 'p1', from: 'them', author: 'Cayla', avatar: '/images/avatars/cayla.svg', avatarPosition: 'avatar-4', text: 'Level 3 has a few open desks.', time: '14:20' }],
};

const groups = [
  { id: 'g-tennis', name: 'HKU Tennis Club', avatar: '🎾', members: 19, description: 'Friendly games, training and tournament meetups.', joined: true, conversationId: 'group-tennis' },
  { id: 'g-study', name: 'COMP7506 Study Crew', avatar: '📚', members: 8, description: 'Weekly study sessions and project support.', joined: true, conversationId: 'place-library' },
  { id: 'g-food', name: 'Food only!', avatar: '🍜', members: 7, description: 'Find people for quick meals near campus.', joined: false, conversationId: 'group-food' },
];

const activities = [
  { id: 'a-badminton', title: 'Evening badminton', emoji: '🏸', place: 'Flora Ho Sports Centre', time: 'Today 18:30', seats: 3, joined: false, description: 'Casual doubles. Beginners are welcome.' },
  { id: 'a-study', title: 'COMP7506 project study', emoji: '💻', place: 'Chi Wah Learning Commons', time: 'Tomorrow 14:00', seats: 5, joined: true, description: 'Review requirements and prepare the group demo.' },
  { id: 'a-coffee', title: 'Coffee and new friends', emoji: '☕', place: 'Main Building', time: 'Friday 16:00', seats: 4, joined: false, description: 'A short, low-pressure meetup for new students.' },
];

const notifications = [
  { id: 'n1', title: 'Activity reminder', body: 'COMP7506 project study starts tomorrow at 14:00.', icon: '📅', unread: true, target: '/pages/activity-detail/index?id=a-study' },
  { id: 'n2', title: 'Campus update', body: 'Main Library is moderately busy.', icon: '📚', unread: true, target: '/pages/place-detail/index?id=main-library' },
  { id: 'n3', title: 'Group message', body: 'HKU Tennis Club posted a new message.', icon: '💬', unread: false, target: '/pages/chat/index?id=group-tennis&title=HKU%20Tennis%20Club' },
  { id: 'n4', title: 'Location sharing ended', body: 'Your one-hour location-sharing session has expired.', icon: '🔒', unread: false, target: '/pages/privacy/index' },
];

const posts = [
  { id: 'post1', author: 'Cayla', avatar: AVATAR_SHEET, avatarPosition: 'avatar-4', title: 'Quiet study spots?', text: 'Chi Wah has open tables near the windows.', emoji: '📚', place: 'Chi Wah', likes: 20 },
  { id: 'post2', author: 'Dan King', avatar: AVATAR_SHEET, avatarPosition: 'avatar-3', title: 'Badminton tonight', text: 'One more player needed for casual doubles.', emoji: '🏸', place: 'Flora Ho', likes: 12 },
  { id: 'post3', author: 'Saber', avatar: AVATAR_SHEET, avatarPosition: 'avatar-1', title: 'Coffee break', text: 'Anyone around Main Building?', emoji: '☕', place: 'Main Building', likes: 8 },
];

module.exports = { AVATAR_SHEET, currentUser, privacy, people, places: campusPlaces, conversations, messages, groups, activities, notifications, posts };
