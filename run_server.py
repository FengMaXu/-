import uvicorn
import sys
import os

if __name__ == "__main__":
    # Add project root to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("app.api.server:app", host="0.0.0.0", port=8000, reload=True)
