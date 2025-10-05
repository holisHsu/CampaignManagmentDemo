from rest_framework.test import APITestCase

from django.contrib.auth.models import User


class LoginViewTestCaseBase(APITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(
            username='testuser',
            password='password'
        )

    def login(self):
        self.client.login(username='testuser', password='password')
