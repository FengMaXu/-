import asyncio
import websockets
import json
import sys


async def test_websocket():
    uri = "ws://localhost:8000/ws/chat"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")

            # Wait for welcome message
            welcome = await websocket.recv()
            print(f"Received: {welcome}")

            # Send a test query
            test_msg = {"content": "Hello, are you ready?"}
            await websocket.send(json.dumps(test_msg))
            print(f"Sent: {test_msg}")

            # Expect status/thinking
            response1 = await websocket.recv()
            print(f"Received 1: {response1}")

            # Expect final response
            response2 = await websocket.recv()
            print(f"Received 2: {response2}")

            print("WebSocket Test Passed!")
            return True
    except Exception as e:
        print(f"WebSocket Test Failed: {e}")
        return False


if __name__ == "__main__":
    try:
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        asyncio.run(test_websocket())
    except KeyboardInterrupt:
        pass
