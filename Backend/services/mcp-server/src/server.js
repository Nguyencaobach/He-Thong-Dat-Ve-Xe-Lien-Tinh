#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

const { analyticsClient, tripClient } = require('./grpcClients');

// Khởi tạo MCP Server
const server = new Server({
  name: "bus-ticket-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  }
});

// 1. Cấu hình Resources (Read-only data)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "policy://cancellation",
        name: "Chính sách hủy vé",
        description: "Quy định về việc hủy vé và hoàn tiền của nhà xe",
        mimeType: "text/plain",
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.uri === "policy://cancellation") {
    return {
      contents: [
        {
          uri: request.uri,
          mimeType: "text/plain",
          text: `Chính sách hủy vé:\n- Trước 24h: Hoàn 100%\n- 12h đến 24h: Hoàn 50%\n- Dưới 12h: Không hoàn tiền.`,
        }
      ]
    };
  }
  throw new Error("Resource not found");
});

// 2. Cấu hình Tools (Actions / Dynamic Data)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_revenue_summary",
        description: "Lấy báo cáo doanh thu và số lượng vé bán ra trong ngày hôm nay",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        }
      },
      {
        name: "search_trips",
        description: "Tìm kiếm chuyến xe",
        inputSchema: {
          type: "object",
          properties: {
            departure: { type: "string", description: "Điểm đi" },
            destination: { type: "string", description: "Điểm đến" },
            date: { type: "string", description: "Ngày khởi hành (YYYY-MM-DD)" }
          },
          required: ["departure", "destination", "date"],
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_revenue_summary") {
    try {
      // Gọi gRPC sang Analytics Service
      const stats = await analyticsClient.GetDashboardStats({});
      return {
        content: [
          {
            type: "text",
            text: `Báo cáo hôm nay:\n- Doanh thu: ${stats.totalRevenue} VNĐ\n- Tổng vé bán: ${stats.totalBookings}\n- Lượt tìm kiếm: ${stats.totalSearchCount}`,
          }
        ]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Lỗi khi lấy báo cáo doanh thu: ${e.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "search_trips") {
    const { departure, destination, date } = request.params.arguments;
    try {
      const result = await tripClient.SearchTrips({ departure, destination, date });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.trips || [], null, 2),
          }
        ]
      };
    } catch (e) {
      return {
        content: [{ type: "text", text: `Lỗi tìm chuyến xe: ${e.message}` }],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

// Khởi chạy transport stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server is running on stdio"); // Dùng console.error vì console.log sẽ bị in ra stdout làm hỏng giao thức stdio
}

main().catch((err) => {
  console.error("Fatal error in main:", err);
  process.exit(1);
});
