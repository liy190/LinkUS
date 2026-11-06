const config = require('./config/index');
const api = require('./services/api');

App({
  onLaunch() {
    this.globalData = { config, user: null };
    if (wx.cloud && config.cloudEnvId) {
      wx.cloud.init({ env: config.cloudEnvId, traceUser: true });
    }
  },
  ensureUser() {
    if (!this.userPromise) {
      this.userPromise = api.bootstrap().then((result) => {
        this.globalData.user = result.user;
        return result.user;
      }).catch((error) => {
        this.userPromise = null;
        throw error;
      });
    }
    return this.userPromise;
  },
});
