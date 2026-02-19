# Core test suites
from .test_auth import *
from .test_accounts import *
from .test_transactions import *
from .test_budgets import *
from .test_categorization import *

# Milestone 3 tests
from .test_bills import *
from .test_rewards import *

# Milestone 4 tests (optional modules)
try:
    from .test_alerts import *
except ImportError:
    pass

try:
    from .test_insights import *
except ImportError:
    pass

try:
    from .test_exports import *
except ImportError:
    pass
