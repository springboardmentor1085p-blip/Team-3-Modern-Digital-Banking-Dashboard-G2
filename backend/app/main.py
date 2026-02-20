from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.api.v1.api import api_router
from app.core.database import engine, Base

# Ensure models are imported so metadata is registered
from app.models import (
    User,
    Account,
    Transaction,
    Budget,
    Category,
    Bill,
    Reward,
    Alert,
    AdminLog,
)

# Scheduler
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # -----------------------
    # Startup
    # -----------------------
    # Create tables (development-safe)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass

    # -----------------------
    # Scheduled task function
    # -----------------------
    def cleanup_old_alerts_job():
        from app.core.database import SessionLocal
        from app.services.alert_service import AlertService

        db = SessionLocal()
        try:
            # run cleanup for all users (None = global)
            service = AlertService(db, user_id=0)
            service.cleanup_old_alerts()
        finally:
            db.close()


    # -----------------------
    # Schedule daily maintenance task
    # -----------------------
    scheduler.add_job(
        func=cleanup_old_alerts_job,   # ← REQUIRED
        trigger=CronTrigger(hour=3, minute=0),
        id="cleanup_old_alerts",
        replace_existing=True,
    )

    scheduler.start()


    yield

    # -----------------------
    # Shutdown
    # -----------------------
    scheduler.shutdown()


# app = FastAPI(
#     title=settings.PROJECT_NAME,
#     description="Digital Banking Dashboard API",
#     version=settings.VERSION,
#     openapi_url=f"{settings.API_V1_STR}/openapi.json",
#     lifespan=lifespan,
#     redirect_slashes=True,
# )
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Digital Banking Dashboard API",
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
    redirect_slashes=True,
)

# -----------------------
# CORS
# -----------------------
origins = (
    [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    if settings.BACKEND_CORS_ORIGINS
    else ["http://localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Routers
# -----------------------
app.include_router(api_router, prefix=settings.API_V1_STR)


# -----------------------
# Root + Health
# -----------------------
@app.get("/")
async def root():
    return {
        "message": "Digital Banking Dashboard API",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
