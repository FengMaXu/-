import asyncio
import json
import logging
import os
import sys

from mcp.server import Server
from mcp.types import Resource, TextContent, Tool
from mysql.connector import Error, connect, pooling
from pydantic import AnyUrl

# 1. 配置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mysql_mcp_server")

# 可选：用户可自定义表用途说明作为备用
TABLE_PURPOSES = {}


def get_db_config():
    """从环境变量或配置文件获取数据库配置。"""
    import os
    import sys

    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER"),
        "password": os.getenv("MYSQL_PASSWORD"),
        "database": os.getenv("MYSQL_DATABASE"),
        "charset": os.getenv("MYSQL_CHARSET", "utf8mb4"),
        "collation": os.getenv("MYSQL_COLLATION", "utf8mb4_unicode_ci"),
        "autocommit": True,
        "sql_mode": os.getenv("MYSQL_SQL_MODE", "TRADITIONAL"),
    }
    config = {k: v for k, v in config.items() if v is not None}

    # 如果环境变量中没有完整配置，尝试从配置文件读取
    if not all([config.get("user"), config.get("password"), config.get("database")]):
        try:
            # 尝试从项目配置文件读取
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from app.config import DatabaseSettings

            # 尝试从配置文件加载
            try:
                db_settings = DatabaseSettings.from_env()
                config.update(
                    {
                        "host": db_settings.host,
                        "port": db_settings.port,
                        "user": db_settings.user,
                        "password": db_settings.password,
                        "database": db_settings.database,
                        "charset": db_settings.charset,
                        "collation": db_settings.collation,
                        "autocommit": db_settings.autocommit,
                        "sql_mode": db_settings.sql_mode,
                    }
                )
                logger.info("从配置文件加载了数据库配置")
            except ValueError:
                # 如果配置文件也没有，继续使用环境变量中的部分配置
                pass
        except ImportError:
            logger.warning("无法导入配置文件，仅使用环境变量")

    config = {k: v for k, v in config.items() if v is not None}
    if not all([config.get("user"), config.get("password"), config.get("database")]):
        logger.error(
            "缺少必要的数据库配置。请检查环境变量: MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE"
        )
        raise ValueError("Missing required database configuration.")
    return config


# 2. 初始化 MCP 服务器
app = Server("mysql_mcp_server")


# 3. 辅助函数
def _get_table_comments(cursor, db_name: str) -> dict[str, str]:
    """从 information_schema 获取所有表的注释。"""
    query = "SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = %s"
    cursor.execute(query, (db_name,))
    return {name: comment for name, comment in cursor.fetchall() if comment}


def get_valid_tables(cursor) -> set[str]:
    """获取所有有效的表名列表。"""
    cursor.execute("SHOW TABLES")
    return {row[0] for row in cursor.fetchall()}


def _create_json_error(message: str) -> str:
    """创建标准化的 JSON 错误信息。"""
    return json.dumps({"error": message}, indent=2)


class DatabasePool:
    """数据库连接池管理类"""

    def __init__(self, config):
        self.pool_config = {
            **config,
            "pool_name": "mysql_mcp_pool",
            "pool_size": 10,
            "pool_reset_session": True,
        }
        self.pool = None
        self._init_pool()

    def _init_pool(self):
        """初始化连接池"""
        try:
            self.pool = pooling.MySQLConnectionPool(**self.pool_config)
            logger.info("数据库连接池初始化成功")
        except Error as e:
            logger.error(f"连接池初始化失败: {e}")
            raise

    def get_connection(self):
        """获取数据库连接"""
        if not self.pool:
            self._init_pool()
        return self.pool.get_connection()


# 全局连接池实例
db_pool = None


def get_db_connection():
    """获取数据库连接"""
    global db_pool
    if not db_pool:
        config = get_db_config()
        db_pool = DatabasePool(config)
    return db_pool.get_connection()


# 4. 实现 MCP 核心函数
@app.list_resources()
async def list_resources() -> list[Resource]:
    """列出数据库中的表作为资源，包含表注释和关键字段。"""
    db_name = get_db_config()["database"]
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                table_comments = _get_table_comments(cursor, db_name)
                tables = get_valid_tables(cursor)
                resources = []
                for table in tables:
                    try:
                        cursor.execute(f"DESCRIBE `{table}`")
                        columns = cursor.fetchall()
                        if not columns:
                            continue

                        key_fields = [
                            f"{col[0]}({col[1]}){'*' if col[3] == 'PRI' else ''}"
                            for col in columns
                            if col[3] in ("PRI", "MUL")
                            or any(
                                kw in col[0].lower() for kw in ("name", "email", "id")
                            )
                        ][:5]

                        key_fields_str = ", ".join(key_fields) if key_fields else "..."
                        table_comment = table_comments.get(table) or TABLE_PURPOSES.get(
                            table, "A data table."
                        )
                        description = f"{table_comment}\nKey fields: {key_fields_str}"

                        resources.append(
                            Resource(
                                uri=f"mysql://{table}/data",
                                name=f"Table: {table}",
                                mimeType="text/plain",
                                description=description,
                            )
                        )
                    except Error as e:
                        logger.warning(f"无法描述表 {table}: {e}")
                return resources
    except Error as e:
        logger.error(f"列出资源失败: {str(e)}")
        return []


@app.read_resource()
async def read_resource(uri: AnyUrl) -> str:
    """读取指定表的前100行数据。"""
    table = str(uri).split("/")[2]
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                if table not in get_valid_tables(cursor):
                    raise ValueError(f"表 '{table}' 不存在。")
                cursor.execute(f"SELECT * FROM `{table}` LIMIT 100")
                columns = [desc[0] for desc in cursor.description]
                rows = cursor.fetchall()
                result = [",".join(map(str, row)) for row in rows]
                return "\n".join([",".join(columns)] + result)
    except Error as e:
        raise RuntimeError(f"数据库错误: {str(e)}")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """定义可供 LLM 使用的工具列表。"""
    return [
        Tool(
            name="execute_sql",
            description="执行单条原生 SQL 查询语句。以 JSON 格式返回结果。",
            inputSchema={
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        ),
        Tool(
            name="get_table_schema",
            description="以 JSON 格式获取指定表的完整结构信息，包含列名、类型、键和注释。",
            inputSchema={
                "type": "object",
                "properties": {"table": {"type": "string"}},
                "required": ["table"],
            },
        ),
        Tool(
            name="list_tables",
            description="列出数据库中所有表的名称和详细注释信息。LLM应该根据表的注释信息来选择要查看的表。",
            inputSchema={"type": "object", "properties": {}, "required": []},
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """处理 LLM 的工具调用请求。"""
    config = get_db_config()
    db_name = config["database"]
    logger.info(f"调用工具: {name}，参数: {arguments}")

    if name == "get_table_schema":
        table = arguments.get("table")
        if not table:
            return [TextContent(type="text", text=_create_json_error("必须提供表名。"))]
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    if table not in get_valid_tables(cursor):
                        return [
                            TextContent(
                                type="text",
                                text=_create_json_error(f"表 '{table}' 不存在。"),
                            )
                        ]

                    cursor.execute(
                        "SELECT TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s",
                        (db_name, table),
                    )
                    table_comment = (cursor.fetchone() or [""])[0]

                    cursor.execute(
                        """
                        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA, COLUMN_COMMENT
                        FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s ORDER BY ORDINAL_POSITION;
                    """,
                        (db_name, table),
                    )
                    columns_data = cursor.fetchall()

                    schema_dict = {
                        "tableName": table,
                        "tableComment": table_comment or "无注释。",
                        "columns": [
                            {
                                "name": col[0],
                                "type": col[1],
                                "isNullable": col[2] == "YES",
                                "isPrimaryKey": "PRI" in col[3],
                                "isUniqueKey": "UNI" in col[3],
                                "isForeignKeyIndex": "MUL" in col[3],
                                "default": col[4],
                                "extra": col[5],
                                "comment": col[6] or "",
                            }
                            for col in columns_data
                        ],
                    }
                    return [
                        TextContent(
                            type="text",
                            text=json.dumps(schema_dict, indent=2, ensure_ascii=False),
                        )
                    ]
        except Error as e:
            return [
                TextContent(
                    type="text", text=_create_json_error(f"数据库错误: {str(e)}")
                )
            ]

    elif name == "list_tables":
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # 获取表基本信息
                    cursor.execute(
                        """
                        SELECT
                            TABLE_NAME,
                            TABLE_COMMENT,
                            TABLE_ROWS
                        FROM information_schema.TABLES
                        WHERE TABLE_SCHEMA = %s
                        ORDER BY TABLE_ROWS DESC
                    """,
                        (db_name,),
                    )

                    tables_info = []
                    for table_name, comment, row_count in cursor.fetchall():
                        # 获取关键字段
                        cursor.execute(
                            """
                            SELECT COLUMN_NAME, COLUMN_COMMENT
                            FROM information_schema.COLUMNS
                            WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
                            AND (COLUMN_KEY IN ('PRI', 'MUL')
                                 OR COLUMN_NAME LIKE '%name%'
                                 OR COLUMN_NAME LIKE '%id%'
                                 OR COLUMN_NAME LIKE '%time%'
                                 OR COLUMN_NAME LIKE '%date%')
                            ORDER BY ORDINAL_POSITION
                            LIMIT 5
                        """,
                            (db_name, table_name),
                        )

                        key_columns = cursor.fetchall()

                        table_info = {
                            "name": table_name,
                            "comment": comment or "无注释",
                            "rowCount": row_count or 0,
                            "keyColumns": [
                                {"name": col[0], "comment": col[1] or ""}
                                for col in key_columns
                            ],
                        }
                        tables_info.append(table_info)

                    result = {
                        "status": "success",
                        "data": tables_info,
                        "totalTables": len(tables_info),
                    }

                    return [
                        TextContent(
                            type="text",
                            text=json.dumps(result, indent=2, ensure_ascii=False),
                        )
                    ]
        except Error as e:
            return [
                TextContent(
                    type="text", text=_create_json_error(f"列出表错误: {str(e)}")
                )
            ]

    elif name == "execute_sql":
        query = arguments.get("query")
        if not query:
            return [
                TextContent(
                    type="text", text=_create_json_error("必须提供 SQL 查询语句。")
                )
            ]
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # **修正点**: 移除 multi=True，恢复为标准的单语句执行。
                    cursor.execute(query)

                    # 检查是否有返回行 (如 SELECT, SHOW)
                    if cursor.description is not None:
                        columns = [desc[0] for desc in cursor.description]
                        rows = cursor.fetchall()
                        # 将行数据转换为字典列表，对 LLM 更友好
                        rows_as_dict = [dict(zip(columns, row)) for row in rows]
                        result = {
                            "status": "OK",
                            "data": rows_as_dict,
                            "rowCount": cursor.rowcount,
                        }
                    # 没有返回行 (如 INSERT, UPDATE, DELETE)
                    else:
                        result = {"status": "OK", "rowsAffected": cursor.rowcount}

                    # 使用 default=str 来处理 Decimal、Date 等特殊类型
                    return [
                        TextContent(
                            type="text",
                            text=json.dumps(
                                result, default=str, indent=2, ensure_ascii=False
                            ),
                        )
                    ]
        except Error as e:
            logger.error(f"执行 SQL 失败 '{query}': {e}")
            return [
                TextContent(type="text", text=_create_json_error(f"SQL 错误: {str(e)}"))
            ]

    else:
        raise ValueError(f"未知的工具: {name}")


# 5. 主程序入口
async def main():
    """主程序入口，启动 MCP 服务器。"""
    from mcp.server.stdio import stdio_server

    print("正在启动 MySQL MCP 服务器...", file=sys.stderr)
    try:
        config = get_db_config()
        print(
            f"连接到: {config['host']}:{config.get('port', 3306)}/{config['database']}",
            file=sys.stderr,
        )
        logger.info("MySQL MCP 服务器已启动。")
        logger.info(
            f"数据库: {config['host']}/{config['database']}，用户: {config['user']}"
        )
        async with stdio_server() as (read_stream, write_stream):
            init_options = app.create_initialization_options()
            await app.run(read_stream, write_stream, init_options)
    except Exception as e:
        logger.error(f"服务器发生致命错误: {str(e)}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
