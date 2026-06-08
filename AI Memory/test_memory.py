"""
测试脚本 - 验证记忆系统的完整流程（无需安装 PyTorch）
"""
import sys
import os

# 添加当前目录到 path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from memory_manager import MemoryManager

# 使用临时文件避免污染正式数据
TEST_FILE = "test_memory.json"


def cleanup():
    if os.path.exists(TEST_FILE):
        os.remove(TEST_FILE)


def test_add_and_list():
    """测试添加和列出对话"""
    print("=" * 50)
    print("测试 1: 添加对话")
    print("=" * 50)

    memory = MemoryManager(storage_path=TEST_FILE)

    # 添加第一条对话 - 关于 Python
    cid1 = memory.add_conversation(
        messages=[
            {"role": "user", "content": "Python 中如何实现单例模式？"},
            {"role": "assistant", "content": "可以使用 __new__ 方法、装饰器或元类来实现单例模式..."},
        ],
        tags=["python", "设计模式"],
    )
    print(f"已添加对话 1, ID: {cid1}")

    # 添加第二条 - 关于 Docker
    cid2 = memory.add_conversation(
        messages=[
            {"role": "user", "content": "Docker 镜像构建太慢了怎么办？"},
            {"role": "assistant", "content": "可以使用多阶段构建、合理利用缓存层、使用 .dockerignore..."},
        ],
        tags=["docker", "devops"],
    )
    print(f"已添加对话 2, ID: {cid2}")

    # 添加第三条 - 也是关于 Python
    cid3 = memory.add_conversation(
        messages=[
            {"role": "user", "content": "Python 装饰器的原理是什么？"},
            {"role": "assistant", "content": "装饰器本质上是一个接受函数作为参数并返回新函数的高阶函数..."},
        ],
        tags=["python"],
    )
    print(f"已添加对话 3, ID: {cid3}")

    assert memory.count == 3, f"应有 3 条记录，实际 {memory.count}"
    print("测试 1 通过！\n")
    return memory, cid1, cid2, cid3


def test_search(memory):
    """测试语义搜索"""
    print("=" * 50)
    print("测试 2: 语义搜索")
    print("=" * 50)

    # 搜索 Python 相关
    results = memory.search("Python 编程技巧", top_k=5)

    print("搜索: 'Python 编程技巧'")
    for r in results:
        print(f"  [{r['score']:.2f}] {r['topic']}")

    assert len(results) >= 2, f"应至少找到 2 条 Python 相关结果，实际 {len(results)}"
    # 第一条应该是最相关的 Python 对话
    assert "python" in results[0]["tags"] or "Python" in results[0]["topic"]
    print("测试 2 通过！\n")


def test_context_building(memory):
    """测试上下文构建"""
    print("=" * 50)
    print("测试 3: 构建 LLM 上下文")
    print("=" * 50)

    context = memory.build_context("Python 装饰器怎么用？", top_k=3)

    print("生成的上下文:\n")
    print(context[:500] + "..." if len(context) > 500 else context)

    assert "历史相关对话记录" in context
    assert len(context) > 50
    print("\n测试 3 通过！\n")


def test_delete(memory, cid):
    """测试删除"""
    print("=" * 50)
    print("测试 4: 删除对话")
    print("=" * 50)

    before = memory.count
    success = memory.delete_conversation(cid)
    assert success
    assert memory.count == before - 1
    assert memory.get_conversation(cid) is None
    print(f"已删除 {cid}，当前总记录数: {memory.count}")
    print("测试 4 通过！\n")


def test_save_and_reload():
    """测试数据持久化"""
    print("=" * 50)
    print("测试 5: 数据持久化（重新加载）")
    print("=" * 50)

    # 重新从文件加载
    memory2 = MemoryManager(storage_path=TEST_FILE)
    print(f"重新加载后记录数: {memory2.count}")
    assert memory2.count > 0
    print("测试 5 通过！\n")


def main():
    try:
        cleanup()

        memory, cid1, cid2, cid3 = test_add_and_list()
        test_search(memory)
        test_context_building(memory)
        test_delete(memory, cid1)
        test_save_and_reload()

        print("=" * 50)
        print("全部测试通过！")
        print("=" * 50)
    finally:
        cleanup()
        print("已清理测试文件。")


if __name__ == "__main__":
    main()
