# X/Twitter Bookmarks查看器

使用 React + TypeScript + Vite 构建的 Twitter 书签查看工具，可以展示 Twitter 导出的书签 JSON 数据。



## 技术栈

- React 19.2.4
- TypeScript 5.9.3
- Vite 7.3.1
- CSS Modules

## 开发命令

```bash
pnpm install
pnpm d1:migrate:local
pnpm dev
pnpm build
pnpm lint
```

## Cloudflare D1（当前后端）

- 后端已改为 Cloudflare Worker + D1，接口仍是 `/api/*`
- Worker 入口：`worker/index.mjs`
- D1 迁移文件：`db/migrations/0001_init.sql`

首次使用请先修改 `wrangler.toml`：

1. 把 `database_id` 改成你自己的 D1 数据库 ID
2. 确保 `database_name` 与你的 D1 名称一致

常用命令：

```bash
# 本地应用迁移
pnpm d1:migrate:local

# 远程应用迁移
pnpm d1:migrate:remote

# 部署 Worker
pnpm deploy:worker
```

## 部署到 Cloudflare Pages（前端）

Pages 已通过 `public/_worker.js` 代理 `/api/*` 到 Worker，
前端默认同域调用 `/api/*`，不再直接跨域请求 `workers.dev`。
如需覆盖，可在构建前设置环境变量：`VITE_API_BASE_URL`。

部署命令：

```bash
pnpm build
pnpm deploy:pages
```

## 自动部署（GitHub Actions）

已提供工作流：`.github/workflows/cloudflare-deploy.yml`

- 触发分支：`master`、`main`
- 自动执行：
  - Worker 发布（含 D1 远程迁移）
  - Pages 发布

需要在 GitHub 仓库 Secrets 配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 关闭 Vercel 自动部署

当前仓库已删除 `vercel.json`，但若 GitHub 仍显示 `vercel[bot]` Deployments，
说明 Vercel Git 集成仍连接仓库。需要在 Vercel 控制台中断开：

1. Vercel Project Settings -> Git
2. Disconnect Repository 或关闭 Auto-deploy
3. （可选）删除 Vercel 项目，彻底停止后续部署状态回写


## 项目结构

```
.github/workflows/
└── cloudflare-deploy.yml # Cloudflare 自动部署（Worker + Pages）

db/
└── migrations/           # D1 迁移脚本

public/
├── _worker.js            # Pages 同域 API 代理
└── _redirects            # SPA 路由回退

src/
├── components/
│   ├── features/         # 推文卡片、媒体、列表、统计等业务组件
│   ├── layout/           # 头部、侧边栏、底部导航等布局组件
│   └── ui/               # Toast、ImageModal 等通用 UI
├── constants/            # 常量
├── hooks/                # 自定义 Hooks
├── pages/                # 移动端页面
├── services/             # 前端 API 服务
├── styles/               # 全局样式
├── types/                # TS 类型定义
├── utils/                # 工具函数
├── App.tsx               # 根组件
└── main.tsx              # 入口

worker/
├── index.mjs             # Cloudflare Worker API（/api/*）
└── tweet-normalizer.mjs  # 推文标准化
```

## 获取数据

使用 [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 导出 Twitter 书签为 JSON 格式。

1. 安装 Tampermonkey 或 Violentmonkey 浏览器扩展
2. 安装 twitter-web-exporter 用户脚本
3. 在 Twitter 书签页面使用脚本导出为 JSON 格式

## 使用方法

1. 点击页面上的“选择 JSON 文件”上传导出的书签文件（支持多文件）
2. 后端按推文 ID 去重增量导入到 D1（新增/更新/失败会给出提示）
3. 前端自动刷新第一页，继续下滑到底会自动加载下一页

## 功能特性

### 数据加载
- 支持本地 JSON 文件上传并导入 D1
- 导入完成后自动刷新列表
- 列表采用滚动分页，滑到底自动加载下一页

### 推文展示
- 完整的推文内容展示（文本、媒体、引用推文）
- 用户信息展示（头像、昵称、用户名、认证标识）
- 互动数据展示（回复、转推、点赞、书签数、浏览量）
- 自动处理链接、@用户名、#话题标签
- 长文本智能截断和展开/收起功能

### 媒体功能
- 单图、多图展示（支持网格布局）
- 图片放大查看模态框
- 支持键盘导航（上一张/下一张）
- 图片计数器显示

### 统计功能
- 总推文数量统计
- 用户维度统计（各用户的推文数量排序）
- 桌面端右侧栏和移动端独立统计页面

### 界面设计
- 响应式布局（桌面端三栏、移动端单栏）
- 模仿 Twitter 网页界面风格
- 移动端底部导航栏
- 桌面端左侧导航栏
- 时间相对格式化（X天前、X小时前等）
- 数字格式化显示（K、M 单位）



