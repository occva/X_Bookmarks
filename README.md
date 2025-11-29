# X/Twitter Bookmarks查看器

使用 React + TypeScript + Vite 构建的 Twitter 书签查看工具，可以展示 Twitter 导出的书签 JSON 数据。



## 技术栈

- React 18.2.0
- TypeScript 5.2.2
- Vite 5.0.8
- CSS Modules


## 项目结构

```
src/
├── components/          # React 组件
│   ├── Sidebar/         # 左侧导航栏
│   ├── Header/          # 顶部标题栏
│   ├── TweetCard/       # 推文卡片
│   ├── TweetMedia/      # 推文媒体（图片）
│   ├── QuotedTweet/     # 引用推文
│   ├── ImageModal/      # 图片放大模态框
│   └── TweetsContainer/ # 推文容器
├── hooks/               # 自定义 Hooks
├── utils/               # 工具函数
├── types/               # TypeScript 类型定义
└── App.tsx              # 根组件
```

## 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/occva/X_Bookmarks)


## 获取数据

使用 [twitter-web-exporter](https://github.com/prinsss/twitter-web-exporter) 导出 Twitter 书签为 JSON 格式。

1. 安装 Tampermonkey 或 Violentmonkey 浏览器扩展
2. 安装 twitter-web-exporter 用户脚本
3. 在 Twitter 书签页面使用脚本导出为 JSON 格式

## 使用方法

1. 点击页面上的"选择 JSON 文件"按钮
2. 选择 twitter-web-exporter 导出的书签 JSON 文件
3. 推文会自动加载并显示

## 功能特性

### 数据加载
- 支持本地 JSON 文件选择加载
- 支持从 URL 加载 JSON 数据
- 自动解析 twitter-web-exporter 导出的书签数据格式

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



