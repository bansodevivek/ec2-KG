# <your_project_name>/urls.py
# Main Django Project URL Configuration

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # ========================================
    # DJANGO ADMIN PANEL
    # ========================================
    path('admin/', admin.site.urls),
    
    # ========================================
    # CORE APP - All API Endpoints
    # ========================================
    path('', include('core.urls')),
    
    # ========================================
    # DJANGO REST FRAMEWORK (Optional)
    # ========================================
    # Uncomment if you want browsable API interface
    # path('api-auth/', include('rest_framework.urls')),
]


# ========================================
# PROJECT STRUCTURE
# ========================================
"""
Main Project URLs:
- /admin/                    - Django Admin Panel
- /api/*                     - All Core App API Endpoints (from core.urls)

The core.urls file contains all 35 API endpoints organized into:
1. Authentication (3 endpoints)
2. User Management (7 endpoints)
3. Vehicle Control (4 endpoints)
4. RBAC (6 endpoints)
5. Vehicle Static Data (6 endpoints)
6. Live Data (9 endpoints)

See core/urls.py for detailed endpoint documentation.
"""