from django.http import HttpResponse
from django.shortcuts import render

from .models import Creation, Fragment


# Create your views here.
def index(request):
    if request.user.is_authenticated:
        tip = 'Choose a mode to enjoy more.'
    else:
        tip = 'Sign in to enjoy more.'
    return render(request, 'rhythm/index.html', {'tip': tip})


def create(request):
    if request.method == 'GET':
        range_list = [i for i in range(1, 22)]
        tip = 'Creation History'
        history_list = Creation.objects.order_by('-last_edited_at')
        context = {
            'range_list': range_list,
            'tip': tip,
            'history_list': history_list,
        }
        return render(request, 'rhythm/create.html', context)
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
    tip = 'Recognition History'
    return render(request, 'rhythm/recognize.html', {'tip': tip})
