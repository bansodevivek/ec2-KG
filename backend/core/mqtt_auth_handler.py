import json
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from core.models import RoleUser

def handle_mqtt_login(client, payload):
    data = json.loads(payload)
    email = data.get("email") 
    password = data.get("pass")

    user = authenticate(username=email, password=password)
    
    response = {}
    if user is not None:
        role_profile = RoleUser.objects.get(user=user)
        response = {
            "status": "success",
            "owner": f"{user.first_name} {user.last_name}",
            "role": role_profile.role,
            "phone": role_profile.phone,
            "vehicleNo": role_profile.vehicle_no,
            "email": email
        }
    else:
        response = {"status": "error", "message": "Invalid credentials"}

    # ==========================================================
    # UPDATED: Publish to new response topic
    # ==========================================================
    client.publish("kg-dash/user/login/response", json.dumps(response))
    # ----------------------------------------------------------

def handle_mqtt_signup(client, payload):
    data = json.loads(payload)
    try:
        user = User.objects.create_user(
            username=data['email'], 
            email=data['email'], 
            password=data['pass'],
            first_name=data.get('ownerName', '')
        )
        RoleUser.objects.create(
            user=user,
            role=data.get('role', 'owner'),
            phone=data.get('phone', ''),
            vehicle_no=data.get('vehicleNo', '')
        )
        response = {"status": "success", "message": "Account Created"}
    except Exception as e:
        response = {"status": "error", "message": str(e)}

    # ==========================================================
    # UPDATED: Publish to new response topic
    # ==========================================================
    client.publish("kg-dash/user/signup/response", json.dumps(response))
    # ----------------------------------------------------------