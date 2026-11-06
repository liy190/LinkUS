# LinkUS

LinkUS is a native WeChat Mini Program prototype for student life and social discovery at **The University of Hong Kong (HKU)**.

## Run locally

1. Open WeChat DevTools and import this repository root.
2. Keep the AppID already configured in `project.config.json`, or replace it with your team AppID.
3. Click **Compile**. The project uses the configured CloudBase environment and safely falls back to local demo data while cloud functions are not yet deployed.
4. Click **Preview** to scan the QR code on a phone added as a project member.

## Cloud mode

The project is configured for environment `cloud1-d2ggrwa212d80dc1d`. Deploy `setupLinkUS`, `linkusApi`, and `locationSync`, then follow `BACKEND_SETUP.md` to initialize collections, permissions and indexes.

The cloud backend provides real WeChat identity login, user profiles, direct and group chat, place discussions, groups, activities, notifications, feedback, avatar storage and expiring location sharing.

### Location backend contract

Pages never call Cloud Development directly. They use `miniprogram/services/location.js`, which exposes:

- `getCurrentLocation()` — obtains the current device position in GCJ-02.
- `publish(location, privacy, profile, places)` — publishes an expiring, user-authorized location.
- `list()` — returns non-expired locations the current user is allowed to see.
- `revoke()` — immediately removes the current user's shared location.

The default adapter calls the `locationSync` cloud function. To move to a REST or GraphQL backend later, replace only the private `request()` function in that service. The page data shape and UI do not need to change.

HKU source coordinates are stored in WGS-84 and converted at runtime by `miniprogram/utils/geo.js`, because the WeChat native map and `wx.getLocation({ type: 'gcj02' })` use GCJ-02.

## Collaboration

Use one feature branch per task, for example `feat/chat`, and merge through pull requests. Never commit `project.private.config.json` or secrets.

For the current feature inventory, first-time setup, team workflow, suggested next tasks and the two-account acceptance checklist, see [TEAM_GUIDE.md](TEAM_GUIDE.md).

## Privacy

Location sharing is off by default, time-limited and revocable. Place-level precision is the default. Exact precision is accepted only for the same activity/group scope; campus-wide records are forced back to place-level precision. The initial cloud function safely lists only campus-wide, place-level records until a production membership resolver is connected.

Mutual precise distance is handled only inside `locationSync`: an exact distance is returned only when both users have opted in and both records contain valid coordinates. Otherwise the client receives only a fuzzy label such as “same place”, “about 300 m” or “within 1 km”; another user's precise coordinates are never returned.
