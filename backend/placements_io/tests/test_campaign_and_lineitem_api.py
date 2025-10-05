from decimal import Decimal

from django.urls import reverse

from placements_io.tests.base import LoginViewTestCaseBase

from placements_io.models import Campaign, LineItem


class ListCampaignTestCase(LoginViewTestCaseBase):

    def setUp(self):
        super().setUp()
        self.login()

    def test_list_campaign(self):
        response = self.client.get(reverse('list_campaign'))

        assert response.status_code == 200
        assert len(response.json()['results']) == 20

    def test_list_campaign_with_page(self):
        response = self.client.get(reverse('list_campaign'), {'page': 2})
        assert response.status_code == 200
        assert len(response.json()['results']) == 20

    def test_list_campaign_exceed_max_page(self):
        response = self.client.get(reverse('list_campaign'), {'page': 100})
        assert response.status_code == 404
        assert 'Invalid page' in response.json()['detail']

    def test_csv_download_campaign(self):
        response = self.client.post(reverse('csv_download_campaign'))
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/csv'
        assert 'attachment' in response.headers['Content-Disposition']

        csv_data = response.content.decode('utf-8').splitlines()
        assert len(csv_data) == 420  # 1 header + 419 campaign rows


class DetailCampaignTestCase(LoginViewTestCaseBase):

    def setUp(self):
        super().setUp()
        self.login()

        self.campaign = Campaign.objects.create(name='Test Campaign')

        self.line_items = (
            LineItem(
                name='Test Line Item 1',
                booked_amount='100',
                actual_amount='100',
                adjustment_amount='10',
                campaign=self.campaign
            ),
            LineItem(
                name='Test Line Item 2',
                booked_amount='200',
                actual_amount='200',
                adjustment_amount='-10',
                campaign=self.campaign
            ),
        )
        LineItem.objects.bulk_create(self.line_items)

    def test_detail_campaign(self):
        response = self.client.get(reverse('detail_campaign', args=[self.campaign.id]))
        assert response.status_code == 200
        
        resp_data = response.json()
        assert resp_data['id'] == self.campaign.id
        assert resp_data['name'] == self.campaign.name
        assert resp_data['created_at'] is not None
        assert resp_data['potential_invoice_amount'] == 300.0

        assert len(resp_data['line_items']) == 2
        assert resp_data['line_items'][0]['id'] == self.line_items[1].id
        assert resp_data['line_items'][0]['name'] == self.line_items[1].name
        assert Decimal(resp_data['line_items'][0]['booked_amount']) == Decimal(self.line_items[1].booked_amount)
        assert Decimal(resp_data['line_items'][0]['actual_amount']) == Decimal(self.line_items[1].actual_amount)
        assert Decimal(resp_data['line_items'][0]['adjustment_amount']) == Decimal(self.line_items[1].adjustment_amount)
        assert resp_data['line_items'][0]['created_at'] is not None
        assert resp_data['line_items'][0]['updated_at'] is not None
        assert Decimal(resp_data['line_items'][0]['final_amount']) == (
            Decimal(self.line_items[1].actual_amount) + Decimal(self.line_items[1].adjustment_amount)
        )
        assert resp_data['line_items'][1]['id'] == self.line_items[0].id
        assert resp_data['line_items'][1]['name'] == self.line_items[0].name
        assert Decimal(resp_data['line_items'][1]['booked_amount']) == Decimal(self.line_items[0].booked_amount)
        assert Decimal(resp_data['line_items'][1]['actual_amount']) == Decimal(self.line_items[0].actual_amount)
        assert Decimal(resp_data['line_items'][1]['adjustment_amount']) == Decimal(self.line_items[0].adjustment_amount)
        assert resp_data['line_items'][1]['created_at'] is not None
        assert resp_data['line_items'][1]['updated_at'] is not None
        assert Decimal(resp_data['line_items'][1]['final_amount']) == (
            Decimal(self.line_items[0].actual_amount) + Decimal(self.line_items[0].adjustment_amount)
        )

    def test_download_line_item_in_campaign(self):
        response = self.client.post(reverse('csv_download_line_item', args=[self.campaign.id]))
        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'text/csv'
        assert 'attachment' in response.headers['Content-Disposition']

        csv_data = response.content.decode('utf-8').splitlines()
        assert len(csv_data) == 3  # 1 header + 2 line item rows

    def test_download_line_item_in_campaign_with_invalid_campaign_id(self):
        not_exist_campaign_id = 999999
        response = self.client.post(reverse('csv_download_line_item', args=[not_exist_campaign_id]))
        assert response.status_code == 400


class PatchLineItemTestCase(LoginViewTestCaseBase):

    def setUp(self):
        super().setUp()
        self.login()

    def test_patch_line_item(self):
        campaign = Campaign.objects.create(name='Test Campaign')
        line_item = LineItem.objects.create(
            campaign=campaign,
            name='Test Line Item',
            booked_amount='100',
            actual_amount='100',
            adjustment_amount='10',
        )

        response = self.client.patch(reverse('patch_line_item', args=[line_item.id]), {'adjustment_amount': '20'})

        assert response.status_code == 200
        assert Decimal(response.json()['adjustment_amount']) == Decimal('20')

        line_item.refresh_from_db()
        assert Decimal(line_item.adjustment_amount) == Decimal('20')
