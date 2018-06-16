from django.db import models
from django.contrib.auth.models import User


# Create your models here.
class Creation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255, default='test')
    record = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    last_edited_at = models.DateTimeField(auto_now=True)


class Fragment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    upload = models.FileField(upload_to='uploads/%Y/%m/%d/')

    def __str__(self):
        return self.user.username + ': ' + self.upload.name

