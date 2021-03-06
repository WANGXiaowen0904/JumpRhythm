from django.conf.urls import url
from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    url(r'^$', views.index, name='home'),
    url(r'^create/$', views.create, name='create'),
    url(r'^recognize/$', views.recognize, name='recognize'),
    url(r'^challenge/$', views.challenge, name='challenge'),
]
