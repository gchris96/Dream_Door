from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import House
from .serializers import HouseSerializer

@api_view(['GET'])
def list_houses(request):
    houses = House.objects.all().order_by('id')
    serializer = HouseSerializer(houses, many=True)
    return Response(serializer.data)
