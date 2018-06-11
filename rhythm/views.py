from django.http import HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request):
    return render(request, 'rhythm/index.html')


def create(request):
    return render(request, 'rhythm/create.html')
