"""
Serializer and Pagination
"""

from decimal import Decimal

from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from django.db.models import QuerySet

from placements_io.models import Campaign, LineItem


def get_drf_pagination_schema_serializer(
    name: str,
    serializer_class: type[serializers.Serializer],
) -> type[serializers.Serializer]:
    """
    This is META Programing in Pyhton
    Aim to create a serializer class dynamically to describe the pagination API schema
    """
    return type(
        name,
        (serializers.Serializer,),
        {
            'count': serializers.IntegerField(),
            'next': serializers.URLField(),
            'previous': serializers.URLField(),
            'results': serializer_class(many=True),
        },
    )


class CampaignPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CampaignSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    potential_invoice_amount = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id',
            'name',
            'created_at',
            'potential_invoice_amount',
            'budget_fullfillment_rate',
        ]

    def get_potential_invoice_amount(self, obj) -> Decimal:
        line_items: QuerySet[LineItem] = obj.lineitem_set.all()

        actual_amount = sum(line_item.actual_amount for line_item in line_items)
        adjustment_amount = sum(line_item.adjustment_amount for line_item in line_items)

        return actual_amount + adjustment_amount

    def get_created_at(self, obj) -> str:
        return obj.created_at.isoformat()


class LineItemSerializer(serializers.ModelSerializer):
    created_at = serializers.SerializerMethodField()
    updated_at = serializers.SerializerMethodField()

    class Meta:
        model = LineItem
        fields = [
            'id',
            'name',
            'booked_amount',
            'actual_amount',
            'adjustment_amount',
            'final_amount',  # Please look LineItem.final_amount for more details
            'budget_fullfillment_rate',
            'created_at',
            'updated_at',
        ]

    def get_created_at(self, obj) -> str:
        return obj.created_at.isoformat()

    def get_updated_at(self, obj) -> str:
        return obj.updated_at.isoformat()


class LineItemPatchSerializer(serializers.ModelSerializer):
    """
    專門用於 PATCH 操作的 LineItem Serializer
    只允許修改 adjustment_amount 欄位
    """
    class Meta:
        model = LineItem
        fields = [
            # Fields allow modification
            'adjustment_amount',
        ]
        read_only_fields = ['id', 'campaign', 'name', 'booked_amount', 'actual_amount', 'created_at', 'updated_at']


class CampaignDetailSerializer(serializers.ModelSerializer):
    potential_invoice_amount = serializers.SerializerMethodField()
    line_items = serializers.SerializerMethodField()
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id',
            'name',
            'created_at',
            'potential_invoice_amount',
            'line_items',
        ]

    def get_potential_invoice_amount(self, obj) -> Decimal:
        line_items: QuerySet[LineItem] = obj.lineitem_set.all()

        # Please look LineItem.final_amount for more details
        return sum(line_item.final_amount for line_item in line_items)

    def get_created_at(self, obj) -> str:
        return obj.created_at.strftime('%Y-%m-%d %H:%M:%S')

    def get_line_items(self, obj) -> list[dict]:
        line_items = obj.lineitem_set.order_by('-updated_at', '-created_at', 'id')
        return LineItemSerializer(line_items, many=True).data
