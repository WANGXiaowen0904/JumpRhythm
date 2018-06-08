from django.db import models


# Create your models here.
class User(models.Model):
    email = models.CharField(max_length=32)
    name = models.CharField(max_length=64)
    password = models.CharField(max_length=16)
    create_at = models.DateTimeField('register at', auto_now_add=True)
