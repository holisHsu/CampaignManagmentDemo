from rest_framework.test import APIClient

from django.urls import reverse

from placements_io.tests.base import LoginViewTestCaseBase


class LoginTestCase(LoginViewTestCaseBase):

    def test_login_success(self):
        response = self.client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'password'
        })
        assert response.status_code == 200
        assert response.json()['message'] == 'Login successful'

    def test_login_failure(self):
        response = self.client.post(reverse('login'), {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        assert response.status_code == 400
        assert response.json()['message'] == 'Invalid credentials'


class PingPongViewTestCase(LoginViewTestCaseBase):
    def test_request_with_login(self):
        self.login()
        response = self.client.get(reverse('ping_pong'))
        assert response.status_code == 200
        assert response.json()['message'] == 'pong'

    def test_request_without_login(self):
        anonymous_client = APIClient()
        response = anonymous_client.get(reverse('ping_pong'))
        assert response.status_code == 403


class LogoutViewTestCase(LoginViewTestCaseBase):

    def test_logout(self):
        self.login()

        ping_pong_response = self.client.get(reverse('ping_pong'))
        assert ping_pong_response.status_code == 200

        response = self.client.post(reverse('logout'))
        assert response.status_code == 200

        ping_pong_response_after_logout = self.client.get(reverse('ping_pong'))
        assert ping_pong_response_after_logout.status_code == 403
