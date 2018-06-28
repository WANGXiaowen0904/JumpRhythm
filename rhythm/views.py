from django.http import HttpResponse, HttpResponseRedirect, QueryDict
from django.shortcuts import render
from django.urls import reverse

from .models import Creation, Fragment, Score


# Create your views here.
def index(request):
    if request.user.is_authenticated:
        tip = 'Choose a mode to enjoy more.'
        request.session['tip'] = tip
    try:
        del request.session['records']
    except Exception as e:
        print(e)
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
                datetime = str(creation.created_at).split('.')[0]
                records.append({'id': creation.id, 'title': creation.name, 'detail': datetime, 'hash': creation.record})
            request.session['records'] = records
        return render(request, 'rhythm/create.html')
    elif request.method == 'POST':
        if request.user.is_authenticated:
            history = request.POST.get('history')
            name = request.POST.get('name')
            creation = Creation(user=request.user, name=name, record=history)
            creation.save()
            url = reverse('create')
            return HttpResponseRedirect(url)
        else:
            return HttpResponse('Please sign in first.')
    elif request.method == 'PUT':
        if request.user.is_authenticated:
            put = QueryDict(request.body)
            history = put.get('history')
            hid = put.get('history-id')
            creation = Creation.objects.get(pk=hid)
            creation.record = history
            creation.save()
            return render(request, 'rhythm/create.html', status=200)
        else:
            return HttpResponse('Please sign in first.')
    elif request.method == 'DELETE':
        if request.user.is_authenticated:
            delete = QueryDict(request.body)
            hid = delete.get('history-id')
            Creation.objects.get(pk=hid).delete()
            return render(request, 'rhythm/create.html', status=200)
        else:
            return HttpResponse('Please sign in first.')


def recognize(request):
    if request.method == 'POST':
        if 'audio' in request.FILES:
            audio = request.FILES['audio']
            fragment = Fragment(user=request.user, upload=audio)
            fragment.save()
        else:
            hid = request.POST.get('history-id')
            fragment = Fragment.objects.get(pk=hid)
        src = '/media/' + fragment.upload.__str__()
        print(src)
        request.session['src'] = src
        url = reverse('recognize')
        return HttpResponseRedirect(url)
    elif request.method == 'GET':
        if request.user.is_authenticated:
            tip = 'Recognition History'
            request.session['tip'] = tip
            fragments = Fragment.objects.filter(user=request.user).order_by('-last_edited_at')
            records = []
            for fragment in fragments:
                name = fragment.upload.name.split('/')[-1]
                name = '.'.join(name.split('.')[:-1])
                datetime = str(fragment.created_at).split('.')[0]
                records.append({'id': fragment.id, 'title': name, 'detail': datetime})
            request.session['records'] = records
        return render(request, 'rhythm/recognize.html')
    elif request.method == 'DELETE':
        if request.user.is_authenticated:
            delete = QueryDict(request.body)
            hid = delete.get('history-id')
            fragment = Fragment.objects.get(pk=hid)
            fragment.upload.delete(save=True)
            fragment.delete()
            return render(request, 'rhythm/recognize.html', status=200)
        else:
            return HttpResponse('Please sign in first.')


def challenge(request):
    if request.method == 'GET':
        if request.user.is_authenticated:
            tip = 'High Score'
            request.session['tip'] = tip
            scores = Score.objects.filter(user=request.user).order_by('-score')[:3]
            records = []
            for score in scores:
                s = str(score.score)
                datetime = str(score.created_at).split('.')[0]
                records.append({'id': score.id, 'title': s, 'detail': datetime})
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
