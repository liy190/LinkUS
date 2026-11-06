Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      { pagePath: '/pages/map/index', text: 'Map', kind: 'map' },
      { pagePath: '/pages/chats/index', text: 'Chats', kind: 'chat' },
      { pagePath: '/pages/groups/index', text: 'Groups', kind: 'groups' },
      { pagePath: '/pages/discover/index', text: 'Discover', kind: 'discover' },
      { pagePath: '/pages/notifications/index', text: 'Notification', kind: 'notice' },
    ],
  },
  methods: {
    switchTab(e) { wx.switchTab({ url: e.currentTarget.dataset.path }); },
  },
});
