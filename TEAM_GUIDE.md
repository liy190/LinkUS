# LinkUS 团队使用与继续开发指南

本文档面向 LinkUS 项目的五位组员。项目是原生微信小程序，前端使用 WXML、WXSS 和 JavaScript，后端使用微信云开发。

## 当前版本已经完成

| 模块 | 当前状态 |
| --- | --- |
| 欢迎页与登录 | 已完成欢迎页、微信身份登录入口和首次资料创建流程 |
| 个人资料 | 已完成个人主页、昵称/学院/简介编辑和头像上传接口 |
| 主导航 | 已完成 Map、Chats、Groups、Discover、Notices 底部导航，以及右下角悬浮快捷入口 |
| HKU 地图 | 使用微信原生 `map` 组件，包含港大主要建筑、搜索、地点卡片、系统地图导航和定位入口 |
| 地点社交 | 已完成地点详情、地点用户头像列表、地点讨论入口和创建活动入口 |
| 聊天 | 已完成会话列表、私聊/群聊/地点讨论、消息发送、头像显示和云端轮询 |
| 群组 | 已完成群组列表、加入/退出和群聊访问控制接口 |
| 活动 | 已完成活动列表、详情、创建、加入/退出和剩余名额接口 |
| 通知与反馈 | 已完成通知列表、已读操作和反馈提交接口 |
| 位置隐私 | 默认关闭、限时分享、随时撤销、地点级共享和过期隐藏 |
| 安全距离 | 双方均授权才由云函数返回精确米数；否则只返回“同一地点 / 约 300 米 / 1 公里内”等模糊标签 |
| 云后端 | 已包含 `linkusApi`、`locationSync` 和一次性初始化函数 `setupLinkUS` |

安全距离的精确坐标只保存在 `sharedLocations` 的云端记录中，不会返回给另一部手机。任意一方关闭精确距离授权后，云端会清除该用户的精确坐标，但可继续保留普通地点级共享。

## 新成员第一次运行

1. 在 GitHub 接受仓库邀请，然后克隆项目：

   ```bash
   git clone https://github.com/liy190/LinkUS.git
   cd LinkUS
   ```

2. 安装并登录微信开发者工具，选择“导入项目”，目录选仓库根目录，不要只选择 `miniprogram` 子目录。
3. 使用项目现有 AppID `wxd4e38c2692b060a3`。如果无法预览，先让管理员在微信公众平台把该微信号添加为项目成员或体验成员。
4. 云环境选择 `cloud1-d2ggrwa212d80dc1d`。
5. 点击“编译”即可在模拟器查看；点击“预览”后可在手机微信中测试。
6. 正常协作不需要重复运行 `setupLinkUS`。只有数据库从未初始化时，才按照 [BACKEND_SETUP.md](BACKEND_SETUP.md) 执行一次。

若云函数需要更新，在微信开发者工具左侧右键对应目录，选择“上传并部署：云端安装依赖（不上传 node_modules）”。运行中的两个主要函数是：

- `cloudfunctions/linkusApi`：用户、聊天、群组、活动、通知、反馈和头像业务。
- `cloudfunctions/locationSync`：限时位置共享、授权撤销和安全距离计算。

## 每位成员的 Git 协作方式

不要五个人同时直接修改 `main`。每项功能使用独立分支：

```bash
git switch main
git pull origin main
git switch -c feat/your-feature-name
```

完成并测试后：

```bash
git add <本次功能涉及的文件>
git commit -m "feat: describe your change"
git push -u origin feat/your-feature-name
```

然后在 GitHub 创建 Pull Request，由至少一位组员检查后合并。开始新任务前再次同步 `main`。

协作规则：

- 不提交 `project.private.config.json`、AppSecret、API Key、个人聊天数据或数据库导出文件。
- 不使用 `git push --force` 覆盖他人代码。
- 一次 Pull Request 只处理一个功能，避免把无关格式修改混在一起。
- 修改页面数据结构时，同步检查 `miniprogram/services/api.js` 和对应云函数。
- 地图坐标要区分 WGS-84 与 GCJ-02；港大建筑源坐标统一保存在 `miniprogram/data/mock.js`。

## 建议继续完善的任务

可按下面方向分给不同成员并行完成：

1. **双账号验收与缺陷修复**：逐项测试登录、头像、私聊、群聊、活动和安全距离。
2. **聊天增强**：将三秒轮询升级为更实时的消息更新，补充图片/位置消息的真实上传与下载。
3. **地图与地点数据**：继续核对 HKU 建筑坐标、补充地点照片、开放时间和无障碍信息。
4. **群组/活动权限**：为“仅同组或同活动可见”的精确位置接入服务端成员关系校验。
5. **产品质量**：补齐加载、空状态、失败重试、内容举报与敏感内容处理。
6. **课程交付材料**：完善 README、架构图、组员贡献记录，并录制 2–3 分钟功能演示。

## 合并前测试清单

- 微信开发者工具显示 0 个编译错误。
- 两个微信账号会生成不同的 LinkUS 用户身份。
- 资料修改和头像在重新进入后仍保留。
- 私聊双方都能看到消息和正确头像。
- 群组加入/退出会正确改变聊天权限。
- 活动加入/退出会正确改变剩余名额。
- 地图定位、建筑点击、关闭地点卡片和系统导航均正常。
- 仅一方开启精确距离时只能看到模糊距离。
- 双方开启精确距离时显示精确米数；任意一方关闭后立即恢复模糊距离。
- 位置分享撤销或到期后，其他用户不再看到该记录。

## 关键代码入口

- 页面注册和导航：`miniprogram/app.json`
- 统一后端接口：`miniprogram/services/api.js`
- 位置接口：`miniprogram/services/location.js`
- 地图和地点数据：`miniprogram/pages/map/`、`miniprogram/data/mock.js`
- 通用顶部组件：`miniprogram/components/linkus-header/`
- 业务云函数：`cloudfunctions/linkusApi/`
- 位置云函数：`cloudfunctions/locationSync/`
- 后端部署说明：[BACKEND_SETUP.md](BACKEND_SETUP.md)
