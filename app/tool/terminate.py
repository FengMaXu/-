from app.tool.base import BaseTool


_TERMINATE_DESCRIPTION = """Terminate the interaction when the request is met OR if the assistant cannot proceed further with the task.
IMPORTANT: Before calling this tool, you MUST provide a clear, user-friendly answer in Chinese explaining the query results.
This tool should only be called AFTER you have given a complete natural language response to the user's question.
When you have finished all the tasks and provided a clear answer, call this tool to end the work."""


class Terminate(BaseTool):
    name: str = "terminate"
    description: str = _TERMINATE_DESCRIPTION
    parameters: dict = {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "The finish status of the interaction.",
                "enum": ["success", "failure"],
            },
            "final_answer": {
                "type": "string",
                "description": "Optional: A user-friendly summary of the results if not already provided.",
            },
        },
        "required": ["status"],
    }

    async def execute(self, status: str, final_answer: str = None) -> str:
        """Finish the current execution"""
        response = f"The interaction has been completed with status: {status}"

        # 如果提供了最终答案，将其包含在响应中
        if final_answer:
            response = f"{final_answer}\n\n{response}"

        return response
