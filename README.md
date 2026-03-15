# XHS Fetch Image MCP Server

A Model Context Protocol (MCP) server for fetching images from Xiaohongshu (小红书) posts.

## Installation

```bash
npm install
npm run build
```

## Usage with Claude Desktop

Add this server to your Claude Desktop config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "xhs-fetch-image": {
      "command": "node",
      "args": ["/path/to/xhs-fetch-image-mcp/dist/index.js"]
    }
  }
}
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Run
npm start
```

## Available Tools

### fetch_xhs_image

Fetch images from a Xiaohongshu post URL.

**Parameters:**
- `url` (string, required): The Xiaohongshu post URL

## License

MIT
