import asyncio
import json
import time
from typing import Any, Callable, Dict, List, Optional

from pydantic import Field

from app.agent.mcp import MCPAgent
from app.logger import logger
from app.prompt.database_query import (
    DATABASE_QUERY_NEXT_STEP,
    DATABASE_QUERY_SYSTEM_PROMPT,
)
from app.schema import AgentState


class EnhancedDatabaseQueryAgent(MCPAgent):
    """
    增强型数据库查询代理 (Enhanced Database Query Agent)

    功能：
    - 智能连接数据库并执行查询
    - 自适应元数据加载策略（全量/按需）
    - 支持中文状态反馈
    - 自动缓存表结构以提升性能
    """

    name: str = "enhanced_database_query_agent"
    description: str = "一个通过查询数据库来回答问题的增强型代理。"

    # 使用数据库专用的系统提示词
    system_prompt: str = DATABASE_QUERY_SYSTEM_PROMPT
    next_step_prompt: str = DATABASE_QUERY_NEXT_STEP

    # 元数据缓存配置
    metadata_cache: dict = Field(default_factory=dict)
    cache_expiry: int = Field(default=1800, description="缓存有效期（秒）")
    last_cache_update: float = Field(default=0.0, description="上次缓存更新时间")

    # 查询状态追踪
    query_results: Optional[str] = None
    max_retries: int = Field(default=3, description="最大重试次数")

    # 加载策略配置
    metadata_injected: bool = Field(default=False, description="元数据是否已注入")
    loading_strategy: str = Field(
        default="auto", description="加载策略: auto/full/on_demand"
    )
    table_count_threshold: int = Field(default=15, description="策略切换阈值")

    # 状态回调函数
    _status_callback: Optional[Callable[[str], None]] = None

    async def initialize(
        self,
        connection_type: str = "stdio",
        command: Optional[str] = None,
        args: Optional[List[str]] = None,
        loading_strategy: str = "on_demand",
        status_callback: Optional[Callable[[str], None]] = None,
    ) -> None:
        """
        初始化代理并连接MCP服务器

        参数:
            connection_type: 连接类型 (stdio/sse)
            command: MCP服务器命令
            args: MCP服务器参数
            loading_strategy: 元数据加载策略
            status_callback: 状态回调函数
        """
        self._status_callback = status_callback
        self._report_status("🔌 正在连接MCP服务器...")

        await super().initialize(
            connection_type=connection_type,
            command=command,
            args=args,
        )

        # 重置状态
        self.query_results = None
        self.metadata_cache = {}
        self.last_cache_update = 0.0
        self.metadata_injected = False
        self.loading_strategy = loading_strategy

        # 预加载基础元数据
        self._report_status("📊 正在预加载数据库元数据...")
        await self._preload_basic_metadata()

        # 配置元数据策略
        self._report_status("⚙️ 正在配置元数据加载策略...")
        await self._inject_metadata_with_strategy()

        self._report_status("✅ 初始化完成")

    def _report_status(self, message: str):
        """报告当前状态"""
        if self._status_callback:
            self._status_callback(message)
        logger.info(message)

    async def reset(self):
        """重置代理状态（保留连接）"""
        self.query_results = None
        self.messages = []

    async def _preload_basic_metadata(self):
        """预加载基础元数据（表列表）"""
        current_time = time.time()

        # 检查缓存是否有效
        if (current_time - self.last_cache_update) < self.cache_expiry:
            return

        try:
            # 调用MCP工具获取表列表
            tables_result = await self._execute_mcp_tool("list_tables", {})
            tables_data = json.loads(tables_result)

            # 更新缓存
            self.metadata_cache = {
                "tables": tables_data,
                "schemas": {},
                "timestamp": current_time,
            }
            self.last_cache_update = current_time

            table_count = len(tables_data.get("data", []))
            self._report_status(f"📋 发现 {table_count} 个数据表")
        except Exception as e:
            logger.warning(f"Failed to preload basic metadata: {e}")
            self._report_status(f"⚠️ 元数据预加载失败: {e}")

    async def _inject_metadata_with_strategy(self):
        """根据策略注入元数据到系统提示词"""
        if self.metadata_injected:
            return

        try:
            tables_data = self.metadata_cache.get("tables", {})
            if not tables_data or "data" not in tables_data:
                logger.warning("No tables found in database")
                return

            table_count = len(tables_data["data"])

            # 自动选择策略
            if self.loading_strategy == "auto":
                strategy = (
                    "full" if table_count < self.table_count_threshold else "on_demand"
                )
            else:
                strategy = self.loading_strategy

            self._report_status(f"📝 使用加载策略: {strategy}")

            if strategy == "full":
                await self._inject_full_metadata(tables_data)
            else:
                await self._inject_relationship_metadata(tables_data)

            self.metadata_injected = True

        except Exception as e:
            logger.error(f"Failed to inject metadata: {e}", exc_info=True)
            self._report_status(f"❌ 元数据注入失败: {e}")

    async def _inject_full_metadata(self, tables_data: dict):
        """注入完整元数据（包含所有表结构）"""
        table_count = len(tables_data["data"])
        self._report_status(f"📥 正在加载 {table_count} 个表的完整结构...")

        metadata_text = "\n\n## 📊 数据库结构信息 (完整)\n\n"

        # 并行加载所有表结构
        table_names = [t.get("name") for t in tables_data["data"] if t.get("name")]
        schemas = await self._parallel_load_schemas(table_names)

        # 更新缓存
        for table_name, schema in schemas.items():
            self.metadata_cache["schemas"][table_name] = {
                "data": schema,
                "cached_at": time.time(),
            }

        # 构建提示词文本
        for table_info in tables_data["data"]:
            table_name = table_info.get("name", "Unknown")
            table_desc = table_info.get("description", "")

            metadata_text += f"### `{table_name}`\n"
            if table_desc:
                metadata_text += f"**说明**: {table_desc}\n"

            schema = schemas.get(table_name)
            if schema and "data" in schema:
                columns = schema["data"].get("columns", [])
                if columns:
                    metadata_text += "\n**字段**:\n"
                    for col in columns:
                        col_name = col.get("name", "")
                        col_type = col.get("type", "")
                        nullable = "NULL" if col.get("nullable") else "NOT NULL"
                        key = col.get("key", "")
                        key_info = f" [{key}]" if key else ""
                        metadata_text += (
                            f"- `{col_name}` ({col_type}) {nullable}{key_info}\n"
                        )

                foreign_keys = schema["data"].get("foreign_keys", [])
                if foreign_keys:
                    metadata_text += "\n**外键**: "
                    fk_list = []
                    for fk in foreign_keys:
                        if isinstance(fk, dict):
                            fk_list.append(
                                f"`{fk.get('column')}` → `{fk.get('referenced_table')}.{fk.get('referenced_column')}`"
                            )
                    metadata_text += ", ".join(fk_list) + "\n"

            metadata_text += "\n"

        self.system_prompt = self.system_prompt + metadata_text
        self._report_status("✅ 完整元数据已注入")

    async def _inject_relationship_metadata(self, tables_data: dict):
        """注入关系元数据（仅包含表名和关系，按需加载详情）"""
        table_count = len(tables_data["data"])
        self._report_status(f"🔗 正在加载 {table_count} 个表的关系信息...")

        metadata_text = "\n\n## 📊 数据库关系信息 (按需加载)\n\n"
        metadata_text += "以下是表列表及其关系。详细结构将按需加载。\n\n"

        table_names = [t.get("name") for t in tables_data["data"] if t.get("name")]
        relationships = await self._parallel_load_relationships(table_names)

        # 按类别分组
        categorized = {}
        for table_info in tables_data["data"]:
            table_name = table_info.get("name", "Unknown")
            table_desc = table_info.get("description", "")
            category = table_info.get("category", "其他")

            if category not in categorized:
                categorized[category] = []
            categorized[category].append(
                {
                    "name": table_name,
                    "desc": table_desc,
                    "relationships": relationships.get(table_name, []),
                }
            )

        # 构建提示词文本
        for category, tables in categorized.items():
            if category != "其他":
                metadata_text += f"### {category}\n"

            for table in tables:
                table_name = table["name"]
                table_desc = table["desc"]
                rels = table["relationships"]

                metadata_text += f"- **`{table_name}`**"
                if table_desc:
                    metadata_text += f": {table_desc}"

                if rels:
                    metadata_text += f"\n  - 关联: {', '.join(rels)}"
                metadata_text += "\n"

            metadata_text += "\n"

        self.system_prompt = self.system_prompt + metadata_text
        self._report_status("✅ 关系元数据已注入")

    async def _parallel_load_schemas(self, table_names: List[str]) -> Dict[str, dict]:
        """并行加载多个表的结构"""

        async def load_schema(table_name: str):
            try:
                result = await self._execute_mcp_tool(
                    "get_table_schema", {"table": table_name}
                )
                return table_name, json.loads(result)
            except Exception as e:
                logger.warning(f"Failed to load schema for {table_name}: {e}")
                return table_name, None

        tasks = [load_schema(name) for name in table_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        schemas = {}
        for result in results:
            if isinstance(result, tuple) and result[1] is not None:
                schemas[result[0]] = result[1]

        return schemas

    async def _parallel_load_relationships(
        self, table_names: List[str]
    ) -> Dict[str, List[str]]:
        """并行加载多个表的关系"""

        async def get_relationships(table_name: str):
            try:
                result = await self._execute_mcp_tool(
                    "get_table_schema", {"table": table_name}
                )
                schema = json.loads(result)

                relationships = []
                if "data" in schema:
                    fks = schema["data"].get("foreign_keys", [])
                    for fk in fks:
                        if isinstance(fk, dict):
                            ref_table = fk.get("referenced_table")
                            if ref_table:
                                relationships.append(ref_table)

                return table_name, relationships
            except Exception as e:
                logger.warning(f"Failed to get relationships for {table_name}: {e}")
                return table_name, []

        tasks = [get_relationships(name) for name in table_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        relationships = {}
        for result in results:
            if isinstance(result, tuple):
                relationships[result[0]] = result[1]

        return relationships

    async def _handle_special_tool(self, name: str, result: Any, **kwargs) -> None:
        """处理特殊工具调用并报告状态"""
        tool_input = kwargs.get("tool_input", {})

        if "get_table_schema" in name:
            self._report_status("📥 正在获取表结构...")
        elif "execute_sql" in name:
            self._report_status("⚡ 正在执行SQL查询...")
        elif "list_tables" in name:
            self._report_status("📋 正在获取表列表...")
        else:
            clean_name = name.split("_")[-1] if "_" in name else name
            self._report_status(f"🔧 正在执行: {clean_name}")

        await super()._handle_special_tool(name, result, **kwargs)

    def _should_finish_execution(self, name: str, **kwargs) -> bool:
        """判断是否应该结束执行"""
        return name.lower() == "terminate" or "terminate" in name.lower()

    async def run(
        self,
        request: Optional[str] = None,
        status_callback: Optional[Callable[[str], None]] = None,
        **kwargs,
    ) -> str:
        """运行代理"""
        if status_callback:
            self._status_callback = status_callback

        if self.state == AgentState.IDLE and self.current_step == 0:
            self.query_results = None
            self._report_status("🤔 正在分析您的问题...")

        try:
            result = await super(MCPAgent, self).run(
                request, auto_cleanup=False, **kwargs
            )
        finally:
            pass

        self.current_step = 0
        self.state = AgentState.IDLE

        # 尝试从消息历史中获取最后的助手回复
        if hasattr(self, "messages") and self.messages:
            for message in reversed(self.messages):
                if hasattr(message, "role") and message.role == "assistant":
                    content = message.content.strip() if message.content else ""
                    if len(content) > 10 and not content.startswith("Observed output"):
                        return content

        # 尝试从terminate工具输出中获取结果
        if "Observed output of cmd `terminate` executed:" in result:
            parts = result.split("Observed output of cmd `terminate` executed:")
            if len(parts) > 1:
                return parts[1].strip()

        return result or "查询完成但未获得结果"

    async def _execute_mcp_tool(self, tool_name: str, arguments: dict):
        """执行MCP工具"""
        full_tool_name = None

        # 查找完整的工具名称
        for tool_key in self.available_tools.tool_map.keys():
            if tool_key.endswith(f"_{tool_name}"):
                full_tool_name = tool_key
                break

        if not full_tool_name and tool_name in self.available_tools.tool_map:
            full_tool_name = tool_name

        if not full_tool_name:
            available_tool_names = list(self.available_tools.tool_map.keys())
            raise ValueError(
                f"Tool {tool_name} not found. Available tools: {available_tool_names}"
            )

        result = await self.available_tools.execute(
            name=full_tool_name, tool_input=arguments
        )

        return result.output if hasattr(result, "output") else str(result)

    async def get_cached_tables(self):
        """获取缓存的表列表（用于测试连接）"""
        await self._preload_basic_metadata()
        return self.metadata_cache.get("tables", {})

    async def cleanup(self) -> None:
        """清理资源"""
        self._report_status("🧹 正在清理资源...")
        await super().cleanup()
