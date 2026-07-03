# 小红书图片提取 MCP 服务器

[English](README.md) | 简体中文

一个用于从小红书帖子中提取原图的 Model Context Protocol (MCP) 服务器。

## 功能特性

- **多种输入格式**: 支持分享按钮文本、短链接 (xhslink.com) 或完整 URL
- **原图质量**: 将压缩的 CDN 链接转换为高清原图
- **结构化笔记信息**: 以 JSON 提取标题、描述、作者、时间、标签、互动数、封面和图片资源
- **视频元数据**: 视频笔记返回视频 URL、备用 URL、编码、清晰度、尺寸、大小和封面
- **用户主页信息**: 从用户主页提取基础资料、互动数、公开 tab 和首屏帖子卡片
- **视频检测**: 自动识别视频帖子并返回相应提示
- **分享文本解析**: 自动从复制的分享文本中提取短链接

## 安装

```bash
npm install
npm run build
```

## MCP 服务器配置

将此服务器添加到客户端配置中：

### 配置 JSON

```json
{
  "mcpServers": {
    "xhs-fetch-image": {
      "command": "node",
      "args": ["你的目录路径\\xhs-fetch-image-mcp\\dist\\index.js"]
    }
  }
}
```

**注意**: 将 `args` 中的路径替换为你本地 `dist/index.js` 文件的绝对路径。

## 可用工具

### fetch_xhs_image

从小红书帖子中提取原图。

**输入参数:**

```typescript
{
  content: string; // 小红书分享文本、短链接 (xhslink.com) 或完整帖子 URL
}
```

**输出结果:**

- 图片帖子: 标题和原图 URL 列表
- 视频帖子: "此帖子是视频，没有可提取的图片。"
- 错误情况: 包含详细信息的错误消息

### fetch_xhs_note

提取小红书笔记的结构化信息。

**输入参数:**

```typescript
{
  content: string; // 小红书分享文本、短链接 (xhslink.com) 或完整笔记 URL
}
```

**输出结果:**

JSON 文本，包含笔记 ID、规范化 URL、标题、描述、作者、发布时间/更新时间、标签、点赞/收藏/评论数、封面 URL、图片 URL，以及可用的视频元数据。

### fetch_xhs_profile

提取小红书用户主页的结构化信息。

**输入参数:**

```typescript
{
  content: string; // 小红书用户主页 URL，例如 https://www.xiaohongshu.com/user/profile/<uid>
}
```

**输出结果:**

JSON 文本，包含用户 ID、昵称、小红书号、简介、IP 属地、性别、认证类型、关注/粉丝/获赞收藏计数、公开 tab 状态和已加载的主页帖子卡片。

## 开发

```bash
# 监听模式
npm run dev

# 构建
npm run build

# 运行
npm start
```

## 环境要求

- Node.js 18+ (原生 fetch 支持)
- TypeScript 5.3+

## 依赖项

- `@modelcontextprotocol/sdk` - MCP 服务器框架
- `zod` - 输入验证

## 错误处理

| 错误                           | 描述                                    |
| ------------------------------ | --------------------------------------- |
| `Failed to resolve short link` | 无法提取或解析 xhslink.com 链接         |
| `Invalid Xiaohongshu URL`      | 无法提取 postId 或 xsecToken            |
| `Initial state not found`      | 页面结构变化或触发了反爬虫机制          |
| `XHS returned 4xx/5xx`         | 帖子未找到或服务器错误                  |
| `This post is a video`         | 视频帖子没有可提取的图片                |

## 许可证

MIT
