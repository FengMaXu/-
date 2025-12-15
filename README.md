# 🚀 Intelligent Database Agent (AI 数据智能助手)

> **让数据对话变得简单、直观、高效！**

欢迎使用 **Intelligent Database Agent**！这是一个基于 AI 的智能数据库交互助手，能够将你的自然语言问题转化为精确的 SQL 查询，并即时返回结果。无论你是技术专家还是数据小白，都能轻松驾驭！

---

## ✨ 核心功能 (Features)

- **🗣️ 自然语言交互**: 直接用中文/英文提问，例如 "查询年龄大于 25 岁的用户"，AI 自动帮你写 SQL！
- **🧠 智能上下文理解**: 支持多轮对话，能够理解 "他们"、"这些" 等代词，无需重复背景。
- **🔌 MCP 协议支持**: 基于 **Model Context Protocol (MCP)** 构建，标准化连接各种数据源（如 MySQL）。
- **📊 多模态输出**: 支持终端 CLI 交互，也提供现代化的 Web 可视化界面。
- **⚡ 批处理模式**: 支持批量运行查询文件，自动化你的数据报表任务。

---

## 🛠️ 快速开始 (Quick Start)

### 1. 环境准备

确保你已安装 Python 3.8+ 和 Node.js。

```bash
# 克隆项目
git clone https://github.com/FengMaXu/-.git
cd database_agent

# 安装后端依赖
pip install -r requirements.txt
```

### 2. 配置数据库

在项目根目录创建 `.env` 文件，配置你的 MySQL 连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
```

### 3. 🚀 启动助手

#### 🖥️ 命令行模式 (CLI)

最简单的使用方式，直接在终端对话：

```bash
python run.py
```

*   输入 `quit` 退出
*   输入 `clear` 清空上下文

#### 🌐 Web 界面模式 (推荐)

体验更友好的可视化交互：

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动界面
npm run dev
```

打开浏览器访问 `http://localhost:5173` (具体端口请看终端输出)，即可开始与你的数据对话！

---

## 📖 使用指南 (Usage)

### 💡 单次查询
只想快速查个数？
```bash
python run.py -q "统计一下现在的用户总数"
```

### 📂 批处理任务
有一堆问题要问？把它们写在 `queries.txt` 里，然后：
```bash
python run.py -f queries.txt
```

---

## 🏗️ 项目结构

- **`app/`**: 核心 Python 逻辑，包含 Agent 和 LLM 处理。
- **`frontend/`**: React + TailwindCSS 构建的现代化 Web 界面。
- **`mysql_mcp_server/`**: MCP 服务器实现，负责与数据库的底层通信。
- **`run.py`**: 项目的主入口脚本。

---

## 🤝 贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！让我们一起把这个助手变得更聪明。

---

*Made with ❤️ by AI Agent Team*
