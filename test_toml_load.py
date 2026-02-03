import toml
from pathlib import Path

config_path = Path("config/config.toml")
print(f"Loading {config_path.absolute()}")
with open(config_path, "r", encoding="utf-8") as f:
    data = toml.load(f)
print("Load successful")
print(f"LLM Section: {data.get('llm')}")
