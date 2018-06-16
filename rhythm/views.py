from django.http import HttpResponse
from django.shortcuts import render

from .models import Creation, Fragment


# Create your views here.
def index(request):
    return render(request, 'rhythm/index.html')


def create(request):
    if request.method == 'GET':
        range_list = [i for i in range(1, 22)]
        return render(request, 'rhythm/create.html', {'range_list': range_list})
    elif request.method == 'POST':
        if request.user.is_authenticated:
            history = request.POST.get('history')
            creation = Creation(user=request.user, record=history)
            creation.save()
            return HttpResponse('ok')
        else:
            return HttpResponse('please sign in first')


def recognize(request):
    if request.method == 'POST':
        audio = request.FILES['audio']
        if request.user.is_authenticated:
            fragment = Fragment(user=request.user, upload=audio)
            fragment.save()
        return render(request, 'rhythm/recognize.html', {'audio': audio})
    return render(request, 'rhythm/recognize.html')
