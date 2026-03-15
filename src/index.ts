#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "fetch_xhs_image",
    description: "Fetch images from a Xiaohongshu (小红书) post URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The Xiaohongshu post URL",
        },
      },
      required: ["url"],
    },
  },
];

// Create the MCP server
const server = new Server(
  {
    name: "xhs-fetch-image-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "fetch_xhs_image") {
    const { url } = args as { url: string };
    
    // TODO: Implement image fetching logic
    // This is a placeholder implementation
    return {
      content: [
        {
          type: "text",
          text: `Fetching images from: ${url}\n\nImplementation pending...`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("XHS Fetch Image MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
