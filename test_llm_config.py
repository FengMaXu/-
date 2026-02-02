"""
Test script to validate LLM configuration
Run this script to verify that your LLM API configuration is correct
"""
import asyncio
import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == "win32":
    os.system("chcp 65001 > nul")

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from app.llm import LLM
from app.config import config
from app.logger import logger


async def test_llm_config():
    """Test LLM configuration with a simple API call"""

    print("=" * 60)
    print("LLM Configuration Test")
    print("=" * 60)

    # Display current configuration
    print("\n[INFO] Current LLM Configuration:")
    print(f"  Model: {config.llm['default'].model}")
    print(f"  Base URL: {config.llm['default'].base_url}")
    print(f"  API Type: {config.llm['default'].api_type}")
    print(f"  Max Tokens: {config.llm['default'].max_tokens}")
    print(f"  Temperature: {config.llm['default'].temperature}")
    print(f"  API Key: {config.llm['default'].api_key[:10]}..." if config.llm['default'].api_key else "  API Key: NOT SET")

    # Check if required fields are set
    if not config.llm['default'].api_key:
        print("\n[ERROR] API key is not configured!")
        print("Please set your API key in the frontend settings or config.toml")
        return False

    if not config.llm['default'].base_url:
        print("\n[ERROR] Base URL is not configured!")
        print("Please set your base URL in the frontend settings or config.toml")
        return False

    if not config.llm['default'].model:
        print("\n[ERROR] Model is not configured!")
        print("Please set your model in the frontend settings or config.toml")
        return False

    print("\n[OK] All required fields are configured")

    # Test API connection
    print("\n[TEST] Testing API connection...")

    try:
        # Initialize LLM
        llm = LLM()

        # Simple test message
        test_messages = [
            {"role": "user", "content": "Hello! Please respond with 'OK' if you can understand this message."}
        ]

        print("[SEND] Sending test request...")
        response = await llm.ask(messages=test_messages, stream=False)

        print(f"[RECEIVED] Response: {response[:100]}...")
        print("\n[SUCCESS] LLM configuration is working correctly!")
        return True

    except Exception as e:
        print(f"\n[ERROR] LLM test failed!")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")

        # Provide helpful suggestions based on error type
        error_str = str(e).lower()

        if "authentication" in error_str or "unauthorized" in error_str or "401" in error_str:
            print("\n[TIP] Your API key appears to be invalid.")
            print(f"   Please check your API key for {config.llm['default'].base_url}")

        elif "not found" in error_str or "404" in error_str:
            print("\n[TIP] The endpoint or model was not found.")
            print(f"   Please check your base URL: {config.llm['default'].base_url}")
            print(f"   And model name: {config.llm['default'].model}")

        elif "base url" in error_str or "connection" in error_str:
            print("\n[TIP] Cannot connect to the API server.")
            print(f"   Please check your base URL: {config.llm['default'].base_url}")
            print("   Make sure the URL is accessible and includes the correct path")

        elif "model" in error_str and "not" in error_str:
            print("\n[TIP] The model is not available.")
            print(f"   Please check if '{config.llm['default'].model}' is supported by {config.llm['default'].base_url}")

        else:
            print("\n[TIP] Please check the error logs above for more details")

        return False


async def main():
    """Main test function"""
    try:
        success = await test_llm_config()

        print("\n" + "=" * 60)
        if success:
            print("[SUCCESS] Test PASSED - Your LLM configuration is working!")
        else:
            print("[FAILED] Test FAILED - Please fix the issues above")
        print("=" * 60)

        return 0 if success else 1

    except KeyboardInterrupt:
        print("\n\n[INTERRUPTED] Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
