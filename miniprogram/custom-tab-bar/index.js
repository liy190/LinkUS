Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/map/index', text: 'Map', icon: '⌖' },
      { pagePath: '/pages/chats/index', text: 'Chats', icon: '●' },
      { pagePath: '/pages/groups/index', text: 'Groups', icon: '♧' },
      { pagePath: '/pages/discover/index', text: 'Discover', icon: '◉' },
      { pagePath: '/pages/notifications/index', text: 'Notices', icon: '♢' },
    ],
  },
  methods: {
    switchTab(e) { wx.switchTab({ url: e.currentTarget.dataset.path }); },
  },
});
