from decimal import Decimal
from django.db import models

"""
In this simplfied DEMO,
    - Publisher & Advertiser is not necessarily to be modeled,
    - Invoice, also there is no scenario to really issue any invoice,
        so I decide not to model it as well
"""


class Campaign(models.Model):
    id = models.AutoField(primary_key=True)  # Auto increment integer id
    name = models.CharField(max_length=255)  # max_length can be larger in real case
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def budget_fullfillment_rate(self) -> int:
        """
        A percentage value indicate how much of the budget is fullfilled
        If LineItem.count is 10 and LineItem.budget_fullfillment_rate is 50, then Budget Fullfillment Rate is 50%
        """
        line_items = self.lineitem_set.all()
        total_booked_amount = sum(line_item.booked_amount for line_item in line_items)
        total_final_amount = sum(line_item.final_amount for line_item in line_items)
        return int(total_final_amount / total_booked_amount * 100)


class LineItem(models.Model):
    id = models.AutoField(primary_key=True)  # Auto increment integer id
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,  # LineItem not exist alone without Campaign
    )
    name = models.CharField(max_length=255)  # max_length can be larger in real case
    # decimal_places should be enough to store the given precision
    booked_amount = models.DecimalField(max_digits=30, decimal_places=20)
    actual_amount = models.DecimalField(max_digits=30, decimal_places=20)
    # Use "amount" postfix to adjustment to indicate it's same data type as booked_amount and actual_amount
    adjustment_amount = models.DecimalField(max_digits=30, decimal_places=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property  # This model attribute not stored in DB, instead, it's calculated on the fly
    def final_amount(self) -> Decimal:
        return self.actual_amount + self.adjustment_amount

    @property
    def budget_fullfillment_rate(self) -> int:
        """
        A percentage value indicate how much of the budget is fullfilled
        If Booked Amount is 100 and Actual + Adjustment Amount is 50, then Budget Fullfillment Rate is 50%
        If Booked Amount is 100 and Actual + Adjustment Amount is 150, then Budget Fullfillment Rate is 150%
        If Booked Amount is 100 and Actual + Adjustment Amount is 0, then Budget Fullfillment Rate is 0%
        """
        return int((self.actual_amount + self.adjustment_amount) / self.booked_amount * 100)

    def __str__(self):
        return self.name
