# LinkUS backend deployment

The project is configured for CloudBase environment `cloud1-d2ggrwa212d80dc1d`.

## 1 Deploy the cloud functions

In WeChat Developer Tools, select the environment above. Right-click each directory and choose **Upload and deploy: cloud install dependencies**:

1. `cloudfunctions/setupLinkUS`
2. `cloudfunctions/linkusApi`
3. `cloudfunctions/locationSync`

Do not place the Mini Program AppSecret in the repository. Cloud functions obtain the current user's OpenID from the trusted WeChat execution context.

## 2 Initialize the database

After deploying `setupLinkUS`, run this once from the Developer Tools console while the Mini Program is open:

```js
wx.cloud.callFunction({ name: 'setupLinkUS' }).then(console.log)
```

The result should contain `ok: true`. The initializer creates:

- `users`
- `conversations`
- `messages`
- `groups`
- `activities`
- `notifications`
- `feedback`
- `sharedLocations`

It also creates three starter groups and three starter activities when those collections are empty.

After the command succeeds, delete or undeploy `setupLinkUS`. It is only an initializer and is not required by the running Mini Program.

## 3 Configure database permissions

All business writes go through cloud functions. Set these collections to **no direct client write**:

- `users`
- `conversations`
- `groups`
- `activities`
- `notifications`
- `feedback`
- `sharedLocations`

For those collections, use rules equivalent to:

```json
{
  "read": false,
  "write": false
}
```

For `messages`, keep both direct client read and write disabled:

```json
{
  "read": false,
  "write": false
}
```

The chat page uses secure three-second polling through `linkusApi`. This prevents internal membership identifiers from being exposed by direct database document reads.

## 4 Create indexes

Create the following indexes in the CloudBase database console:

| Collection | Fields |
| --- | --- |
| `users` | `userId` ascending |
| `conversations` | `memberOpenIds` array, `lastAt` descending |
| `messages` | `conversationId` ascending, `createdAt` descending |
| `groups` | `createdAt` descending |
| `activities` | `createdAt` descending |
| `notifications` | `recipientOpenId` ascending, `createdAt` descending |
| `notifications` | `recipientOpenId` ascending, `unread` ascending |
| `sharedLocations` | `expiresAt` ascending |

CloudBase will also show a link to create a missing index if a query requires one.

## 5 Configure cloud storage

Allow authenticated users to upload their own profile image. Public read access is acceptable for profile avatars used in social screens; write access must require an authenticated WeChat identity. Keep uploads under the `avatars/` prefix and do not allow anonymous writes.

## 6 Configure the privacy declaration

In the WeChat Mini Program administration portal, declare the use of:

- nickname and avatar
- precise or place-level location
- selected images
- user-generated chat and profile content

Location sharing remains off by default, expires automatically, and can be revoked from the privacy page.

## 7 Test with two accounts

Add two WeChat accounts as experience members and verify:

1. both accounts create different LinkUS user IDs;
2. each account can choose a nickname and avatar;
3. one account can start a direct conversation with the other;
4. messages appear on both devices;
5. group join and leave changes chat access;
6. activity join and leave updates available seats;
7. location sharing disappears after revocation or expiry;
8. notifications can be marked as read.

## Data boundary

The client never receives OpenID. Public user references use a one-way derived LinkUS user ID. Chat membership, group membership, activity capacity, notifications and location expiry are validated in cloud functions.
