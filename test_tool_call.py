"""
Quick test for LLM tool calling functionality
"""
import asyncio
import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.llm import LLM
from app.logger import logger


async def test_tool_call():
    """Test LLM with tool calling"""

    print("=" * 60)
    print("Testing LLM Tool Call Functionality")
    print("=" * 60)

    try:
        llm = LLM()

        # Simple tool definition
        tools = [{
            "type": "function",
            "function": {
                "name": "get_current_time",
                "description": "Get the current time",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        }]

        messages = [
            {"role": "user", "content": "What time is it?"}
        ]

        print("\n[TEST] Sending tool call request...")
        response = await llm.ask_tool(
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )

        if response:
            print(f"[SUCCESS] Response received!")
            print(f"  Content: {response.content}")
            print(f"  Tool Calls: {response.tool_calls}")
            return True
        else:
            print("[WARNING] No response received")
            return False

    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_tool_call())
    print("\n" + "=" * 60)
    if success:
        print("[SUCCESS] Tool call test PASSED")
    else:
        print("[FAILED] Tool call test FAILED")
    print("=" * 60)
    sys.exit(0 if success else 1)
