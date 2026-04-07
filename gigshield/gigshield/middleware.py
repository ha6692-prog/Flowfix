import traceback
from django.http import HttpResponse

class FullExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        tb = traceback.format_exc()
        return HttpResponse(f"<pre>{tb}</pre>", status=500)
