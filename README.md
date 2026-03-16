# XHS Fetch Image MCP Server

English | [简体中文](README_CN.md)

A Model Context Protocol (MCP) server for extracting original-quality images from Xiaohongshu (小红书) posts.

## Features

- **Multiple Input Formats**: Accepts share button text, short links (xhslink.com), or full URLs
- **Original Quality**: Transforms compressed CDN URLs to original high-resolution images
- **Video Detection**: Identifies video posts and returns an appropriate message
- **Share Text Parsing**: Automatically extracts short links from copied share text

## Installation

```bash
npm install
npm run build
```

## MCP Server Configuration

Add this server to your client configuration:

### Configuration JSON

```json
{
  "mcpServers": {
    "xhs-fetch-image": {
      "command": "node",
      "args": ["YOUR_PATH_TO_DIRECTORY\\xhs-fetch-image-mcp\\dist\\index.js"]
    }
  }
}
```

**Note**: Replace the path in `args` with the absolute path to your `dist/index.js` file.

## Available Tools

### fetch_xhs_image

Extract original-quality images from a Xiaohongshu (小红书) post.

**Input Schema:**

```typescript
{
  content: string; // Xiaohongshu share text, short link (xhslink.com), or full post URL
}
```

**Output:**

- For image posts: Title and list of original-quality image URLs
- For video posts: "This post is a video, no images available."
- For errors: Error message with details

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Run
npm start
```

## Requirements

- Node.js 18+ (for native fetch support)
- TypeScript 5.3+

## Dependencies

- `@modelcontextprotocol/sdk` - MCP server framework
- `zod` - Input validation

## Error Handling

| Error                          | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `Failed to resolve short link` | Could not extract or resolve xhslink.com URL |
| `Invalid Xiaohongshu URL`      | Could not extract postId or xsecToken        |
| `Initial state not found`      | Page structure changed or anti-bot triggered |
| `XHS returned 4xx/5xx`         | Post not found or server error               |
| `This post is a video`         | Video posts have no images to extract        |

## License

MIT
