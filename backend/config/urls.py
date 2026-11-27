from django.conf import settings
from django.contrib import admin
from django.http import HttpResponseNotFound
from django.shortcuts import render
from django.urls import include, path, re_path


def spa_index(request):
    """Serve the built React SPA index.html for client-side routes."""
    index_file = settings.FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return render(request, "index.html")
    return HttpResponseNotFound("Frontend build not found. Run `npm --prefix frontend run build`.")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("forecasting.urls")),
    re_path(r"^(?!api/|admin/|static/|media/|ws/).*$", spa_index, name="spa_index"),
]
