from django.conf.urls import url
from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='home'),
    url(r'^sign-in/$', auth_views.login,
        {'template_name': 'myauth/signin.html'},
        name='sign_in'),
    url(r'^sign-out/$', auth_views.logout,
        {'next_page': '/'},
        name='sign_out'),
]
