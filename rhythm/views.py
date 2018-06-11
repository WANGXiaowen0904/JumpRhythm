from django.shortcuts import render


# Create your views here.
def index(request):
    return render(request, 'rhythm/index.html')


def create(request):
    range_list = [i for i in range(1, 22)]
    return render(request, 'rhythm/create.html', {'range_list': range_list})


def recogize(request):
    return render(request, 'rhythm/recognize.html')
