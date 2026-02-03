from fastapi import FastAPI

# Trigger reload for config change
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.api.websocket import router as ws_router

app = FastAPI(title="Database Copilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/ws")


@app.get("/")
async def root():
    return {"message": "Database Copilot API is running", "docs": "/docs"}
