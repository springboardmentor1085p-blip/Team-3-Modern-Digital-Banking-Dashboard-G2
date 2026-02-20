from fastapi import APIRouter

from app.api.v1 import (
    auth,
    accounts,
    transactions,
    budgets,
    categories,
    bills,
    rewards,
    insights,
    alerts,
    exports,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(bills.router, prefix="/bills", tags=["bills"])
api_router.include_router(rewards.router, prefix="/rewards", tags=["rewards"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
