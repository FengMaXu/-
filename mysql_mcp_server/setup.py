from setuptools import find_packages, setup

setup(
    name="mysql_mcp_server",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "mcp",
        "mysql-connector-python",
        "pydantic",
    ],
    entry_points={
        "console_scripts": [
            "mysql_mcp_server=mysql_mcp_server.server:main",
        ],
    },
    python_requires=">=3.8",
)
