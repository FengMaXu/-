import json
import logging
import sys
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agent.enhanced_database_query import EnhancedDatabaseQueryAgent
from app.schema import AgentState

# Configure logging
logger = logging.getLogger("websocket")

router = APIRouter()


@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("New WebSocket connection accepted")

    # Initialize the agent for this session
    agent = EnhancedDatabaseQueryAgent()

    # Use the current python executable to run the MCP server
    # This assumes the server code is in the python path
    mcp_command = sys.executable
    mcp_args = ["-m", "mysql_mcp_server.server"]

    try:
        # Initialize connection to MCP server
        await agent.initialize(
            connection_type="stdio",
            command=mcp_command,
            args=mcp_args,
        )

        # Send welcome message
        await websocket.send_text(
            json.dumps(
                {
                    "type": "system",
                    "content": "Database Copilot Agent Connected. Ready for queries.",
                    "status": "ready",
                }
            )
        )

        while True:
            # Receive message from client
            data = await websocket.receive_text()
            try:
                message_obj = json.loads(data)
                user_query = message_obj.get("content")

                if not user_query:
                    continue

                # Notify client that processing started
                await websocket.send_text(
                    json.dumps(
                        {"type": "status", "content": "Thinking...", "status": "busy"}
                    )
                )

                # Run the agent
                # Note: This is currently a blocking call until completion
                result = await agent.run(user_query)

                # Send final result
                await websocket.send_text(
                    json.dumps(
                        {"type": "response", "content": result, "status": "ready"}
                    )
                )

            except json.JSONDecodeError:
                logger.warning("Received invalid JSON")
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "content": f"Error processing query: {str(e)}",
                            "status": "error",
                        }
                    )
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup agent resources
        await agent.cleanup()
