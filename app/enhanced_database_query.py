# app/agent/enhanced_database_query.py
import asyncio
import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from pydantic import Field

from app.agent.mcp import MCPAgent
from app.logger import logger
from app.prompt.database_query import (
    DATABASE_QUERY_NEXT_STEP,
    DATABASE_QUERY_SYSTEM_PROMPT,
)
from app.schema import AgentState, Message


class EnhancedDatabaseQueryAgent(MCPAgent):
    """Enhanced Database Query Agent with intelligent query execution."""

    name: str = "enhanced_database_query_agent"
    description: str = (
        "An enhanced agent that answers questions by querying a database with "
        "intelligent table selection and improved error handling."
    )

    # Use the database-specific prompts
    system_prompt: str = DATABASE_QUERY_SYSTEM_PROMPT
    next_step_prompt: str = DATABASE_QUERY_NEXT_STEP

    # Lightweight metadata cache
    metadata_cache: dict = Field(default_factory=dict)
    cache_expiry: int = Field(
        default=1800, description="Cache expiry time in seconds (30 min)"
    )
    last_cache_update: float = Field(default=0.0)

    # Track query state
    query_results: Optional[str] = None
    max_retries: int = Field(
        default=3, description="Maximum retry attempts for SQL execution"
    )

    async def initialize(
        self,
        connection_type: str = "stdio",
        command: Optional[str] = None,
        args: Optional[List[str]] = None,
    ) -> None:
        """Initialize the MCP connection and set up the agent."""
        await super().initialize(
            connection_type=connection_type,
            command=command,
            args=args,
        )

        self.query_results = None
        self.metadata_cache = {}
        self.last_cache_update = 0.0

        # Preload metadata for better performance
        await self._preload_metadata()

    async def reset(self):
        """Reset agent state for new conversation while maintaining MCP connection."""
        self.query_results = None
        self.messages = []

    async def _preload_metadata(self):
        """Preload essential database metadata for performance."""
        current_time = time.time()

        if (current_time - self.last_cache_update) < self.cache_expiry:
            return  # Cache still valid

        try:
            # Only cache table list - schemas will be cached on-demand
            tables_result = await self._execute_mcp_tool("list_tables", {})
            self.metadata_cache = {
                "tables": json.loads(tables_result),
                "schemas": {},  # On-demand schema cache
                "timestamp": current_time,
            }
            self.last_cache_update = current_time
        except Exception as e:
            logger.warning(f"Failed to preload metadata: {e}")

    async def _get_cached_table_list(self):
        """Get cached table list."""
        await self._preload_metadata()
        return self.metadata_cache.get("tables", {})

    async def _get_table_schema(self, table_name: str):
        """Get table schema with intelligent caching."""
        await self._preload_metadata()

        # Check if schema is cached and still valid
        schemas_cache = self.metadata_cache.get("schemas", {})
        if table_name in schemas_cache:
            cached_schema = schemas_cache[table_name]
            # Check if cached schema is still valid (within cache expiry)
            cache_time = cached_schema.get("cached_at", 0)
            if time.time() - cache_time < self.cache_expiry:
                return cached_schema.get("data")

        # Fetch schema and cache it
        try:
            schema_result = await self._execute_mcp_tool(
                "get_table_schema", {"table": table_name}
            )
            schema_data = json.loads(schema_result)

            # Cache the schema with timestamp
            schemas_cache[table_name] = {"data": schema_data, "cached_at": time.time()}

            return schema_data
        except Exception as e:
            logger.warning(f"Failed to get schema for table {table_name}: {e}")
            return None

    async def _validate_sql_query(self, sql: str) -> Tuple[bool, str]:
        """Validate SQL query for safety and correctness."""
        sql_lower = sql.lower().strip()

        # Security check - only allow SELECT queries
        dangerous_keywords = [
            "drop",
            "delete",
            "truncate",
            "alter",
            "create",
            "update",
            "insert",
        ]
        if any(keyword in sql_lower for keyword in dangerous_keywords):
            return False, "Only SELECT queries are allowed"

        if not sql_lower.startswith("select"):
            return False, "Only SELECT queries are allowed"

        return True, "SQL validation passed"

    async def _execute_with_retry(self, sql: str, max_retries: int = None) -> dict:
        """Execute SQL with retry mechanism."""
        if max_retries is None:
            max_retries = self.max_retries

        for attempt in range(max_retries):
            try:
                result = await self._execute_mcp_tool("execute_sql", {"query": sql})
                return json.loads(result)
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(1)  # Wait 1 second before retry

    async def _handle_special_tool(self, name: str, result: Any, **kwargs) -> None:
        """Handle tool execution and store results."""
        await super()._handle_special_tool(name, result, **kwargs)

        # Store query results for data tools, but not for terminate tool
        # 注意：这里应该存储LLM生成的格式化结果，而不是原始工具结果
        # 实际的格式化结果应该在agent的memory中，而不是在工具执行结果中

    def _should_finish_execution(self, name: str, **kwargs) -> bool:
        """Determine if tool execution should finish the agent."""
        return name.lower() == "terminate"

    async def run(self, request: Optional[str] = None) -> str:
        """Run the agent and return the final answer."""
        # Initialize state for new queries
        if self.state == AgentState.IDLE and self.current_step == 0:
            self.query_results = None

        # Use parent class run method
        result = await super(MCPAgent, self).run(request, auto_cleanup=False)
        
        # 重置步数计数器，为下一次查询做准备
        self.current_step = 0
        self.state = AgentState.IDLE

        # 优先返回LLM思考过程中生成的格式化文本
        # 检查memory中是否有assistant的格式化回复
        if hasattr(self, 'memory') and hasattr(self.memory, 'messages'):
            for msg in reversed(self.memory.messages):
                if (hasattr(msg, 'role') and msg.role == 'assistant' and 
                    hasattr(msg, 'content') and msg.content and
                    "根据查询结果" in msg.content):
                    return msg.content
        
        # 备用：返回查询结果
        if self.query_results:
            return self.query_results

        # Extract meaningful content from result
        if isinstance(result, str):
            lines = [line.strip() for line in result.split("\n") if line.strip()]
            for line in reversed(lines):
                if (
                    line
                    and not line.startswith("Step ")
                    and "Observed output" not in line
                    and "terminate" not in line.lower()
                    and "interaction" not in line.lower()
                    and line != "}"
                ):
                    return line

        # Check messages for meaningful content
        if hasattr(self, "messages") and self.messages:
            for message in reversed(self.messages):
                if hasattr(message, "content") and message.content:
                    content = message.content.strip()
                    if content and content != "}" and not content.startswith("Step "):
                        return content

        return "Query completed but no clear results obtained."

    async def _execute_mcp_tool(self, tool_name: str, arguments: dict):
        """Execute MCP tool with proper error handling."""
        # Find the correct tool name in available tools
        full_tool_name = None

        # First try to find tool with prefix
        for tool_key in self.available_tools.tool_map.keys():
            if tool_key.endswith(f"_{tool_name}"):
                full_tool_name = tool_key
                break

        # If not found, try exact match
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

    async def cleanup(self) -> None:
        """Clean up MCP connection when done."""
        await super().cleanup()
