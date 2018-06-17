from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from .models import Creation, Fragment, Score


# Create your views here.
def index(request):
    if request.user.is_authenticated:
        tip = 'Choose a mode to enjoy more.'
        request.session['tip'] = tip
    return render(request, 'rhythm/index.html')


def create(request):
    if request.method == 'GET':
        range_list = [i for i in range(1, 22)]
        request.session['range_list'] = range_list
        if request.user.is_authenticated:
            tip = 'Creation History'
            request.session['tip'] = tip
            creations = Creation.objects.filter(user_id=request.user.id).order_by('-last_edited_at')
            records = []
            for creation in creations:
                records.append({'title': creation.name, 'detail': creation.record})
            request.session['records'] = records
        return render(request, 'rhythm/create.html')
    elif request.method == 'POST':
        if request.user.is_authenticated:
            history = request.POST.get('history')
            creation = Creation(user=request.user, record=history)
            creation.save()
            url = reverse('create')
            return HttpResponseRedirect(url)
        else:
            return HttpResponse('Please sign in first.')


def recognize(request):
    if request.method == 'POST':
        audio = request.FILES['audio']
        if request.user.is_authenticated:
            fragment = Fragment(user=request.user, upload=audio)
            fragment.save()
            src = '/media/' + fragment.upload.__str__()
            request.session['src'] = src
            url = reverse('recognize')
            return HttpResponseRedirect(url)
        else:
            return HttpResponse('Please sign in first')  # todo: require sign in
    elif request.method == 'GET':
        if request.user.is_authenticated:
            tip = 'Recognition History'
            request.session['tip'] = tip
            fragments = Fragment.objects.filter(user=request.user).order_by('-last_edited_at')
            records = []
            for fragment in fragments:
                name = fragment.upload.name.split('/')[-1]
                name = '.'.join(name.split('.')[:-1])
                datetime = fragment.upload.name.split('/')[1:4]
                datetime = '-'.join(datetime)
                records.append({'title': name, 'detail': datetime})
            request.session['records'] = records
        return render(request, 'rhythm/recognize.html')


def challenge(request):
    if request.method == 'GET':
        if request.user.is_authenticated:
            tip = 'High Score'
            request.session['tip'] = tip
            scores = Score.objects.filter(user=request.user).order_by('-score')
            records = []
            for score in scores:
                s = str(score.score)
                datetime = str(score.created_at).split('.')[0]
                records.append({'title': s, 'detail': datetime})
            request.session['records'] = records
        return render(request, 'rhythm/challenge.html')
    elif request.method == 'POST':
        if request.user.is_authenticated:
            sc = request.POST.get('score')
            score = Score(user=request.user, score=sc)
            score.save()
            url = reverse('challenge')
            return HttpResponseRedirect(url)
        else:
            return HttpResponse('Please sign in first.')
