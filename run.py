#!/usr/bin/env python3
"""
数据库查询代理运行器
"""

import argparse
import asyncio
import sys
import time
from pathlib import Path

from app.agent.enhanced_database_query import EnhancedDatabaseQueryAgent
from app.logger import define_log_level, logger
from app.schema import AgentState

# 设置日志级别
logger = define_log_level(print_level="ERROR", logfile_level="ERROR")


async def interactive_mode(agent: EnhancedDatabaseQueryAgent, session_id: str = None):
    """交互式查询模式"""
    print("🚀 数据库查询代理已启动")
    print("💡 输入 'quit' 退出, 'clear' 重置会话")
    print("-" * 50)

    def status_callback(message: str):
        print(f"  {message}")

    await agent.reset()

    while True:
        try:
            user_input = input("\n❓ 请输入查询: ").strip()

            if user_input.lower() in ["quit", "exit", "q"]:
                print("👋 再见！")
                break

            if user_input.lower() in ["clear", "reset", "清空"]:
                await agent.reset()
                print("🔄 会话已重置")
                continue

            if not user_input:
                continue

            print("-" * 50)

            if agent.state != AgentState.IDLE:
                await agent.reset()

            start_time = time.time()
            result = await agent.run(user_input, status_callback=status_callback)
            elapsed_time = time.time() - start_time

            print("-" * 50)
            print("📊 查询结果:")
            print(result)
            print("-" * 50)
            print(f"⏱️  耗时: {elapsed_time:.2f}秒")

        except KeyboardInterrupt:
            print("\n👋 用户中断")
            break
        except Exception as e:
            print(f"❌ 错误: {e}")
            logger.error(f"Query error: {e}", exc_info=True)


async def single_query_mode(agent: EnhancedDatabaseQueryAgent, query: str):
    """单次查询模式"""
    print(f"🔍 执行查询: {query}")
    print("-" * 50)

    def status_callback(message: str):
        print(f"  {message}")

    try:
        await agent.reset()

        start_time = time.time()
        result = await agent.run(query, status_callback=status_callback)
        elapsed_time = time.time() - start_time

        print("-" * 50)
        print("📊 查询结果:")
        print(result)
        print("-" * 50)
        print(f"⏱️  耗时: {elapsed_time:.2f}秒")
        return result
    except Exception as e:
        print(f"❌ 错误: {e}")
        logger.error(f"Query failed: {e}", exc_info=True)
        return None


async def batch_mode(agent: EnhancedDatabaseQueryAgent, queries_file: str):
    """批处理模式"""
    try:
        with open(queries_file, "r", encoding="utf-8") as f:
            queries = [
                line.strip() for line in f if line.strip() and not line.startswith("#")
            ]

        print(f"📁 已加载 {len(queries)} 个查询")
        print("-" * 50)

        results = []
        success_count = 0
        total_time = 0

        for i, query in enumerate(queries, 1):
            print(f"\n🔍 查询 {i}/{len(queries)}: {query[:50]}...")
            try:
                await agent.reset()

                start_time = time.time()
                result = await agent.run(query)
                elapsed_time = time.time() - start_time
                total_time += elapsed_time

                success_count += 1
                results.append(
                    {
                        "query": query,
                        "result": result,
                        "status": "success",
                        "time": elapsed_time,
                    }
                )
                print(f"✅ 成功 (耗时: {elapsed_time:.2f}秒)")
            except Exception as e:
                elapsed_time = time.time() - start_time
                total_time += elapsed_time
                results.append(
                    {
                        "query": query,
                        "result": str(e),
                        "status": "error",
                        "time": elapsed_time,
                    }
                )
                print(f"❌ 失败: {e}")

        output_file = queries_file.replace(".txt", "_results.txt")
        with open(output_file, "w", encoding="utf-8") as f:
            for i, result in enumerate(results, 1):
                f.write(f"查询 {i}: {result['query']}\n")
                f.write(f"状态: {result['status']}\n")
                f.write(f"耗时: {result['time']:.2f}秒\n")
                f.write(f"结果: {result['result']}\n")
                f.write("-" * 80 + "\n\n")

        print("-" * 50)
        print(f"📊 完成统计: {success_count}/{len(queries)} 成功")
        print(f"⏱️  总耗时: {total_time:.2f}秒")
        print(f"📝 结果已保存至: {output_file}")
        return results

    except FileNotFoundError:
        print(f"❌ 文件未找到: {queries_file}")
        return None
    except Exception as e:
        print(f"❌ 批处理失败: {e}")
        return None


async def test_connection(agent: EnhancedDatabaseQueryAgent):
    """测试数据库连接"""
    print("🔧 测试数据库连接...")
    try:
        start_time = time.time()
        tables = await agent.get_cached_tables()
        elapsed_time = time.time() - start_time

        if tables:
            print("✅ 连接成功")
            if "data" in tables:
                print(f"📊 发现 {len(tables['data'])} 个表")
            print(f"⏱️  耗时: {elapsed_time:.2f}秒")
            return True
        else:
            print("⚠️  连接成功但未发现表")
            return False
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return False


def create_sample_queries_file():
    """创建示例查询文件"""
    sample_queries = """# 示例查询
查询所有用户
查询年龄大于25岁的用户
统计每个部门的员工数
"""
    filename = "sample_queries.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(sample_queries)
    print(f"📝 已创建 {filename}")


async def main():
    parser = argparse.ArgumentParser(description="数据库查询代理")
    parser.add_argument("-q", "--query", help="单次查询")
    parser.add_argument("-f", "--file", help="批处理文件路径")
    parser.add_argument("--test", action="store_true", help="测试连接")
    parser.add_argument("--create-sample", action="store_true", help="创建示例文件")
    parser.add_argument("--mcp-command", default=None, help="MCP命令")
    parser.add_argument("--mcp-args", nargs="*", default=None, help="MCP参数")
    parser.add_argument(
        "--connection-type", choices=["stdio", "sse"], default="stdio", help="连接类型"
    )
    parser.add_argument("--session", type=str, help="会话ID")

    args = parser.parse_args()

    if args.create_sample:
        create_sample_queries_file()
        return

    agent = EnhancedDatabaseQueryAgent()

    mcp_command = args.mcp_command
    mcp_args = args.mcp_args

    if not mcp_command and args.connection_type == "stdio":
        mcp_command = sys.executable
        if not mcp_args:
            mcp_args = ["-m", "mysql_mcp_server.server"]

    try:
        await agent.initialize(
            connection_type=args.connection_type,
            command=mcp_command,
            args=mcp_args,
        )

        if args.test:
            success = await test_connection(agent)
            sys.exit(0 if success else 1)
        elif args.query:
            result = await single_query_mode(agent, args.query)
            sys.exit(0 if result else 1)
        elif args.file:
            results = await batch_mode(agent, args.file)
            sys.exit(0 if results else 1)
        else:
            await interactive_mode(agent, args.session)

    except KeyboardInterrupt:
        print("\n👋 用户中断")
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)
    finally:
        try:
            await agent.cleanup()
        except Exception:
            pass


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
