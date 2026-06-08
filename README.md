# ChatAI

一个极简风格的桌面 AI 聊天软件，支持国内外主流大模型自由切换，数据完全本地存储，具备 AI 记忆系统、本地知识库（RAG）、MCP工具调用、文件系统操作能力。

> 🚀 本项目由 [TRAE](https://trae.ai) AI 编程助手全程开发

## 📥 下载安装

**Windows 用户可直接下载免安装版：**

👉 **[下载 ChatAI-Windows.zip](https://github.com/JasonYang-86/ChatAI-Box/releases/latest)**

1. 下载 `ChatAI-Windows.zip`
2. 解压到任意目录
3. 双击 `ChatAI.exe` 即可运行

首次使用需在设置中配置 API Key（支持 OpenAI / DeepSeek / 通义千问等），或在本地安装 [Ollama](https://ollama.com) 后添加本地模型（免费离线）。

## 特性

### 核心功能
- 🌐 **7 大模型提供商** — OpenAI / Anthropic Claude / DeepSeek / 通义千问 / Moonshot (Kimi) / Ollama 本地模型 / OpenAI 兼容接口
- 💬 **流式对话** — SSE 流式接收，Markdown 渲染 + 代码语法高亮 + 一键复制
- 🧑‍🎤 **AI 角色系统** — 自定义 System Prompt，创建专属 AI 助手
- ⌨️ **全局快捷键** — Ctrl+N 新对话、Ctrl+B 侧边栏、Ctrl+Shift+T 主题等
- 💾 **数据本地存储** — SQLite 数据库，所有数据完全离线
- 📤 **对话导出** — 支持导出 Markdown / JSON 格式

### AI 记忆系统 🆕
- 🧠 **对话长记忆** — 本地 TF-IDF 向量化，自动保存对话到记忆库
- 🔍 **语义搜索** — 发送消息时自动搜索相关历史对话
- 📥 **智能上下文注入** — 相关历史自动注入 System Prompt，AI 不再"忘记"之前的对话
- ⚡ **纯本地运行** — 无需外部 API，零网络依赖

### 知识库 (RAG)
- 📚 **本地知识库** — 上传 PDF / Word / TXT / 代码文件，AI 基于你的文档回答
- 🔍 **语义检索** — 自动从文档中检索相关内容，注入对话上下文

### 文件操作
- 📁 **文件管理器** — VS Code 风格树形浏览器，浏览/创建/删除/重命名
- ✏️ **Monaco 编辑器** — 内嵌 VS Code 同款编辑器，200+ 语言语法高亮
- 🤖 **AI 文件操作** — AI 可直接读取、创建、编辑文件（需先选择工作目录）
  - `fs_list_directory` — 列出目录
  - `fs_read_file` — 读取文件
  - `fs_write_file` — 写入文件
  - `fs_create_directory` — 创建文件夹
  - `fs_delete_file_or_dir` — 删除文件/文件夹
- 🔒 **安全沙箱** — 所有操作限制在选定工作目录内，不会越界访问

### MCP (Model Context Protocol)
- 🔧 **MCP 工具集成** — 支持配置 MCP 服务器，让 AI 调用外部工具
- 📦 **推荐服务器** — 文件系统 / 网页搜索 / GitHub 操作等

### 界面
- 🌗 **深色 / 浅色主题** — 一键切换，CSS 变量驱动
- 🎨 **千问红 UI** — 现代简约设计，#FF403A 主色调
- 🌍 **中英文国际化** — i18next 驱动，80+ 翻译条目
- 🔄 **自动更新** — 集成 electron-updater

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 33 |
| 界面 | React 18 + TypeScript |
| 样式 | TailwindCSS 3 |
| 状态管理 | Zustand 5 |
| 数据库 | SQLite (sql.js) |
| 向量数据库 | LanceDB |
| 记忆系统 | TF-IDF 向量化（纯 TS 实现） |
| 代码编辑器 | Monaco Editor |
| 文件解析 | pdf-parse + mammoth (Word) |
| Markdown | react-markdown + remark-gfm |
| 国际化 | i18next + react-i18next |
| 构建工具 | Vite 6 |
| 打包 | electron-builder |

## 支持的 AI 提供商

| 提供商 | 默认端点 | 默认模型 |
|--------|---------|---------|
| OpenAI | api.openai.com/v1 | GPT-4o / 4o-mini / 4-turbo / 3.5-turbo |
| Anthropic Claude | api.anthropic.com | Claude 3.5 Sonnet / 3 Opus / 3 Haiku |
| DeepSeek | api.deepseek.com/v1 | deepseek-chat / deepseek-reasoner |
| 通义千问 | dashscope.aliyuncs.com/compatible-mode/v1 | qwen-turbo / plus / max |
| Moonshot (Kimi) | api.moonshot.cn/v1 | moonshot-v1-8k / 32k / 128k |
| Ollama | localhost:11434 | 自动发现已安装模型（免费离线） |
| OpenAI 兼容 | 自定义 | 自定义 |

## 项目结构

```
ChatAI/
├── electron/                       # Electron 主进程
│   ├── main.ts                     # 入口：窗口管理、自动更新
│   ├── preload.ts                  # 安全桥接 (contextBridge)
│   ├── database/
│   │   └── connection.ts           # SQLite 数据库 (sql.js)
│   ├── ipc/
│   │   ├── index.ts                # IPC 处理器（对话/消息/角色/模型/设置）
│   │   ├── chat.ipc.ts             # 聊天 IPC（流式 + 工具调用 + 文件工具）
│   │   ├── knowledge.ipc.ts        # 知识库 IPC（索引/检索/删除）
│   │   ├── mcp.ipc.ts              # MCP IPC（服务器管理 + 工具执行）
│   │   ├── file.ipc.ts             # 文件系统 IPC（安全沙箱操作）
│   │   └── memory.ipc.ts           # 记忆系统 IPC（搜索/存储/管理）🆕
│   └── services/
│       ├── model-adapter/          # 模型适配层
│       │   ├── types.ts            # 抽象基类 + 类型定义（含 ToolCall）
│       │   ├── openai-compatible-adapter.ts  # OpenAI 兼容适配器（含工具调用）
│       │   ├── anthropic-adapter.ts          # Claude 适配器
│       │   ├── ollama-adapter.ts             # Ollama 适配器
│       │   ├── adapter-factory.ts            # 适配器工厂
│       │   └── provider-registry.ts          # 提供商注册表
│       ├── file-system.ts          # 文件系统服务（安全沙箱）
│       ├── memory/                 # AI 记忆系统 🆕
│       │   ├── memory-manager.ts   # 记忆管理器（CRUD + 搜索 + 上下文构建）
│       │   ├── tfidf-vectorizer.ts # TF-IDF 向量化器（纯 TS，零依赖）
│       │   └── types.ts            # 记忆系统类型定义
│       ├── mcp/                    # MCP 协议实现
│       │   ├── mcp-client.ts       # JSON-RPC stdio 客户端
│       │   └── mcp-manager.ts      # 多服务器生命周期管理
│       └── rag/                    # RAG 知识库
│           ├── file-parser.ts      # 文件解析（PDF/DOCX/TXT/代码）
│           ├── text-chunker.ts     # 滑动窗口文本分块
│           ├── embedding.ts        # OpenAI Embedding 向量化
│           ├── vector-store.ts     # LanceDB 向量存储 + 语义检索
│           └── knowledge.ts        # RAG 编排器
├── src/                            # 渲染进程 (React)
│   ├── main.tsx                    # React 入口
│   ├── App.tsx                     # 根组件（三栏布局：侧边栏+聊天+文件面板）
│   ├── i18n/                       # 国际化
│   │   ├── index.ts                # i18next 初始化
│   │   └── locales/                # 中英文翻译文件
│   ├── components/
│   │   ├── sidebar/                # 侧边栏 + 对话列表
│   │   ├── chat/                   # 对话区（输入框/消息/渲染/Markdown）
│   │   ├── settings/               # 设置面板（模型/AI角色/MCP/记忆）
│   │   ├── memory/                 # 记忆管理面板 🆕
│   │   │   └── MemoryPanel.tsx     # 记忆查看/搜索/管理 UI
│   │   ├── file/                   # 文件管理面板
│   │   │   ├── FilePanel.tsx       # 面板容器（文件/编辑器/变更三标签）
│   │   │   ├── FileTree.tsx        # VS Code 风格树形浏览器
│   │   │   ├── FileEditor.tsx      # Monaco 代码编辑器
│   │   │   └── ChangeTracker.tsx   # 文件变更历史
│   │   └── knowledge/              # 知识库管理面板
│   ├── stores/                     # Zustand 状态管理
│   │   ├── chatStore.ts            # 对话/消息/流式状态
│   │   ├── modelStore.ts           # 模型配置状态
│   │   ├── settingsStore.ts        # 主题/侧边栏状态
│   │   ├── knowledgeStore.ts       # 知识库状态
│   │   └── fileStore.ts            # 文件操作状态
│   ├── services/
│   │   └── chat.ts                 # 对话引擎（发送/流式/知识库/记忆注入）
│   ├── hooks/
│   │   └── useShortcuts.ts         # 全局快捷键
│   └── types/
│       ├── index.ts                # 核心类型
│       ├── model.ts                # 模型类型
│       └── file.ts                 # 文件类型
├── AI Memory/                      # Python 参考实现（独立项目）🆕
│   ├── memory_manager.py           # 记忆管理器（Python 版）
│   ├── embedding_service.py        # sentence-transformers 嵌入
│   ├── lightweight_embedding.py    # TF-IDF 轻量嵌入
│   ├── cli.py                      # 命令行工具
│   └── test_memory.py              # 测试脚本
├── tailwind.config.ts              # TailwindCSS 配置
├── vite.config.ts                  # Vite 构建配置
├── tsconfig.json                   # 渲染进程 TS 配置
├── tsconfig.node.json              # 主进程 TS 配置
└── package.json                    # 依赖 + electron-builder
```

## 架构流程

### 对话流程（含记忆）
```
用户输入 → ChatInput
              ↓
         sendMessage() [src/services/chat.ts]
              ↓
    ① 添加用户消息到 Store + 写入 SQLite
    ② 添加空 AI 消息到 Store
    ③ 设置 stream 监听器
    ④ 记忆系统：搜索相关历史对话 → 注入 System Prompt 🆕
    ⑤ 如果开启知识库 → 检索 Top 3 相关文本块 → 注入 System Prompt
    ⑥ 调用 chat:completions IPC
              ↓
         [electron/ipc/chat.ipc.ts]
    ⑦ 注册工具列表（文件工具 + MCP工具）
    ⑧ 创建适配器 → 发起 SSE 流式请求（含 tools 定义）
    ⑨ 每收到 chunk → webContents.send('chat:stream-chunk')
    ⑩ 如 AI 返回 tool_calls → 解析执行 → 结果注入消息 → 继续对话
              ↓
         [src/services/chat.ts 监听]
    ⑪ appendToStreaming() → MessageItem 实时更新
    ⑫ stream-done → 保存到 SQLite + 存入记忆库 🆕
```

### AI 记忆系统工作流 🆕
```
对话完成
    ↓
自动 upsert 到记忆库（JSON 文件本地存储）
    ↓
TF-IDF 向量化（标题 + 首条消息 → 向量）
    ↓
下次用户发消息时：
    ↓
查询向量化 → 余弦相似度搜索 → Top 5 相关历史
    ↓
格式化为 Markdown 上下文 → 注入 System Prompt
    ↓
AI 回答时即可参考之前的对话内容
```

### AI 文件操作流程
```
用户在对话中说「帮我读 D:/project/main.py」
              ↓
    AI 识别意图 → 返回 tool_call: fs_read_file({ path: "main.py" })
              ↓
    [chat.ipc.ts] 解析 tool_call → executeFileSystemTool()
              ↓
    [file-system.ts] 安全校验路径 → fs.readFileSync()
              ↓
    结果注入回消息列表 → AI 根据内容继续回答
              ↓
    ChangeTracker 记录变更历史
```

### 本地知识库 (RAG) 工作流
```
上传文件 → 设置面板 > 知识库 > 上传
              ↓
文件解析（PDF/DOCX/TXT/MD/代码）→ 提取纯文本
              ↓
滑动窗口分块（512字符/块，50字符重叠）→ 智能断句
              ↓
OpenAI Embedding API 向量化（1536维）→ 批量处理
              ↓
存入 LanceDB 本地向量数据库
              ↓
对话中开启「📚 知识库开」→ 发送消息
              ↓
自动语义检索 Top 3 相关块 → 拼入 System Prompt
              ↓
AI 基于你的文件内容回答问题
```

## AI 工具调用能力

### 文件系统工具（始终可用，需先选择工作目录）
| 工具名 | 功能 | 示例 |
|--------|------|------|
| `fs_list_directory` | 列出目录内容 | 「看看这个文件夹里有什么」 |
| `fs_read_file` | 读取文件内容 | 「帮我读一下 config.json」 |
| `fs_write_file` | 创建/覆盖文件 | 「创建一个 hello.py 打印 Hello」 |
| `fs_create_directory` | 创建文件夹 | 「建一个叫 docs 的文件夹」 |
| `fs_delete_file_or_dir` | 删除文件/文件夹 | 「删除 temp.txt」 |

### MCP 工具（按需配置）
参见设置面板 → MCP 标签页，配置 MCP 服务器后 AI 可调用其工具。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + N | 新建对话 |
| Ctrl + B | 切换侧边栏 |
| Ctrl + Shift + T | 切换深色/浅色主题 |
| Ctrl + , | 打开设置面板 |
| Ctrl + K | 开启/关闭知识库 |
| Ctrl + Shift + E | 导出当前对话 |
| Enter | 发送消息 |
| Shift + Enter | 换行 |

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式（Vite + Electron 同时运行）
npm run dev

# 仅 TypeScript 类型检查
npm run typecheck

# 代码格式化
npm run format

# 构建渲染进程
npx vite build

# 编译主进程
npx tsc -p tsconfig.node.json

# 打包 Windows 安装包
npm run build
```

## 打包

打包输出在 `ChatAI-BOX/` 目录：

```bash
# 完整构建 + 打包
npm run build

# 仅打包（需要先完成 build:renderer 和 build:electron）
npx electron-builder --win
```

## 许可证

MIT
