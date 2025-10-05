from zoneinfo import ZoneInfo
from datetime import datetime
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from django.contrib.auth import (
    authenticate,
    login as django_login,
    logout as django_logout,
)
from django.http import HttpResponse
from decimal import Decimal
import csv

from placements_io.models import Campaign, LineItem
from placements_io.interfaces import (
    CampaignPagination, CampaignSerializer,
    CampaignDetailSerializer, LineItemPatchSerializer,
    get_drf_pagination_schema_serializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @swagger_auto_schema(
        operation_description="User login endpoint",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['username', 'password'],
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING, description='Username'),
                'password': openapi.Schema(type=openapi.TYPE_STRING, description='Password'),
            },
        ),
        responses={
            200: openapi.Response(
                description="Login successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={'message': openapi.Schema(type=openapi.TYPE_STRING)}
                )
            ),
            400: openapi.Response(description="Invalid username or password"),
        }
    )
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {"message": "Username and password are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        user = authenticate(request, username=username, password=password)

        if user is not None:
            django_login(request, user)
            return Response(
                {"message": "Login successful"},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"message": "Invalid credentials"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        django_logout(request)
        return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)


@swagger_auto_schema(
    operation_description="Ping-pong endpoint",
    responses={
        200: openapi.Response(description="pong"),
        403: openapi.Response(description="Forbidden"),
    }
)
class PingPongView(APIView):
    """
    For testing purposes to check login status,
        anonymous user will get 403, forbidden from accessing this endpoint
    """

    authentication_classes = [SessionAuthentication]  # django session auth
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": "pong"}, status=status.HTTP_200_OK)


class CampaignListView(ListAPIView):
    """
    List all campaigns with pagination
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    pagination_class = CampaignPagination
    serializer_class = CampaignSerializer

    # Prefetch to prevent N+1 queries happens in CampaignSerializer
    #   All related LineItem "will" be selected while querying Campaign
    queryset = Campaign.objects.all().prefetch_related('lineitem_set')  # not evaluated yet

    @swagger_auto_schema(
        operation_description="Retrieve a paginated list of all campaigns",
        responses={
            200: get_drf_pagination_schema_serializer(
                'CampaignPaginationSchema',
                CampaignSerializer,
            ),
            401: openapi.Response(description="Authentication credentials were not provided"),
            403: openapi.Response(description="Permission denied"),
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CampaignDetailView(RetrieveAPIView):
    """
    Retrieve a campaign by id
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CampaignDetailSerializer
    queryset = Campaign.objects.all().prefetch_related('lineitem_set')

    @swagger_auto_schema(
        operation_description="Retrieve a campaign by id",
        responses={
            200: CampaignDetailSerializer,
            401: openapi.Response(description="Authentication credentials were not provided"),
            403: openapi.Response(description="Permission denied"),
        }
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class CampaignListCSVDownloadView(APIView):
    """
    Download a CSV file of all campaigns
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Download CSV file containing all campaigns with their details",
        responses={
            200: openapi.Response(
                description="CSV file download",
                schema=openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_BINARY
                )
            ),
            401: openapi.Response(description="Authentication credentials were not provided"),
            403: openapi.Response(description="Permission denied"),
        }
    )
    def post(self, request, *args, **kwargs):
        timestamp = datetime.now(tz=ZoneInfo('UTC')).strftime('%Y-%m-%d_%H-%M-%S')
        filename = f'campaigns_export_{timestamp}.csv'  # File name with timestamp to avoid file name conflict
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)

        writer.writerow([
            'ID',
            'Name', 
            'Created At',
            'Potential Invoice Amount',
            'Line Items Count',
            'Total Booked Amount',
            'Total Actual Amount',
            'Total Adjustment Amount'
        ])
        
        campaigns = Campaign.objects.all().prefetch_related('lineitem_set').order_by('id')
        
        for campaign in campaigns:
            line_items = campaign.lineitem_set.all()
            
            # Calculate totals
            total_booked = sum(Decimal(item.booked_amount) for item in line_items)
            total_actual = sum(Decimal(item.actual_amount) for item in line_items)
            total_adjustment = sum(Decimal(item.adjustment_amount) for item in line_items)
            potential_invoice = total_actual + total_adjustment
            
            writer.writerow([
                campaign.id,
                campaign.name,
                campaign.created_at.isoformat(),
                f"{potential_invoice}",
                line_items.count(),
                f"{total_booked}",
                f"{total_actual}",
                f"{total_adjustment}"
            ])
        
        return response


class LineItemPatchView(UpdateAPIView):

    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LineItemPatchSerializer
    queryset = LineItem.objects.all()

    @swagger_auto_schema(
        operation_description="Patch a line item by id",
        responses={
            200: LineItemPatchSerializer,
            401: openapi.Response(description="Authentication credentials were not provided"),
            403: openapi.Response(description="Permission denied"),
        }
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class LineItemListCSVDownloadView(APIView):
    """
    Given a campaign id, download a CSV file of all line items in the campaign
    """
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Download CSV file containing all line items in a campaign",
        responses={
            200: openapi.Response(
                description="CSV file download",
                schema=openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_BINARY
                )
            ),
            400: openapi.Response(description="Invalid campaign ID is provided"),
            401: openapi.Response(description="Authentication credentials were not provided"),
            403: openapi.Response(description="Permission denied"),
        }
    )
    def post(self, request, *args, **kwargs):
        campaign_id = kwargs.get('pk')
        
        try:
            campaign = Campaign.objects.prefetch_related('lineitem_set').get(id=campaign_id)
        except Campaign.DoesNotExist:
            return Response(
                {"message": "Campaign not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        timestamp = datetime.now(tz=ZoneInfo('UTC')).strftime('%Y-%m-%d_%H-%M-%S')
        filename = f'line_items_export_{campaign_id}_{timestamp}.csv'
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        writer.writerow([
            'ID',
            'Name',
            'Booked Amount',
            'Actual Amount',
            'Adjustment Amount',
            'Final Amount',
            'Campaign ID',
            'Campaign Name',
        ])

        for line_item in campaign.lineitem_set.all():
            writer.writerow([
                line_item.id,
                line_item.name,
                line_item.booked_amount,
                line_item.actual_amount,
                line_item.adjustment_amount,
                line_item.final_amount,
                campaign.id,
                campaign.name,
            ])

        return response
