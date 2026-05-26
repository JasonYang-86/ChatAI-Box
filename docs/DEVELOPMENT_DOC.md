# 🖥️ ChatAI — 开发文档 v1.0

---

## 一、项目概述

### 1.1 项目名称

**ChatAI**（暂定名）

### 1.2 一句话描述

一款仅 Windows 平台的极简风格桌面 AI 聊天软件，支持全部主流 AI 模型自由切换，数据完全本地存储，功能全面对标并超越 Chatbox。

### 1.3 产品定位

| 维度 | 描述 |
|------|------|
| 产品形态 | 纯桌面应用（Electron） |
| 目标平台 | Windows |
| 目标用户 | V1：个人用户 + 知识工作者；V2：团队用户 |
| 盈利模式 | V1 暂不考虑，先做产品 |
| 开发节奏 | 不设严格时限，业余时间推进 |

### 1.4 核心差异化

相比于 Chatbox 等竞品，本产品的五大优势：

1. **极致 UI/UX** — 极简聊天风格，类似 Apple Messages，清爽干净
2. **强大 Prompt 系统** — Prompt 模板、变量插值、工作流引擎
3. **深度本地知识库** — 内置 RAG 检索增强，本地文件智能问答
4. **纯粹隐私保护** — 数据完全本地存储，零遥测，零回传
5. **丰富模型生态** — 同时支持 OpenAI、Claude、国产模型（DeepSeek/通义千问）、本地 Ollama

---

## 二、技术架构

### 2.1 总体架构

```
┌─────────────────────────────────────────────────┐
│                    Electron Shell                 │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Main Process │  │  Preload     │              │
│  │  (Node.js)    │  │  (Bridge)    │              │
│  │               │  │              │              │
│  │  - IPC通信     │  │  - 安全桥接   │              │
│  │  - 文件系统    │  │  - API暴露    │              │
│  │  - 系统托盘    │  │              │              │
│  │  - 自动更新    │  │              │              │
│  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                       │
│  ┌──────┴─────────────────┴───────┐              │
│  │        Renderer Process         │              │
│  │  ┌────────────────────────┐    │              │
│  │  │   React + TypeScript   │    │              │
│  │  │   + TailwindCSS        │    │              │
│  │  │   + Zustand (状态管理)   │    │              │
│  │  └────────────────────────┘    │              │
│  │                                 │              │
│  │  ┌────────────────────────┐    │              │
│  │  │   核心模块               │    │              │
│  │  │   - 对话引擎             │    │              │
│  │  │   - 模型适配层           │    │              │
│  │  │   - RAG 知识库           │    │              │
│  │  │   - Prompt 工作流        │    │              │
│  │  └────────────────────────┘    │              │
│  └────────────────────────────────┘              │
│                                                   │
│  ┌──────────────────────────────┐                │
│  │   SQLite (better-sqlite3)     │                │
│  │   - 对话历史                   │                │
│  │   - AI角色预设                 │                │
│  │   - Prompt模板                 │                │
│  │   - 知识库索引                 │                │
│  └──────────────────────────────┘                │
└─────────────────────────────────────────────────┘
```

### 2.2 技术选型清单

| 层级 | 技术 | 选型理由 |
|------|------|---------|
| 桌面框架 | Electron 28+ | 生态成熟、开发效率高、社区大 |
| 前端框架 | React 18 + TypeScript 5 | 类型安全、生态丰富、团队熟悉度高 |
| UI 框架 | TailwindCSS 3 | 原子化CSS，灵活构建极简风格 |
| 状态管理 | Zustand | 轻量、无boilerplate、支持持久化 |
| 数据库 | better-sqlite3 | 同步API、性能高、嵌入式无需服务 |
| 打包工具 | electron-builder | Windows 签名 + NSIS 安装包 |
| 自动更新 | electron-updater | 支持 GitHub Releases 增量更新 |
| 代码编辑器 | Monaco Editor (代码输入) / CodeMirror | 代码块编辑和展示 |
| Markdown | react-markdown + rehype-highlight | 渲染 + 代码语法高亮 |
| 国际化 | i18next + react-i18next | 多语言支持 |
| 测试 | Vitest + Playwright | 单元 + E2E |
| 代码规范 | ESLint + Prettier | 统一风格 |

### 2.3 目录结构

```
ChatAI/
├── electron/                    # Electron 主进程
│   ├── main.ts                  # 主进程入口
│   ├── preload.ts               # 预加载脚本
│   ├── ipc/                     # IPC 通信处理
│   │   ├── chat.ipc.ts          # 对话相关 IPC
│   │   ├── file.ipc.ts          # 文件操作 IPC
│   │   ├── model.ipc.ts         # 模型配置 IPC
│   │   └── knowledge.ipc.ts     # 知识库 IPC
│   ├── database/                # 数据库层
│   │   ├── connection.ts        # 数据库连接
│   │   ├── migrations/          # 数据库迁移
│   │   └── repositories/        # 数据仓库
│   ├── services/                # 主进程服务
│   │   ├── model-adapter/       # 模型适配层
│   │   ├── rag/                 # RAG 知识库引擎
│   │   ├── file-parser/         # 文件解析器
│   │   └── updater.ts           # 自动更新
│   └── utils/                   # 工具函数
│
├── src/                         # 渲染进程（React前端）
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/              # 通用组件
│   │   ├── ui/                  # 基础 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Dropdown.tsx
│   │   │   └── ...
│   │   ├── chat/                # 对话相关组件
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── StreamingText.tsx
│   │   ├── sidebar/             # 侧边栏
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ConversationList.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── prompt/              # Prompt 系统
│   │   │   ├── PromptLibrary.tsx
│   │   │   ├── PromptEditor.tsx
│   │   │   └── VariableInput.tsx
│   │   ├── knowledge/           # 知识库
│   │   │   ├── KnowledgeManager.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   └── KnowledgeStatus.tsx
│   │   └── settings/            # 设置
│   │       ├── SettingsPanel.tsx
│   │       ├── ModelConfig.tsx
│   │       └── ThemeSelector.tsx
│   ├── stores/                  # Zustand 状态管理
│   │   ├── chatStore.ts
│   │   ├── modelStore.ts
│   │   ├── promptStore.ts
│   │   ├── settingsStore.ts
│   │   └── knowledgeStore.ts
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useChat.ts
│   │   ├── useStreaming.ts
│   │   ├── useModel.ts
│   │   └── useKnowledge.ts
│   ├── services/                # 前端服务层
│   │   ├── api.ts               # IPC 调用封装
│   │   └── modelRegistry.ts     # 模型注册表
│   ├── i18n/                    # 国际化
│   │   ├── locales/
│   │   │   ├── zh-CN.json
│   │   │   └── en-US.json
│   │   └── index.ts
│   ├── types/                   # TypeScript 类型
│   │   ├── chat.ts
│   │   ├── model.ts
│   │   ├── prompt.ts
│   │   └── knowledge.ts
│   └── styles/                  # 全局样式
│       ├── globals.css
│       └── themes/
│           ├── light.css
│           └── dark.css
│
├── resources/                   # 应用资源
│   ├── icons/
│   └── fonts/
│
├── package.json
├── electron-builder.yml         # 打包配置
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts               # Vite 配置（渲染进程）
└── vitest.config.ts
```

---

## 三、功能规格说明

### 3.1 V1 功能清单（按优先级）

#### P0 — 核心必备（第一期交付）

| 编号 | 功能模块 | 功能描述 | 验收标准 |
|------|---------|---------|---------|
| F01 | 对话引擎 | 用户输入文本，AI返回回复 | 单轮问答正常，错误提示友好 |
| F02 | 流式输出 | AI回复逐字/逐token显示 | 延迟 < 50ms，支持中途停止 |
| F03 | 多轮对话记忆 | 携带历史对话上下文 | 上下文窗口可配置（默认8K） |
| F04 | 对话历史管理 | 新建/切换/删除/重命名对话 | 列表流畅，搜索 < 500ms |
| F05 | 模型切换 | 切换不同AI模型和API | 无缝切换，配置持久化 |
| F06 | Markdown渲染 | 富文本显示AI回复 | 标题/列表/表格/代码块正确渲染 |
| F07 | 代码语法高亮 | 代码块语言识别和高亮 | 支持50+语言，有复制按钮 |
| F08 | 自定义AI角色 | 创建/编辑/删除System Prompt预设 | 保存后下次可用 |
| F09 | 文件上传处理 | 上传图片/文档让AI分析 | 支持jpg/png/pdf/txt/docx |
| F10 | 多语言界面 | 中英文切换 | 切换即时生效 |
| F11 | 本地知识库(RAG) | 索引本地文件，语义检索后对话 | 检索召回率 > 80% |
| F12 | 深色/浅色模式 | 支持亮色暗色主题切换 | 切换即时生效，跟随系统可选 |

#### P1 — 重要功能（第二期交付）

| 编号 | 功能模块 | 功能描述 |
|------|---------|---------|
| F13 | Prompt模板库 | 预设模板 + 自定义模板 + 变量插值 |
| F14 | 对话搜索 | 全文搜索历史对话内容 |
| F15 | 对话导出 | 导出为 Markdown/JSON/PDF |
| F16 | 对话分支 | 从某条消息开始分叉新对话 |
| F17 | Token计数 | 实时显示当前对话token消耗 |
| F18 | 快捷键 | 完整的键盘快捷键系统 |
| F19 | 自动更新 | 启动检查 + 用户确认升级 |

### 3.2 模型适配规范

#### 支持的模型提供商

```typescript
type ModelProvider =
  | 'openai'        // GPT-4o, GPT-4o-mini, GPT-4-turbo
  | 'anthropic'     // Claude 3.5 Sonnet, Claude 3 Opus
  | 'deepseek'      // DeepSeek-V3, DeepSeek-R1
  | 'tongyi'        // 通义千问系列
  | 'moonshot'      // Kimi 系列
  | 'ollama'        // 本地模型 (Llama, Qwen, Mistral等)
  | 'openai-compatible'  // 兼容OpenAI协议的自定义端点
```

#### 统一适配层接口

```typescript
interface IModelAdapter {
  readonly provider: ModelProvider;
  
  /** 发送聊天请求（非流式） */
  chat(request: ChatRequest): Promise<ChatResponse>;
  
  /** 发送聊天请求（流式） */
  chatStream(request: ChatRequest): AsyncGenerator<ChatChunk>;
  
  /** 获取模型列表 */
  listModels(): Promise<ModelInfo[]>;
  
  /** 验证API Key是否有效 */
  validateKey(apiKey: string): Promise<boolean>;
  
  /** Token计数 */
  countTokens(messages: Message[]): number;
}

interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  files?: AttachedFile[];
}
```

### 3.3 Prompt 系统设计

```
Prompt 模板结构：
├── 模板名称
├── 模板描述
├── 分类标签
├── System Prompt 内容
│   ├── 静态文本
│   └── 变量插值 {{variable_name}}
├── 用户消息模板（可选）
└── 变量定义列表
    ├── 变量名
    ├── 默认值
    ├── 类型（text / select / file）
    └── 选项（select类型时）
```

### 3.4 知识库（RAG）设计

```
知识库工作流：
1. 用户上传文件 → 
2. 文件解析（提取文本） → 
3. 文本分块（Chunking） → 
4. Embedding 向量化 → 
5. 向量存储 → 
6. 用户提问时检索相似块 → 
7. 拼接上下文注入对话
```

技术选型：
- **Embedding 模型**：通过 API 调用（OpenAI text-embedding-3-small 或本地模型）
- **向量存储**：LanceDB（嵌入式向量数据库，零配置）
- **分块策略**：滑动窗口，chunk_size=512, overlap=50

---

## 四、UI/UX 设计规范

### 4.1 设计原则

1. **极简至上** — 每个界面最多3个操作入口
2. **对话即界面** — 对话区域占视觉重心 > 70%
3. **渐进披露** — 高级功能折叠收起，简单场景一键直达
4. **一致性** — 统一的间距、圆角、阴影、动效规范

### 4.2 布局结构

```
┌──────────┬──────────────────────────────────────┐
│          │                                      │
│  侧边栏   │           对话区域                    │
│          │                                      │
│  ┌────┐  │  ┌────────────────────────────────┐  │
│  │搜索│  │  │  AI角色名      模型选择器       │  │
│  └────┘  │  │───────────────────────────── │  │
│          │  │                                │  │
│  📁 对话  │  │      消 息 列 表               │  │
│  ├ 对话1 │  │      (用户/AI气泡)             │  │
│  ├ 对话2 │  │                                │  │
│  └ 对话3 │  │                                │  │
│          │  │                                │  │
│  ──────  │  │───────────────────────────── │  │
│          │  │  输入框              [发送]     │  │
│  📋 Prompt│  │  文件 🖼️ 知识库 📚 角色 👤   │  │
│  模板库  │  │                                │  │
│          │  └────────────────────────────────┘  │
│  ⚙️ 设置  │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
    280px                    剩余宽度
```

### 4.3 色彩系统

```css
/* 浅色主题 */
--bg-primary: #FFFFFF;
--bg-secondary: #F5F5F7;
--bg-tertiary: #EBEBED;
--text-primary: #1D1D1F;
--text-secondary: #6E6E73;
--accent: #007AFF;        /* 蓝色主色调 */
--user-bubble: #007AFF;
--ai-bubble: #F0F0F0;
--border: #E5E5EA;

/* 深色主题 */
--bg-primary: #1C1C1E;
--bg-secondary: #2C2C2E;
--bg-tertiary: #3A3A3C;
--text-primary: #F5F5F7;
--text-secondary: #98989D;
--accent: #0A84FF;
--user-bubble: #0A84FF;
--ai-bubble: #2C2C2E;
--border: #38383A;
```

### 4.4 字体规范

| 用途 | 字体 | 大小 | 字重 |
|------|------|------|------|
| 主标题 | System-ui | 24px | 600 |
| 次标题 | System-ui | 18px | 500 |
| 正文 | System-ui | 15px | 400 |
| 辅助文字 | System-ui | 13px | 400 |
| 代码 | JetBrains Mono / Cascadia Code | 14px | 400 |
| 对话气泡 | System-ui | 15px | 400 |

### 4.5 动效规范

| 场景 | 动效 | 时长 |
|------|------|------|
| 页面切换 | 淡入淡出 | 200ms ease |
| 侧边栏展开 | 滑动 | 250ms ease-out |
| 消息出现 | 从下淡入 | 150ms ease |
| 按钮悬停 | 轻微放大(1.02) | 150ms ease |
| Loading | 三点跳动 | 无限循环 |
| 流式文字 | 光标闪烁 | 1s step-end 无限 |

---

## 五、数据模型设计

### 5.1 数据库表结构（SQLite）

```sql
-- 对话会话表
CREATE TABLE conversations (
    id              TEXT PRIMARY KEY,          -- UUID
    title           TEXT NOT NULL DEFAULT '新对话',
    model_id        TEXT NOT NULL,             -- 使用的模型标识
    system_prompt   TEXT,                      -- 系统提示词
    character_id    TEXT,                      -- AI角色ID（可选）
    created_at      INTEGER NOT NULL,          -- Unix timestamp
    updated_at      INTEGER NOT NULL,
    is_pinned       INTEGER DEFAULT 0,         -- 是否置顶
    is_archived     INTEGER DEFAULT 0          -- 是否归档
);

-- 消息表
CREATE TABLE messages (
    id              TEXT PRIMARY KEY,          -- UUID
    conversation_id TEXT NOT NULL,
    role            TEXT NOT NULL,             -- 'user' | 'assistant' | 'system'
    content         TEXT NOT NULL,
    token_count     INTEGER,                   -- token数量（估算）
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 消息附件表
CREATE TABLE attachments (
    id              TEXT PRIMARY KEY,
    message_id      TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,             -- 本地文件路径
    file_type       TEXT NOT NULL,             -- MIME type
    file_size       INTEGER,
    extracted_text  TEXT,                      -- 提取的文本内容
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- AI角色表
CREATE TABLE characters (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    system_prompt   TEXT NOT NULL,
    avatar          TEXT,                      -- emoji 或 图标名
    is_builtin      INTEGER DEFAULT 0,         -- 是否内置角色
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- 模型配置表
CREATE TABLE model_configs (
    id              TEXT PRIMARY KEY,
    provider        TEXT NOT NULL,             -- 提供商
    model_name      TEXT NOT NULL,             -- 模型名
    display_name    TEXT NOT NULL,             -- 显示名
    api_key         TEXT NOT NULL,             -- 加密存储的API Key
    base_url        TEXT,                      -- 自定义端点
    parameters      TEXT,                      -- JSON: {temperature, maxTokens, ...}
    is_enabled      INTEGER DEFAULT 1,
    sort_order      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL
);

-- Prompt模板表
CREATE TABLE prompt_templates (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    category        TEXT,                      -- 分类
    content         TEXT NOT NULL,             -- Prompt内容（含{{变量}}）
    variables       TEXT,                      -- JSON: 变量定义
    is_builtin      INTEGER DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- 知识库文件表
CREATE TABLE knowledge_files (
    id              TEXT PRIMARY KEY,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    file_size       INTEGER,
    chunk_count     INTEGER DEFAULT 0,
    status          TEXT DEFAULT 'pending',    -- 'pending' | 'processing' | 'ready' | 'error'
    created_at      INTEGER NOT NULL
);

-- 知识库向量块表（元数据，向量数据存在LanceDB）
CREATE TABLE knowledge_chunks (
    id              TEXT PRIMARY KEY,
    file_id         TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT NOT NULL,
    token_count     INTEGER,
    created_at      INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES knowledge_files(id) ON DELETE CASCADE
);

-- 应用设置表（Key-Value）
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);
```

### 5.2 TypeScript 类型定义

```typescript
// ============ 对话相关 ============
interface Conversation {
  id: string;
  title: string;
  modelId: string;
  systemPrompt?: string;
  characterId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  isArchived: boolean;
  lastMessage?: string;  // 最后一条消息预览（前端计算）
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount?: number;
  createdAt: number;
  attachments?: Attachment[];
  isStreaming?: boolean;   // 前端状态：是否正在流式接收
}

interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText?: string;
}

// ============ 模型相关 ============
interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  parameters: ModelParameters;
  isEnabled: boolean;
  sortOrder: number;
}

interface ModelParameters {
  temperature: number;     // 0-2, default: 0.7
  maxTokens: number;       // default: 4096
  topP: number;            // default: 1.0
  frequencyPenalty: number;// default: 0
  presencePenalty: number; // default: 0
}

// ============ AI角色 ============
interface Character {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  avatar: string;
  isBuiltin: boolean;
}

// ============ Prompt模板 ============
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;               // 含 {{variable}} 占位符
  variables: TemplateVariable[];
  isBuiltin: boolean;
}

interface TemplateVariable {
  name: string;
  defaultValue: string;
  type: 'text' | 'select' | 'multiline';
  options?: string[];             // select 类型的选项
  required: boolean;
}

// ============ 知识库 ============
interface KnowledgeFile {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
}

interface KnowledgeChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  score?: number;  // 检索时的相似度分数
}
```

---

## 六、API Key 安全方案

由于数据全部本地存储，API Key 的安全性至关重要：

```
存储策略：
┌─────────────────────────────────────────┐
│  用户输入 API Key                        │
│      ↓                                   │
│  使用 Electron safeStorage 加密          │
│  (Windows DPAPI / macOS Keychain)       │
│      ↓                                   │
│  加密后的密文存入 SQLite                  │
│      ↓                                   │
│  使用时通过 safeStorage 解密到内存        │
│      ↓                                   │
│  进程退出时清除内存中的明文               │
└─────────────────────────────────────────┘
```

---

## 七、开发阶段规划

### Phase 1：项目初始化（预计 2 周）

- [ ] 搭建 Electron + React + TypeScript 项目骨架
- [ ] 配置 Vite、TailwindCSS、ESLint、Prettier
- [ ] 实现主进程与渲染进程 IPC 通信框架
- [ ] 配置 SQLite 数据库和迁移脚本
- [ ] 搭建基础的 UI 布局（侧边栏 + 对话区域）
- [ ] 实现深色/浅色主题切换

### Phase 2：核心对话（预计 4 周）

- [ ] 实现统一模型适配层接口
- [ ] 接入 OpenAI API（流式 + 非流式）
- [ ] 实现对话引擎（发送消息 + 流式接收）
- [ ] 实现消息列表渲染（Markdown + 代码高亮）
- [ ] 实现对话会话管理（新建/切换/删除/重命名）
- [ ] 实现 ChatInput 组件（多行输入、快捷键发送）

### Phase 3：高级功能（预计 4 周）

- [ ] 接入 Anthropic Claude API
- [ ] 接入 DeepSeek / 通义千问 API
- [ ] 接入本地 Ollama
- [ ] 实现 AI 角色系统（System Prompt 预设）
- [ ] 实现 Prompt 模板系统（含变量插值）
- [ ] 实现文件上传和解析（图片/PDF/文档）
- [ ] 实现对话全文搜索

### Phase 4：知识库系统（预计 3 周）

- [ ] 集成 LanceDB 向量数据库
- [ ] 实现文件文本提取和分块
- [ ] 实现 Embedding 向量化
- [ ] 实现语义检索和上下文注入
- [ ] 知识库管理 UI

### Phase 5：打磨发布（预计 2 周）

- [ ] 多语言国际化（中/英）
- [ ] 快捷键系统
- [ ] 自动更新配置
- [ ] electron-builder 打包配置
- [ ] 对话导出功能
- [ ] 性能优化和 Bug 修复
- [ ] 编写隐私政策和用户协议

---

## 八、开发规范

### 8.1 Git 提交规范

```
feat: 新功能
fix: 修复Bug
refactor: 代码重构
style: 样式调整
docs: 文档更新
chore: 构建/工具变动
perf: 性能优化
test: 测试相关
```

### 8.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件/文件夹 | kebab-case | `chat-container.tsx` |
| React 组件 | PascalCase | `ChatContainer` |
| 函数/变量 | camelCase | `sendMessage` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TOKENS` |
| 接口/类型 | PascalCase（不加 I/T 前缀） | `Conversation` |
| Store | camelCase + Store | `useChatStore` |
| Hook | camelCase + use | `useChat` |
| 数据库表 | snake_case 复数 | `conversations` |

### 8.3 组件编写规范

```tsx
// 推荐结构顺序
import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chatStore';
import type { Message } from '@/types/chat';

interface ChatInputProps {
  conversationId: string;
  onSend: (content: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ conversationId, onSend }) => {
  const [input, setInput] = useState('');
  
  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };
  
  return (
    <div className="flex items-center gap-2 p-3 border-t">
      <textarea
        className="flex-1 resize-none rounded-lg bg-secondary p-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="输入消息..."
        rows={1}
      />
      <button
        className="rounded-lg bg-accent px-4 py-2 text-white"
        onClick={handleSend}
      >
        发送
      </button>
    </div>
  );
};
```

---

## 九、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| API Key 泄露 | 用户经济损失 | 使用 Electron safeStorage 加密 |
| 大文件处理卡顿 | 用户体验差 | 文件解析放入 Worker 线程 |
| 大量对话历史 | 数据库性能下降 | 虚拟列表 + 分页加载 + FTS5 索引 |
| Electron 内存占用高 | 系统资源紧张 | 懒加载、及时释放、控制渲染进程 |
| 国产模型 API 不稳定 | 功能不可用 | 错误重试 + 降级提示 + 健康检查 |
| 向量数据库过大 | 磁盘占用高 | 设置知识库上限、定期清理 |

---

> 本文档将随项目开发持续更新。
> 
> 最后更新：2026-05-25
