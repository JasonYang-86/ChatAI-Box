import { MCPClient, MCPServerConfig, MCPTool } from './mcp-client';

interface MCPInstance {
  config: MCPServerConfig;
  client: MCPClient;
  tools: MCPTool[];
}

class MCPManager {
  private instances = new Map<string, MCPInstance>();
  private initialized = false;

  async loadServers(servers: MCPServerConfig[]): Promise<void> {
    for (const server of servers) {
      if (server.isEnabled && !this.instances.has(server.id)) {
        await this.startServer(server);
      }
    }
    this.initialized = true;
  }

  async startServer(config: MCPServerConfig): Promise<MCPTool[]> {
    if (this.instances.has(config.id)) {
      await this.stopServer(config.id);
    }

    const client = new MCPClient(config);
    client.setStderrHandler((data) => {
      console.log(`[MCP:${config.name}] stderr:`, data.trim());
    });

    try {
      const result = await client.initialize();
      this.instances.set(config.id, { config, client, tools: result.tools });
      console.log(`[MCP:${config.name}] initialized with ${result.tools.length} tools`);
      return result.tools;
    } catch (e) {
      console.error(`[MCP:${config.name}] failed to start:`, (e as Error).message);
      throw e;
    }
  }

  async stopServer(id: string): Promise<void> {
    const instance = this.instances.get(id);
    if (instance) {
      await instance.client.close();
      this.instances.delete(id);
    }
  }

  async restartServer(config: MCPServerConfig): Promise<MCPTool[]> {
    await this.stopServer(config.id);
    return this.startServer(config);
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>) {
    const instance = this.instances.get(serverId);
    if (!instance) {
      throw new Error(`MCP server ${serverId} not running`);
    }
    return instance.client.callTool(toolName, args);
  }

  getAllTools(): Array<{ serverId: string; serverName: string; tool: MCPTool }> {
    const results: Array<{ serverId: string; serverName: string; tool: MCPTool }> = [];
    for (const [id, instance] of this.instances) {
      for (const tool of instance.tools) {
        results.push({ serverId: id, serverName: instance.config.name, tool });
      }
    }
    return results;
  }

  getToolsForProvider(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }> {
    return this.getAllTools().map(({ tool, serverName }) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: `[${serverName}] ${tool.description}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
    }));
  }

  async executeTool(name: string, args: Record<string, unknown>) {
    for (const [serverId, instance] of this.instances) {
      const tool = instance.tools.find((t) => t.name === name);
      if (tool) {
        return this.callTool(serverId, name, args);
      }
    }
    throw new Error(`Tool ${name} not found in any MCP server`);
  }

  async shutdown(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    for (const [id] of this.instances) {
      stopPromises.push(this.stopServer(id));
    }
    await Promise.all(stopPromises);
    this.initialized = false;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  getServerIds(): string[] {
    return Array.from(this.instances.keys());
  }
}

export const mcpManager = new MCPManager();
