from django.db import models
from django.contrib.auth.models import User


# Create your models here.
class Fragment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    upload = models.FileField(upload_to='uploads/%Y/%m/%d/')

    def __str__(self):
        return self.user.username, self.upload.name

