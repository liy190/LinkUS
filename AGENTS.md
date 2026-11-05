# LinkUS project guidance

- Build a native WeChat Mini Program with JavaScript, WXML and WXSS.
- Keep pages grouped by feature under `miniprogram/pages`.
- Shared mock data lives in `miniprogram/data/mock.js`.
- Local demo persistence goes through `miniprogram/services/store.js`.
- Cloud functions own sensitive writes and third-party API keys.
- Never commit `project.private.config.json`, AppSecret, API keys or user data.
- Location sharing must be off by default, time-limited and revocable.
- Preserve the main demo flow: welcome -> map/place -> chat/group/activity -> notification.
- Feature branches use `feat/<area>` and merge through pull requests.

