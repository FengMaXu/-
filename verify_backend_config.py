from app.config import config
from app.llm import LLM
import asyncio


async def test():
    print(f"Config LLM Default Model: {config.llm['default'].model}")
    print(f"Config LLM Default Base URL: {config.llm['default'].base_url}")

    llm = LLM()
    print(f"LLM Instance Model: {llm.model}")
    print(f"LLM Instance Base URL: {llm.base_url}")


if __name__ == "__main__":
    asyncio.run(test())
