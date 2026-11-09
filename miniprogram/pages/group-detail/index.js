const api = require('../../services/api');
const mock = require('../../data/mock');

const MAX_MEMBERS_SHOWN = 6;

Page({
  data: { group: {}, members: [], moreMembers: 0, loading: true },
  onLoad(options) { this.id = options.id; this.load(); },
  load() {
    this.setData({ loading: true });
    return api.listGroups().then((groups) => {
      const group = groups.find((item) => item.id === this.id) || groups[0];
      if (!group) return;
      this.setData({ group });
      wx.setNavigationBarTitle({ title: group.name });
      this.buildMembers(group);
    }).catch((error) => {
      console.warn('group detail load failed', error);
      wx.showToast({ title: 'Unable to load group', icon: 'none' });
    }).finally(() => this.setData({ loading: false }));
  },
  // 成员头像只来自云端群文档；没有就只显示人数，不再用演示人物填充
  buildMembers(group) {
    const roster = Array.isArray(group.memberProfiles) ? group.memberProfiles : [];
    const members = roster.slice(0, MAX_MEMBERS_SHOWN).map((item) => ({ name: item.name, avatar: item.avatar }));
    this.setData({ members, moreMembers: Math.max(0, (Number(group.members) || members.length) - members.length) });
  },
  join() {
    const group = this.data.group;
    const action = group.joined ? api.leaveGroup(group.id) : api.joinGroup(group.id);
    wx.showLoading({ title: group.joined ? 'Leaving' : 'Joining' });
    action.then((updated) => {
      this.setData({ group: updated });
      this.buildMembers(updated);
    })
      .catch((error) => wx.showToast({ title: error.message || 'Update failed', icon: 'none' }))
      .finally(() => wx.hideLoading());
  },
  editAnnouncement() {
    const group = this.data.group;
    wx.showModal({
      title: 'Group announcement',
      editable: true,
      placeholderText: 'e.g. Court booked Friday 17:00',
      content: group.announcement || '',
      success: ({ confirm, content }) => {
        if (!confirm) return;
        api.setGroupAnnouncement(group.id, content || '')
          .then(() => {
            wx.showToast({ title: 'Announcement updated' });
            this.load();
          })
          .catch((error) => wx.showToast({ title: error.message || 'Only the owner can edit', icon: 'none' }));
      },
    });
  },
  chat() {
    const group = this.data.group;
    wx.navigateTo({ url: `/pages/chat/index?id=${group.conversationId}&title=${encodeURIComponent(group.name)}` });
  },
});
