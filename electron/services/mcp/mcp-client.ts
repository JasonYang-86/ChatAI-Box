export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  isEnabled: boolean;
  createdAt: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPToolResult {
  callId: string;
  name: string;
  content: string;
  isError: boolean;
}

export interface MCPInitResult {
  protocolVersion: string;
  serverName: string;
  serverVersion: string;
  tools: MCPTool[];
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export class MCPClient {
  private process: import('child_process').ChildProcess | null = null;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = '';
  private onStderr: ((data: string) => void) | null = null;

  constructor(private config: MCPServerConfig) {}

  setStderrHandler(handler: (data: string) => void): void {
    this.onStderr = handler;
  }

  async initialize(): Promise<MCPInitResult> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      this.process = spawn(this.config.command, this.config.args, {
        env: { ...process.env, ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        if (this.onStderr) this.onStderr(data.toString());
      });

      this.process.on('error', (err) => {
        reject(new Error(`Failed to start MCP server: ${err.message}`));
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          this.rejectAllPending(new Error(`MCP server exited with code ${code}`));
        }
      });

      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'ChatAI', version: '1.0.0' },
      })
        .then((initResult) => {
          const typed = initResult as { protocolVersion: string; serverInfo: { name: string; version: string }; capabilities: Record<string, unknown> };
          this.sendNotification('notifications/initialized', {});
          return this.sendRequest('tools/list', {});
        })
        .then((toolsResult) => {
          const typed = toolsResult as { tools: MCPTool[] };
          resolve({
            protocolVersion: '2024-11-05',
            serverName: this.config.name,
            serverVersion: '1.0.0',
            tools: typed.tools || [],
          });
        })
        .catch(reject);
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const callId = `call-${Date.now()}`;
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: args,
      });
      const typed = result as { content: Array<{ type: string; text?: string }>; isError?: boolean };
      const textContent = typed.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('\n') || JSON.stringify(result);
      return {
        callId,
        name,
        content: textContent,
        isError: typed.isError || false,
      };
    } catch (e) {
      return {
        callId,
        name,
        content: (e as Error).message,
        isError: true,
      };
    }
  }

  async close(): Promise<void> {
    if (this.process) {
      this.rejectAllPending(new Error('MCP client closed'));
      this.process.kill();
      this.process = null;
    }
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  private sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextId++;
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.writeJson(request);
    });
  }

  private sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification = { jsonrpc: '2.0', method, params };
    this.writeJson(notification);
  }

  private writeJson(data: unknown): void {
    if (this.process?.stdin?.writable) {
      this.process.stdin.write(JSON.stringify(data) + '\n');
    }
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const message = JSON.parse(line) as JsonRpcResponse;
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id)!;
          this.pendingRequests.delete(message.id);
          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message.result);
          }
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [, { reject }] of this.pendingRequests) {
      reject(error);
    }
    this.pendingRequests.clear();
  }
}
