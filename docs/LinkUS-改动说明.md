# LinkUS 改动说明（四轮改动汇总）

- 分支：`main` @ `fbc3219`，改动在本地，提交前
- 统计：**110 个文件变更**（46 删除 / 55 修改 / 9 新增）
- 页面：18 → **24 个**；主包体积：**1.83 MB → 0.72 MB**
- 回归：静态检查 **12/12**；契约用例 **22/22**
- 云端部署状态：14 个集合齐备，`linkusApi` build `linkus-api-2026-11-09`（47 个 action）

```
fbc3219 (baseline, 与 origin/main 一致)
  └─ 工作区改动
     ├─ 第一轮：本地演示加固（P0/P1/P2，见第一章）
     ├─ 第二轮：功能补齐（8 个问题 + 12 类补充，见第八章）
     ├─ 第三轮：移除本地降级（见第十四章）
     └─ 第四轮：部署自检与错误诊断（见第十九章）
```

---

## 一、P0：会当场露馅的 7 项

| # | 问题 | 改法 | 文件 | 行为变化 |
|---|---|---|---|---|
| 1 | 点「全部已读」没反应（离线时只 `return {ok:true}`） | 两个 fallback 里写回 `store.saveNotifications` | `services/api.js` | 点一下角标立即清零，杀掉小程序再进仍是已读 |
| 2 | 未读红点永不消失 | 新增 `markConversationRead()`，打开会话即清零并落本地；`store` 增加 `conversations` 键 | `services/api.js`、`services/store.js`、`pages/chats/index.js` | 进入会话返回后红点消失，重进仍消失 |
| 3 | 三处写死时间（`JULY 21 AT 14:14` / `22:20 09/05` / `9:45 07/13`） | 新增 `formatConversationTime / formatRelative / formatChatDate`；数据补 `updatedAt`、`createdAt` | `utils/time.js`、`data/mock.js`、`pages/chat|chats|notifications` | 显示「Just now / 12 min ago / 3 h ago / Nov 9」，会话列表与通知列表各不相同 |
| 4 | 所有地点讨论塌缩成同一个会话 | 离线分支 id 改为 `place-${placeId}`，不再硬编码 `place-library` | `services/api.js` | Chi Wah 的讨论里不再出现图书馆的旧消息；新地点是空会话并提示「No messages yet」 |
| 5 | 个人页写死 Following 876 / Followers 66 / 「Parachuting 35 min ago」 | 换成真实的 `faculty` + 兴趣标签；假动态换成空状态 | `pages/profile/index.wxml|wxss` | 页面内容全部来自 `store.getProfile()`，没有编造数字 |
| 6 | 模板残留 1495 行 + 31 张只被废弃页引用的图 | 删除 `pages/example`、`pages/index`、`components/cloudTipModal`、`envList.js`、`cloudfunctions/quickstartFunctions` 及无引用图片 | 46 个删除 | 包体积 −1.15 MB；`app.json` 未注册目录归零 |
| 7 | 活动列表慢网白屏 | 补 loading / empty 两态 | `pages/activities/index.wxml|wxss` | 加载时显示「Loading activities…」，空列表显示引导文案 |

## 二、P1：一眼能看出但能绕过去的 6 项

| # | 问题 | 改法 | 文件 | 行为变化 |
|---|---|---|---|---|
| 8 | 三个页面的搜索框是装饰品 | 换成真 `<input>`，本地按标题/描述过滤，带清空按钮和「无匹配」空态 | `pages/chats|groups|notifications`（wxml/js/wxss） | 输入即过滤，`×` 一键清空 |
| 9 | Discover 的 Listen / Live 名不副实 | 收敛为三项：Activities / Nearby people / Feedback | `pages/discover/index.wxml` | 每一行都去到它字面描述的页面 |
| 10 | 冷启动每次都要重走欢迎页→登录 | `welcome.enter()` 检测 `profileComplete`，已完成资料直接 `switchTab` 到地图 | `pages/welcome/index.js` | 老用户冷启动 1 次点击进地图（首次仍需走登录/资料） |
| 11 | 定位被拒只弹一次 toast | 新增 `locationApi.promptPermission()`：说明用途 + 「Open settings」跳 `wx.openSetting` | `services/location.js`、`pages/map`、`pages/place-detail` | 拒绝后可以一键去设置页改权限，不用自己翻 |
| 12 | 群详情只有成员数 | 增加成员列表（最多 6 个 + 「+N more members」）；`buildMembers()` 在有 `memberProfiles` 时用真数据 | `pages/group-detail`（js/wxml/wxss） | 群详情有头像+名字，不再是光秃秃一个数字 |
| 13 | 没有兴趣编辑入口 | 资料页加 10 个兴趣 chip，可多选，随资料一起保存 | `pages/profile-edit`（js/wxml/wxss） | 保存后个人页立即显示兴趣标签 |

## 三、P2：体验打磨与工程卫生 6 项

| # | 问题 | 改法 | 文件 | 行为变化 |
|---|---|---|---|---|
| 14 | 轮询 3 秒、`watchMessages` 直接返回 null | `watchMessages()` 改为本地监听器（1.5s 轮询 + 变化检测，返回 `{close}`），聊天页统一走它 | `services/api.js`、`pages/chat/index.js` | 对方回消息 1.5s 内出现；接口形状和将来的真 `watch` 一致，换后端不用改页面 |
| 15 | 新建群聊进去是白板 | 空态文案「No messages yet. Say hello.」 | `pages/chat/index.wxml|wxss` | 空会话不再是一片空白 |
| 16 | 列表没有下拉刷新 | 4 个列表页开启 `enablePullDownRefresh` + `onPullDownRefresh` | `pages/chats|groups|notifications|activities` 的 json/js | 下拉即可刷新，不用切 tab |
| 17 | 5 处 `.catch(() => {})` 静默吞错 | 改为 `console.warn('<操作> failed', error)` | `pages/privacy`、`pages/place-detail`、`pages/profile` | 失败至少能在控制台定位，不再无声无息 |
| 18 | 地图用 emoji 当图标（`cover-view` 里机型差异大） | 新画 3 个 144×144 PNG（气泡/锁/准星），改用 `cover-image`；头像位直接复用海豚 PNG | `images/icons/tool-*.png`（新增）、`pages/map/index.wxml|wxss` | 地图工具按钮在所有机型上一致，不再依赖系统 emoji 字体 |
| 19 | 长会话看不到旧消息 | 聊天页只渲染最近 20 条，顶部「Load earlier messages」每次多加载 20 条 | `pages/chat/index.js|wxml|wxss` | 首屏更快，历史仍可按需展开 |

## 四、顺带修掉的一处语义错误

- **通知页的「+」按钮原本是「全部已读」**：现在该页 `linkus-header` 传 `showAdd="{{false}}"`，改在列表上方显式放「N unread · Mark all read」。
  （涉及 `pages/notifications/index.wxml`、`components/linkus-header` 的既有 `showAdd` 属性，未改组件本身）

---

## 五、刻意没做的事

| 项 | 原因 |
|---|---|
| 云函数新增 `markConversationRead` action | 本地目标下不需要；已在 `api.js` 注释里标出，接云时补一个 action 即可 |
| 真 `watch` 监听 | 需要云环境；现在用等价接口的本地实现顶上，页面代码将来不用改 |
| 地图 emoji → SVG | `cover-image` 对 SVG 支持不稳，改用 PNG 规避 |
| 图片消息 / 动态 / AI / 举报 / 场地状态 | 属于文档 P1/P2，超出「本地跑通不露馅」的范围 |

## 六、回滚与提交方式

改动全部留在工作区，没有提交。想复原或自行提交时：

```bash
# 查看改了什么
git status
git diff -- miniprogram/services/api.js

# 全部丢弃，回到 fbc3219 原样（含删除的文件）
git checkout -- .
git clean -fd

# 暂存以便自己提交时挑拣
git stash push -u -m "local demo polish"

# 你自己决定提交时（建议先开分支）
git checkout -b feat/local-polish
git add -A && git commit -m "feat: local demo polish"
```

## 七、验证现状

| 检查 | 结果 |
|---|---|
| JSON 可解析（34 个） | 通过 |
| JS 语法（38 个） | 通过 |
| 24 个注册页面四件套 | 齐全 |
| WXML 标签配平（26 个） | 全部配平 |
| WXML 图片引用 | 全部命中 |
| 客户端 45 个 action ↔ 云函数 | 全部有实现 |
| 功能用例 36 条 | 36 通过 |
| 主包体积 | 0.73 MB / 2 MB |

真机与云端联调仍未覆盖（云环境未部署），这一点和改动前一致。

---

# 第二轮：功能补齐（2026-11-09）

针对你提的 8 个问题 + 12 类补充功能。**只改小程序端与云函数逻辑，不新增第三方依赖。**

## 八、你提的 8 个问题

| # | 你提的 | 现在的处理 | 入口 |
|---|---|---|---|
| 1 | 怎么发 moment？ | 新增 Moments 页：发布文本框、三种可见性（Everyone / Followers / Only me）、点赞、删除自己的、Feed / Mine / Liked 三个 tab | Discover → Moments；个人页两个 tab |
| 2 | 铅笔与 Edit profile 功能重复 | 铅笔改成**换头像**（`chooseMedia` + 上传），下面的按钮仍然是编辑资料，两者不再重复 | 个人页头像右上角 ✎ |
| 3 | 看不到别人的主页 | 新增 `/pages/user`：头像、昵称、handle、学院、简介、兴趣、关注/粉丝数、Follow / Following 按钮、Message、Block、Report | 地图点人、附近的人、动态作者、活动发起者、关注/粉丝列表 |
| 4 | `@35d0f7aa` 是什么、能否设置 | 现在是**可设置的 handle**：编辑页输入、3–20 位字母数字下划线、统一小写、服务端查重；没设置过的老用户仍回退 `userId` 后 8 位（不再直接暴露哈希尾巴） | Edit profile → Handle |
| 5 | 爱心那一栏点了没反应 | 现在是真实的 **Liked** 入口，列出我点过赞的动态；左边图标是 **My moments** | 个人页 tab 行 |
| 6 | 三个活动是不是写死的 | 见第九章：数据补齐发起者/参与者/容量，发起者可编辑、可取消；**同时修掉了「云端为空就回落三条假活动」的静默降级** | Activities → 详情 |
| 7 | followers / likes 要留、默认 0、要能关注 | 恢复为真实计数（无数据时显示 0），支持关注/取关，点数字进入关注/粉丝列表 | 个人页 stats 行 |
| 8 | 输入框占位符上移/真机不可见 | 根因是 `.field` 只有 padding 没有高度：现在显式 `height:88rpx; line-height:88rpx`，`textarea` 用 `.field.area` 覆盖，所有输入加 `cursor-spacing="24"`，活动创建页外层换 `scroll-view` | 全局 `.field` |

## 九、活动模块（问题 6 的完整处理）

| 层 | 改动 |
|---|---|
| 数据结构 | 云端 `publicActivity` 现在返回 `capacity / memberIds / creatorId / creatorName`；`createActivity` 写入 `creatorUserId`、`creatorName`、`memberUserIds` |
| 列表 | 显示剩余名额、已报名人数、"Joined / Host" 标记 |
| 详情 | 发起者卡片（点进主页）、参与者列表（最多 6 个 + Host 徽标）、`剩余/容量`、满员时按钮变成 "Activity full" |
| 发起者 | "Edit activity"（复用创建页 `?id=`）、"Cancel this activity"（二次确认） |
| 通知 | 有人报名 → 通知发起人；取消活动 → 通知全部参与者 |
| 假数据 | `listActivities` 不再在云端返回空数组时回落三条 mock；本地无云时才用演示数据 |

## 十、新增页面（6 个）

| 页面 | 用途 | 关键交互 |
|---|---|---|
| `/pages/user` | 他人主页 | Follow / Following、Message、Block / Unblock、Report、关注与粉丝计数 |
| `/pages/follow-list` | 关注 / 粉丝列表 | 点任意一行进入该用户主页 |
| `/pages/moments` | 动态流 | 发布、可见性切换、点赞、删除、按 scope 过滤、下拉刷新 |
| `/pages/settings` | 设置中心 | 谁能私信我、关注列表可见性、三类通知开关、清除本地数据、关于、退出登录、注销账号 |
| `/pages/search` | 全局搜索 | 人 / 地点 / 活动 / 群 四类聚合结果 |
| `/pages/favorites` | 收藏地点 | 从地点详情的 ☆ 收藏，可取消 |

## 十一、数据层与云函数

**新增集合（`setupLinkUS` 已同步，部署前需要重跑一次初始化）**

| 集合 | 用途 |
|---|---|
| `follows` | 关注关系（followerUserId → targetUserId） |
| `posts` | 动态（含 likes 数组、visibility） |
| `placeStatuses` | 场地状态上报 |
| `favorites` | 收藏地点 |
| `reports` | 举报队列 |
| `blocks` | 黑名单 |

**新增云函数 action（26 个）**

| 分组 | action |
|---|---|
| 关注 | `follow`、`unfollow`、`getFollowStats`、`listFollowing`、`listFollowers` |
| 动态 | `createPost`、`listPosts`、`likePost`、`deletePost` |
| 活动 | `cancelActivity`、`updateActivity` |
| 群组 | `setGroupAnnouncement` |
| 聊天 | `markConversationRead`、`getReadState`、`recallMessage` |
| 地点 | `listFavorites`、`toggleFavorite`、`listPlaceStatuses`、`setPlaceStatus` |
| 账号 | `getUser`、`updateSettings`、`deleteAccount` |
| 安全 | `reportContent`、`blockUser`、`unblockUser` |

**本地降级**：以上全部有 `store` 兜底，没部署云也能完整跑通（关注计数、动态、收藏、状态、举报都会落本地）。

## 十二、其他补充功能与设置

| 分类 | 已做 | 未做（需要云或产品决策） |
|---|---|---|
| 账号 | 自定义 handle、换头像、退出登录、注销账号（软删除） | 换绑手机号 |
| 隐私 | 谁能私信我（3 档）、关注列表可见性、拉黑 / 取消拉黑、举报 | **云端未强制**：私信权限目前只存设置，`sendMessage` 还没按它拦截 |
| 通知 | 三类通知开关（活动/消息/系统），列表按开关过滤 | 免打扰时段、订阅消息（需要模板 ID 与用户授权） |
| 聊天 | 真实已读（单勾/双勾）、2 分钟内撤回、举报消息 | 图片/语音/位置卡片、静音 |
| 活动 | 发起者、参与者、容量、编辑、取消、报名通知 | 候补队列、签到、开始前提醒 |
| 群组 | 群公告（仅群主可改）、群主标识 | 成员管理（踢人/转让）、退出提醒 |
| 地点 | 收藏、场地状态上报与最近一条展示 | 场地状态过期清理、按热度排序 |
| 搜索 | 人/地点/活动/群聚合搜索 | 搜索历史、拼音/模糊匹配 |
| 通用 | 设置页、清除本地数据、关于与版本号 | 语言切换（当前全英文界面） |

## 十三、回归结果（第二轮）

| 检查 | 结果 |
|---|---|
| JSON 可解析（34 个） | 通过 |
| JS 语法（38 个） | 通过 |
| 页面四件套（24 个） | 齐全 |
| WXML 标签配平（26 个） | 全部配平 |
| 客户端 action ↔ 云函数 | 45 个全部有实现 |
| 功能用例 | **36 条全部通过**（新增 14 条：handle、关注、动态、设置、收藏、场地状态、活动取消、举报拉黑、好友主页、退出登录） |
| 主包体积 | 0.73 MB / 2 MB |

> 说明：36 条用例跑的是「本地降级路径」。云函数新增的 26 个 action 只做了语法与分支覆盖检查，**必须在部署后做一次真实联调**，尤其是 `follows` 唯一性、`posts` 可见性过滤、`recallMessage` 的超时判断。
>
> ⚠️ 第三轮之后，这 36 条用例已整体替换为契约用例（见第十四章），上面这行只描述第二轮当时的状态。

---

# 第三轮：移除本地降级

目标：**任何"云端失败就用本地数据顶上"的行为全部删除**。失败必须看得见，不能再出现"显示发布成功、别人却看不到"。

## 十四、改动范围

### 14.1 服务层

| 文件 | 变化 |
|---|---|
| `services/api.js` | 删除 `withFallback` 与全部 26 处兜底分支；`call()` 成为唯一出口，失败直接抛错 |
| `services/store.js` | 只保留 3 个键：`profile`（登录用户缓存）、`privacy`、`settings`；删除 messages/conversations/groups/activities/notifications/posts/follows/favorites/placeStatuses 等本地副本 |
| `data/mock.js` | 只保留 `places`（静态校园数据）、`privacy`、`settings` 默认值；删除演示人物、会话、消息、群组、活动、通知、动态 |
| `config/index.js` | 删除 `allowMockFallback` 开关，避免以后被误开 |

### 14.2 页面

| 页面 | 去掉的降级 |
|---|---|
| 地图 | 没人共享位置时不再用演示人物填充 |
| 地点详情 | "这里的人"只来自 `locationSync`；收藏状态改为读 `listFavorites` |
| 附近的人 | 不再把"所有用户"伪造成附近的人 |
| 群组 / 群详情 | 头像不再用演示人物拼贴，只用云端 `memberProfiles` |
| 设置 | 设置项先本地生效再同步云端，**同步失败会回滚并提示** |
| 聊天 / 会话 / 动态 / 活动 / 通知 | 错误提示改为显示后端返回的具体原因，不再统一吞成一句 "failed" |

## 十五、错误会以什么形式出现

| 场景 | 错误码 | 用户看到的文案 |
|---|---|---|
| 没配 `cloudEnvId` 或 `wx.cloud` 不可用 | `CLOUD_NOT_CONFIGURED` | 云开发未初始化：请检查 config/index.js 的 cloudEnvId |
| 云函数还是旧版（缺 action） | `BACKEND_OUTDATED` | 云函数版本过旧（缺少该接口），请重新部署 linkusApi |
| 环境 ID 与 appid 不匹配 | `ENV_NOT_FOUND` | 云环境不存在或与 appid 不匹配 |
| 集合没建 | `COLLECTION_MISSING` | 数据库集合缺失，请先运行 setupLinkUS |
| 断网 / 超时 | `NETWORK` | 网络不稳定，请稍后重试 |
| 业务错误（满员、无权限、handle 重复…） | 原错误码 | 对应中文/英文提示 |

## 十六、行为对照

| 操作 | 第三轮之前 | 第三轮之后 |
|---|---|---|
| 发动态，云函数旧版 | 静默存本地，界面显示成功 | 报 `云函数版本过旧，请重新部署 linkusApi` |
| 登录，云开发没配置 | 用演示用户 Maus 登录 | 报 `云开发未初始化` |
| 读会话列表，断网 | 显示 4 个演示会话 | 报 `网络不稳定，请稍后重试` |
| 群列表，云端没数据 | 4 个演示人物头像 | 空列表 + 群 emoji |

## 十七、这次必须做的事

1. **重新部署 `linkusApi`**：本轮新增了一个 `listBlocked` action，旧函数会报 `UNKNOWN_ACTION`
2. **确认 6 个新集合存在**（`follows / posts / placeStatuses / favorites / reports / blocks`）
3. 所有功能现在**必须有网络**，离线打开会看到明确的错误提示，而不是"能用的假数据"

## 十八、回归结果（第三轮）

| 检查 | 结果 |
|---|---|
| 静态检查 | 12/12 |
| 契约用例 | **20/20**（其中 5 条专测"失败必须抛错"） |
| WXML 配平 | 26 个文件全部配平 |
| 主包体积 | 0.72 MB |

契约用例覆盖：未配置云 / 旧版云函数 / 集合缺失 / 网络异常 / 业务错误 5 类失败路径，以及 bootstrap、动态列表、发动态、关注计数、活动归一化、通知过滤、发消息、登出 8 条成功路径。

---

# 第四轮：部署自检与错误诊断

起因：部署后仍出现 `-504003 Invoking task timed out after 3 seconds` 与 `NO_WECHAT_IDENTITY`，前者是云函数默认 3 秒超时，后者是控制台调用没有微信身份。

## 十九、本轮改动

| # | 问题 | 改动 | 文件 |
|---|---|---|---|
| 1 | `-504003` 只透出原始长串错误 | 新增错误码 `FUNCTION_TIMEOUT`，提示语改为「云函数执行超时：请在云开发控制台把 linkusApi 的超时时间调到 20 秒」 | `services/api.js` |
| 2 | 冷启动首次调用常撞 3 秒超时，重试即通 | `bootstrap()` 遇到 `FUNCTION_TIMEOUT` **自动重试一次**；其它错误不重试（避免重复写入） | `services/api.js` |
| 3 | 控制台无法验证部署的是哪个版本（普通 action 都要身份） | `linkusApi` 增加 `ping` action，返回 `{ ok, build, actions, time }`，**不需要微信身份** | `cloudfunctions/linkusApi/index.js` |
| 4 | `setupLinkUS` 在控制台跑永远 `NO_WECHAT_IDENTITY` | 去掉微信身份要求（它只建集合 + 播种，幂等且不写用户数据） | `cloudfunctions/setupLinkUS/index.js` |

新增用例：

| 编号 | 用例 |
|---|---|
| C21 | `-504003` 映射成 `FUNCTION_TIMEOUT`，且 `bootstrap` 只重试一次（断言调用次数为 2） |
| C22 | 非超时错误不重试（断言调用次数为 1） |

## 二十、部署自检流程（已验证通过）

```bash
# 1. 云函数 → setupLinkUS → 云端测试，参数填 {}
{ "ok": true, "collections": [ ...14 项... ], "seeded": { "groups": 0, "activities": 0 } }

# 2. 云函数 → linkusApi → 云端测试，参数填 {"action":"ping"}
{ "ok": true, "build": "linkus-api-2026-11-09", "actions": 47, "time": 1794222857605 }
```

`seeded: 0` 表示 groups / activities 已有数据，无需重复播种，属正常。

实测结果：另一账号已能看到发布后的 Moments，说明「微信身份 → 写库 → 他人读库」链路打通。

## 二十一、遗留建议

| 项 | 建议 |
|---|---|
| `setupLinkUS` 已放开身份限制 | 初始化完成后建议在云开发控制台**直接删除该函数**；重建时重新部署即可。若要保留，可加初始化口令 |
| 种子数据 | `activities` / `groups` 里 `creatorOpenId: "system"` 的记录没有发起者/群主，建议删除后用 App 重新创建 |
| 云函数超时 | `linkusApi` 与 `setupLinkUS` 都设为 20 秒（默认 3 秒不够冷启动） |
| 私信权限 | 设置里的「谁能私信我」目前只存偏好，`sendMessage` 尚未按它拦截 |
