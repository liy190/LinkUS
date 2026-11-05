const config = require('./config/index');

App({
  onLaunch() {
    this.globalData = { config };
    if (wx.cloud && config.cloudEnvId) {
      wx.cloud.init({ env: config.cloudEnvId, traceUser: true });
    }
  },
});
