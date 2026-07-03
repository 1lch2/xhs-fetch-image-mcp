#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { extractImages, extractNote } from './xhs-extract.js';

// Create the MCP server using the high-level McpServer API
const server = new McpServer({
  name: 'xhs-fetch-image-mcp',
  version: '1.0.0',
});

// Register the fetch_xhs_image tool
server.registerTool(
  'fetch_xhs_image',
  {
    description: 'Extract original-quality images from a Xiaohongshu (小红书) post. Accepts share button text, short links (xhslink.com), or full URLs.',
    inputSchema: {
      content: z.string().describe('Xiaohongshu share text, short link (xhslink.com), or full post URL'),
    },
  },
  async ({ content }) => {
    try {
      const result = await extractImages(content);

      // Handle video posts
      if (result.isVideo) {
        return {
          content: [
            {
              type: 'text',
              text: 'This post is a video, no images available.',
            },
          ],
        };
      }

      // Format the output
      const outputLines = [
        `Title: ${result.title}`,
        '',
        `Found ${result.images.length} image(s):`,
        ...result.images.map((url, i) => `${i + 1}. ${url}`),
      ];

      return {
        content: [
          {
            type: 'text',
            text: outputLines.join('\n'),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Register the fetch_xhs_note tool
server.registerTool(
  'fetch_xhs_note',
  {
    description: 'Extract structured metadata from a Xiaohongshu (小红书) note. Accepts share button text, short links (xhslink.com), or full note URLs.',
    inputSchema: {
      content: z.string().describe('Xiaohongshu share text, short link (xhslink.com), or full note URL'),
    },
  },
  async ({ content }) => {
    try {
      const result = await extractNote(content);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XHS Fetch Image MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
