# ChatAI

一个极简风格的桌面 AI 聊天软件，支持国内外主流大模型自由切换，数据完全本地存储，具备本地知识库（RAG）能力。

## 特性

- 🌐 **7 大模型提供商** — OpenAI / Anthropic Claude / DeepSeek / 通义千问 / Moonshot (Kimi) / Ollama 本地模型 / OpenAI 兼容接口
- 💬 **流式对话** — SSE 流式接收，Markdown 渲染 + 代码语法高亮 + 一键复制
- 📚 **本地知识库 (RAG)** — 上传 PDF / Word / TXT / 代码文件，AI 基于你的文档回答
- 🧑‍🎤 **AI 角色系统** — 自定义 System Prompt，创建专属 AI 助手
- 🌗 **深色 / 浅色主题** — 一键切换，CSS 变量驱动
- 🌍 **中英文国际化** — i18next 驱动，80+ 翻译条目
- ⌨️ **全局快捷键** — Ctrl+N 新对话、Ctrl+B 侧边栏、Ctrl+Shift+T 主题等
- 💾 **数据本地存储** — SQLite 数据库，所有数据完全离线
- 📤 **对话导出** — 支持导出 Markdown / JSON 格式
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
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 入口：窗口管理、自动更新
│   ├── preload.ts               # 安全桥接 (contextBridge)
│   ├── database/
│   │   └── connection.ts        # SQLite 数据库 (sql.js)
│   ├── ipc/
│   │   ├── index.ts             # IPC 处理器（对话/消息/角色/模型/设置）
│   │   ├── chat.ipc.ts          # 聊天 IPC（流式推送到渲染进程）
│   │   └── knowledge.ipc.ts     # 知识库 IPC（索引/检索/删除）
│   └── services/
│       ├── model-adapter/       # 模型适配层
│       │   ├── types.ts         # 抽象基类 + 类型定义
│       │   ├── openai-compatible-adapter.ts  # OpenAI 兼容适配器
│       │   ├── anthropic-adapter.ts          # Claude 适配器
│       │   ├── ollama-adapter.ts             # Ollama 适配器
│       │   ├── adapter-factory.ts            # 适配器工厂
│       │   └── provider-registry.ts          # 提供商注册表
│       └── rag/                 # RAG 知识库
│           ├── file-parser.ts   # 文件解析（PDF/DOCX/TXT/代码）
│           ├── text-chunker.ts  # 滑动窗口文本分块
│           ├── embedding.ts     # OpenAI Embedding 向量化
│           ├── vector-store.ts  # LanceDB 向量存储 + 语义检索
│           └── knowledge.ts     # RAG 编排器
├── src/                         # 渲染进程 (React)
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件（路由/初始化/快捷键）
│   ├── i18n/                    # 国际化
│   │   ├── index.ts             # i18next 初始化
│   │   └── locales/             # 中英文翻译文件
│   ├── components/
│   │   ├── sidebar/             # 侧边栏 + 对话列表
│   │   ├── chat/                # 对话区（输入框/消息/渲染/Markdown）
│   │   ├── settings/            # 设置面板（模型/AI角色）
│   │   └── knowledge/           # 知识库管理面板
│   ├── stores/                  # Zustand 状态管理
│   │   ├── chatStore.ts         # 对话/消息/流式状态
│   │   ├── modelStore.ts        # 模型配置状态
│   │   ├── settingsStore.ts     # 主题/侧边栏状态
│   │   └── knowledgeStore.ts    # 知识库状态
│   ├── services/
│   │   └── chat.ts              # 对话引擎（发送/流式监听/知识库注入）
│   ├── hooks/
│   │   └── useShortcuts.ts      # 全局快捷键
│   └── types/
│       ├── index.ts             # 核心类型
│       └── model.ts             # 模型类型
├── tailwind.config.ts           # TailwindCSS 配置
├── vite.config.ts               # Vite 构建配置
├── tsconfig.json                # 渲染进程 TS 配置
├── tsconfig.node.json           # 主进程 TS 配置
└── package.json                 # 依赖 + electron-builder
```

## 架构流程

```
用户输入 → ChatInput
              ↓
         ChatContainer.handleSend()
              ↓
         sendMessage() [src/services/chat.ts]
              ↓
    ① 添加用户消息到 Store + 写入 SQLite
    ② 添加空 AI 消息到 Store
    ③ 设置 stream 监听器
    ④ 如果开启知识库 → 检索 Top 3 相关文本块 → 注入 System Prompt
    ⑤ 调用 chat:completions IPC
              ↓
         [electron/ipc/chat.ipc.ts]
    ⑥ 通过 event.sender 直接发送 IPC 事件给渲染进程
    ⑦ 创建适配器 → 发起 SSE 流式请求
    ⑧ 每收到 chunk → webContents.send('chat:stream-chunk')
              ↓
         [src/services/chat.ts 监听]
    ⑨ appendToStreaming() → MessageItem 实时更新
    ⑩ stream-done → 保存到 SQLite → finishStreaming
```

## 本地知识库 (RAG) 工作流

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
# 或只生成免安装版
npx electron-builder --win --dir
```

## 打包

打包输出在 `release/win-unpacked/` 目录，找到 `ChatAI.exe` 双击运行。

```bash
# 完整构建 + 打包
npm run build

# 仅打包（需要先完成 build:renderer 和 build:electron）
npx electron-builder --win
```

首次使用需在设置中配置 API Key（支持 OpenAI / DeepSeek / 通义千问等），或在本地安装 [Ollama](https://ollama.com) 后添加本地模型（免费离线）。

## 许可证

MIT
