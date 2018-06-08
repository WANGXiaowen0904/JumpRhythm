from django.contrib.auth import authenticate, login
from django.http import HttpResponse
from django.shortcuts import render, redirect


# Create your views here.
def index(request):
    return HttpResponse("Hello world!")


def sign_in(request):
    return HttpResponse("This is a login page.")


def sign_up(request):
    # if request.method == 'POST':
    #     form = RegisterForm(request.POST)
    #     if form.is_valid():
    #         user = form.save()
    #         user.refresh_from_db()
    #         user.email = form.cleaned_data.get('email')
    #         user.save()
    #         # name = form.cleaned_data.get('name')
    #         # raw_password = form.cleaned_data.get('password1')
    #         # user = authenticate(username=name, password=raw_password)
    #         return HttpResponse('Register successfully!')
    # else:
    #     form = RegisterForm()
    # return render(request, 'register.html', {'form': 'todo'})
    return HttpResponse("This is a register page.")
