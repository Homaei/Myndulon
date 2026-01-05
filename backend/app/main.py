"""
FastAPI application entry point.

This module initializes the FastAPI app, sets up CORS middleware,
and mounts all API routes.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os

from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.

    Handles:
    - Creating data directories
    - Database initialization (Phase 1.2)
    - Creating admin user (Phase 1.3)
    """
    from app.database import init_db, close_db

    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")

    # Create necessary directories
    settings.ensure_data_directories()
    logger.info("Data directories initialized")

    # Initialize database (create tables)
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    # Create admin user on startup (Phase 1.3)
    try:
        from app.routes.auth import ADMIN_CREDENTIALS
        from app.services.auth_service import hash_password

        if ADMIN_CREDENTIALS["password_hash"] is None:
            ADMIN_CREDENTIALS["password_hash"] = hash_password(settings.admin_password)
            logger.info(f"Admin user initialized: {settings.admin_username}")
        else:
            logger.info("Admin credentials already initialized")
    except Exception as e:
        logger.error(f"Failed to initialize admin user: {e}")
        raise

    # Initialize Qdrant collection (Phase 3.1)
    try:
        from app.services.qdrant_client import init_collection

        await init_collection()
        logger.info("Qdrant collection initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection: {e}")
        raise

    yield

    # Cleanup on shutdown
    logger.info("Shutting down application")
    await close_db()
    logger.info("Database connections closed")

    # Close Qdrant client
    from app.services.qdrant_client import close_client

    await close_client()


# Create FastAPI app
app = FastAPI(
    title="Myndulon API",
    version="1.0.0",
    description="""
# Myndulon API

Open-source, self-hostable AI chatbot widget with RAG (Retrieval-Augmented Generation).

## Features

- 🤖 **AI-Powered Chat**: Uses OpenAI GPT-4o-mini for intelligent conversations
- 🔍 **RAG Support**: Retrieval-Augmented Generation with Qdrant vector database
- 📚 **Content Ingestion**: Train bots from URLs or direct text
- 🎨 **Customizable Widget**: Fully customizable chat widget
- 🔐 **Secure**: Session-based authentication, API key management
- 📊 **Analytics**: Track message usage and bot performance

## API Endpoints

- **Authentication**: Login/logout for admin dashboard
- **Admin**: Bot CRUD, avatar management, content ingestion
- **Public**: Widget configuration, avatar serving
- **Chat**: Real-time chat with Server-Sent Events (SSE)

## Getting Started

1. Create a bot via `/api/admin/bots`
2. Train it with content using `/api/admin/bots/{id}/ingest`
3. Embed the widget on your website
4. Start chatting!

## Documentation

- **API Docs**: [/docs](/docs) (you are here)
- **ReDoc**: [/redoc](/redoc)
- **GitHub**: [https://github.com/yourusername/myndulon-app](https://github.com/yourusername/myndulon-app)
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Myndulon Support",
        "url": "https://github.com/yourusername/myndulon-app",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns:
        JSON response with service status, timestamp, and component health
    """
    from app.services.qdrant_client import health_check as qdrant_health

    # Check Qdrant health
    qdrant_status = await qdrant_health()

    # Overall health is healthy only if all components are healthy
    overall_healthy = qdrant_status.get("healthy", False)

    return JSONResponse(
        content={
            "status": "healthy" if overall_healthy else "unhealthy",
            "service": "myndulon-api",
            "version": "0.1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "database": "healthy",  # SQLite is always available if app started
                "qdrant": qdrant_status,
            },
        }
    )


# Root endpoint moved to /api
@app.get("/api", tags=["Root"])
async def api_root():
    """
    API Root endpoint.
    """
    return {
        "message": "Myndulon API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health"
    }


# Resolve paths (handling Docker /app/backend vs local root)
BASE_DIR = os.getcwd()
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend/dist")
WIDGET_DIST = os.path.join(BASE_DIR, "frontend/widget/dist")

if not os.path.exists(FRONTEND_DIST) and os.path.exists(os.path.join(BASE_DIR, "../frontend/dist")):
    FRONTEND_DIST = os.path.join(BASE_DIR, "../frontend/dist")
    WIDGET_DIST = os.path.join(BASE_DIR, "../frontend/widget/dist")

# Mount widget assets (if built)
if os.path.exists(WIDGET_DIST):
    app.mount("/widget", StaticFiles(directory=WIDGET_DIST), name="widget")

# Mount frontend assets (if built)
assets_path = os.path.join(FRONTEND_DIST, "assets")
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")




# Phase 1.3: Mount auth routes
from app.routes import auth
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Phase 2.1: Mount admin routes
from app.routes import admin, settings
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(settings.router, prefix="/api/admin", tags=["Settings"])

# Phase 2.2: Mount public routes
from app.routes import public
app.include_router(public.router, prefix="/api/public", tags=["Public"])

# Phase 5: Mount chat routes
from app.routes import chat
app.include_router(chat.router, prefix="/api", tags=["Chat"])


# SPA Catch-all (must be last)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # Skip API routes
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
        return JSONResponse({"error": "Not found"}, status_code=404)
    
    # Check if file exists in dist (e.g. favicon.ico, manifest.json)
    potential_path = os.path.join(FRONTEND_DIST, full_path)
    if os.path.exists(potential_path) and os.path.isfile(potential_path):
        return FileResponse(potential_path)
        
    # Fallback to index.html
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return JSONResponse(
        {"error": f"Frontend not built at {FRONTEND_DIST}. Please run 'npm run build' in frontend directory."}, 
        status_code=404
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )
