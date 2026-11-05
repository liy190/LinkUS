# LinkUS

LinkUS is a native WeChat Mini Program prototype for student life and social discovery at **The University of Hong Kong (HKU)**.

## Run locally

1. Open WeChat DevTools and import this repository root.
2. Keep the AppID already configured in `project.config.json`, or replace it with your team AppID.
3. Click **Compile**. The project runs with local mock data by default and does not require cloud services.
4. Click **Preview** to scan the QR code on a phone added as a project member.

## Cloud mode

Create a WeChat Cloud Development environment, set its ID in `miniprogram/config/index.js`, deploy the cloud functions, and set `useMockData` to `false` when the real data layer is connected.

## Collaboration

Use one feature branch per task, for example `feature/chat`, and merge through pull requests. Never commit `project.private.config.json` or secrets.

## Privacy

Location sharing is off by default. The UI only exposes place-level sharing with a time limit and an explicit revoke action.
