"""
命令行交互入口 - 管理本地对话记忆。

用法：
    python cli.py add              # 交互式添加对话
    python cli.py search <查询>     # 语义搜索历史对话
    python cli.py list             # 列出所有对话
    python cli.py context <查询>    # 生成可注入 LLM 的上下文
    python cli.py delete <ID>      # 删除指定对话
    python cli.py rebuild           # 重建嵌入向量
"""

import sys

from memory_manager import MemoryManager


def cmd_add(memory: MemoryManager):
    """交互式添加对话"""
    print("=== 添加新对话 ===")
    print("逐行输入消息，格式：角色:内容（如 'user:你好' 或 'assistant:你好呀'）")
    print("输入空行结束，输入 'q' 取消\n")

    messages = []
    while True:
        line = input(f"[{len(messages) + 1}] ").strip()
        if line == "":
            if messages:
                break
            continue
        if line.lower() == "q":
            print("已取消。")
            return

        if ":" in line:
            role, content = line.split(":", 1)
            role = role.strip().lower()
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content.strip()})
            else:
                print("角色必须是 user 或 assistant，请重新输入")
        else:
            print("格式错误，请使用 角色:内容 的格式")

    if not messages:
        print("未输入任何消息，已取消。")
        return

    topic = input("主题（留空自动生成）: ").strip()
    tags_input = input("标签（逗号分隔，留空跳过）: ").strip()
    tags = [t.strip() for t in tags_input.split(",") if t.strip()] if tags_input else []

    conv_id = memory.add_conversation(messages, topic=topic, tags=tags)
    print(f"\n已保存！对话 ID: {conv_id}")


def cmd_search(memory: MemoryManager, query: str):
    """语义搜索历史对话"""
    print(f"搜索: \"{query}\"\n")
    results = memory.search(query, top_k=10, include_messages=True)

    if not results:
        print("未找到相关对话。")
        return

    for i, r in enumerate(results, 1):
        ts = r["timestamp"][:19].replace("T", " ")
        print(f"{i}. [{r['score']:.0%}] {r['topic']}")
        print(f"   ID: {r['id']}  |  时间: {ts}")
        if r["tags"]:
            print(f"   标签: {', '.join(r['tags'])}")
        print(f"   消息数: {len(r['messages'])}")
        print()


def cmd_list(memory: MemoryManager):
    """列出所有对话"""
    convs = memory.list_conversations(limit=50)
    if not convs:
        print("暂无对话记录。")
        return

    print(f"共 {memory.count} 条对话，最近 {len(convs)} 条：\n")
    for i, c in enumerate(convs, 1):
        ts = c["timestamp"][:19].replace("T", " ")
        print(f"{i}. [{c['id']}] {ts}")
        print(f"   {c['topic']}")
        if c["tags"]:
            print(f"   标签: {', '.join(c['tags'])}")
        print(f"   消息数: {c['message_count']}")
        print()


def cmd_context(memory: MemoryManager, query: str):
    """构建 LLM 上下文"""
    print(f"为查询 \"{query}\" 构建上下文:\n")
    context = memory.build_context(query)
    if context:
        print(context)
        print("\n---")
        print("将以上内容复制到你的 system prompt 或对话开头即可。")
    else:
        print("（无相关历史对话）")


def cmd_delete(memory: MemoryManager, conv_id: str):
    """删除对话"""
    conv = memory.get_conversation(conv_id)
    if not conv:
        print(f"未找到对话: {conv_id}")
        return

    print(f"将删除: [{conv['id']}] {conv['topic']}")
    confirm = input("确认删除？(y/N): ").strip().lower()
    if confirm == "y":
        memory.delete_conversation(conv_id)
        print("已删除。")
    else:
        print("已取消。")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    command = sys.argv[1].lower()

    print("正在初始化记忆管理器（首次运行需下载模型，约 400MB）...")
    memory = MemoryManager()
    print(f"当前记忆数: {memory.count}\n")

    if command == "add":
        cmd_add(memory)
    elif command == "search":
        query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else input("查询内容: ")
        if not query.strip():
            print("请输入查询内容。")
            return
        cmd_search(memory, query)
    elif command == "list":
        cmd_list(memory)
    elif command == "context":
        query = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else input("查询内容: ")
        if not query.strip():
            print("请输入查询内容。")
            return
        cmd_context(memory, query)
    elif command == "delete":
        if len(sys.argv) > 2:
            cmd_delete(memory, sys.argv[2])
        else:
            conv_id = input("对话 ID: ").strip()
            cmd_delete(memory, conv_id)
    elif command == "rebuild":
        memory.rebuild_embeddings()
    else:
        print(f"未知命令: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
