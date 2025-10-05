from placements_io import views
from django.urls import path

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('ping_pong/', views.PingPongView.as_view(), name='ping_pong'),
    path('campaign/', views.CampaignListView.as_view(), name='list_campaign'),
    path('campaign/<int:pk>/', views.CampaignDetailView.as_view(), name='detail_campaign'),
    path('campaign/<int:pk>/line_item/csv/', views.LineItemListCSVDownloadView.as_view(), name='csv_download_line_item'),
    path('campaign/csv/', views.CampaignListCSVDownloadView.as_view(), name='csv_download_campaign'),
    path('line_item/<int:pk>/', views.LineItemPatchView.as_view(), name='patch_line_item'),
]
