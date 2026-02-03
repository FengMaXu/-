from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
import shutil
import os
from pathlib import Path
import toml
import pymysql
from app.config import config
from app.llm import LLM

router = APIRouter()

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "config.toml"


class DatabaseConfig(BaseModel):
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = ""


class LLMConfig(BaseModel):
    api_type: str = "openai"
    model: str = ""
    base_url: str = ""
    api_key: str = ""
    api_version: str = ""
    max_tokens: int = 4096
    temperature: float = 0.7
    models: Optional[List[str]] = None


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/config")
async def save_config(db_config: DatabaseConfig):
    """Save database configuration to config.toml."""
    try:
        # Load existing config or create new
        if CONFIG_PATH.exists():
            config = toml.load(CONFIG_PATH)
        else:
            config = {}

        # Update mysql section
        config["mysql"] = {
            "host": db_config.host,
            "port": db_config.port,
            "user": db_config.user,
            "password": db_config.password,
            "database": db_config.database,
        }

        # Save config
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            toml.dump(config, f)

        return {"success": True, "message": "配置已保存"}

    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/config/test")
async def test_connection(db_config: DatabaseConfig):
    """Test database connection with provided config."""
    try:
        connection = pymysql.connect(
            host=db_config.host,
            port=db_config.port,
            user=db_config.user,
            password=db_config.password,
            database=db_config.database,
            charset="utf8mb4",
            connect_timeout=5,
        )
        connection.close()
        return {"success": True, "message": "连接成功"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/tables")
async def get_tables():
    """Fetch tables from the database via direct MySQL connection."""
    try:
        # Load config
        if not CONFIG_PATH.exists():
            return {
                "tables": [],
                "success": False,
                "error": "请先在设置中配置数据库连接",
            }

        config = toml.load(CONFIG_PATH)
        db_config = config.get("mysql", {})

        if not db_config.get("database"):
            return {
                "tables": [],
                "success": False,
                "error": "请先在设置中配置数据库名称",
            }

        # Connect to database
        connection = pymysql.connect(
            host=db_config.get("host", "localhost"),
            port=int(db_config.get("port", 3306)),
            user=db_config.get("user", "root"),
            password=db_config.get("password", ""),
            database=db_config.get("database", ""),
            charset="utf8mb4",
        )

        cursor = connection.cursor()
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]

        cursor.close()
        connection.close()

        return {"tables": tables, "success": True}

    except Exception as e:
        return {"tables": [], "success": False, "error": str(e)}


@router.get("/llm/config")
async def get_llm_config():
    """Get current LLM configurations from config.toml."""
    try:
        if not CONFIG_PATH.exists():
            return {"success": False, "error": "配置文件不存在"}

        config_data = toml.load(CONFIG_PATH)
        return {
            "success": True,
            "config": {
                "llm": config_data.get("llm", {}),
                "providers": config_data.get("providers", {}),
            },
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/providers/settings/sync")
async def sync_provider_settings(data: dict):
    """
    Real-time sync endpoint for LLM provider settings.
    Follows project framework: { agentProvider, agentConfig, defaultModel }
    """
    try:
        # 1. Update config loader (persists to disk and reloads memory)
        config.update_from_settings(data)

        # 2. Clear LLM client cache to force re-initialization on next use
        LLM.clear_cache()

        return {"success": True, "message": "Settings synchronized successfully"}
    except Exception as e:
        import traceback

        print(f"Sync error: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


@router.post("/llm/config")
async def save_llm_config(data: dict):
    """Legacy endpoint for backward compatibility"""
    try:
        # Map old format to new sync framework
        sync_data = {
            "agentProvider": data.get("id", "").replace("providers.", ""),
            "agentConfig": data.get("config"),
            "defaultModel": (
                data.get("config", {}).get("model")
                if data.get("set_as_default")
                else None
            ),
        }
        return await sync_provider_settings(sync_data)
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {
            "filename": file.filename,
            "path": str(file_path),
            "message": "File uploaded successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
