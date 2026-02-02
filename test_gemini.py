import asyncio
from openai import AsyncOpenAI


async def test():
    print("Testing Gemini API...")
    client = AsyncOpenAI(
        api_key="AIzaSyA9mYAhAy_Lt8tl9BHOO_70SeOnp1MxoXI",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    try:
        resp = await client.chat.completions.create(
            model="gemini-1.5-flash",
            messages=[{"role": "user", "content": "Hello, are you working?"}],
        )
        print("Success! Response:", resp.choices[0].message.content)
    except Exception as e:
        print("Error:", e)


if __name__ == "__main__":
    asyncio.run(test())
