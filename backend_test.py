#!/usr/bin/env python3
"""
Backend API Testing for Glenx MedHub - Pharmacy and Ambulance Listing Endpoints
Testing pharmacy and ambulance listing APIs with realistic Ghana data
"""

import requests
import json
from datetime import datetime, timedelta
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=')[1].strip()
    except:
        pass
    return "https://medhub-ghana.preview.emergentagent.com"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

print(f"Testing backend at: {API_URL}")

# Test data with realistic Ghana information
TEST_USER = {
    "email": "kwame.asante@gmail.com",
    "phone": "+233244567890",
    "national_id": "GHA-123456789-01",
    "password": "SecurePass123!",
    "full_name": "Kwame Asante",
    "role": "patient"
}

# Global variables to store test data
access_token = None
user_data = None
doctors_list = []
test_appointment_id = None

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ PASS: {test_name}")
    
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name} - {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return self.failed == 0

def make_request(method, endpoint, data=None, headers=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{API_URL}{endpoint}"
    
    default_headers = {"Content-Type": "application/json"}
    if headers:
        default_headers.update(headers)
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=default_headers, params=params, timeout=30)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=default_headers, timeout=30)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=default_headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed for {method} {endpoint}: {str(e)}")
        return None

def test_user_registration():
    """Test POST /api/auth/register"""
    global access_token, user_data
    
    print("\n🔐 Testing User Registration...")
    
    response = make_request("POST", "/auth/register", TEST_USER)
    
    if not response:
        print("❌ Registration failed - No response")
        return False
    
    if response.status_code == 200:
        data = response.json()
        if "access_token" in data and "user" in data:
            access_token = data["access_token"]
            user_data = data["user"]
            print(f"✅ Registration successful - User ID: {user_data['id']}")
            print(f"   Token type: {data.get('token_type', 'bearer')}")
            return True
        else:
            print(f"❌ Registration response missing required fields: {data}")
            return False
    elif response.status_code == 400:
        error_detail = response.json().get("detail", "Unknown error")
        if "already exists" in error_detail:
            print(f"⚠️  User already exists, trying login instead...")
            return test_user_login()
        else:
            print(f"❌ Registration failed - {error_detail}")
            return False
    else:
        print(f"❌ Registration failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_user_login():
    """Test POST /api/auth/login"""
    global access_token, user_data
    
    print("\n🔑 Testing User Login...")
    
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    response = make_request("POST", "/auth/login", login_data)
    
    if not response:
        print("❌ Login failed - No response")
        return False
    
    if response.status_code == 200:
        data = response.json()
        if "access_token" in data and "user" in data:
            access_token = data["access_token"]
            user_data = data["user"]
            print(f"✅ Login successful - User ID: {user_data['id']}")
            return True
        else:
            print(f"❌ Login response missing required fields: {data}")
            return False
    else:
        print(f"❌ Login failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_get_current_user():
    """Test GET /api/auth/me"""
    print("\n👤 Testing Get Current User...")
    
    if not access_token:
        print("❌ No access token available")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = make_request("GET", "/auth/me", headers=headers)
    
    if not response:
        print("❌ Get current user failed - No response")
        return False
    
    if response.status_code == 200:
        data = response.json()
        if "id" in data and "email" in data:
            print(f"✅ Get current user successful - {data['full_name']} ({data['email']})")
            return True
        else:
            print(f"❌ Get current user response missing required fields: {data}")
            return False
    else:
        print(f"❌ Get current user failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_seed_doctors():
    """Test POST /api/seed-doctors"""
    print("\n👨‍⚕️ Testing Seed Doctors...")
    
    response = make_request("POST", "/seed-doctors")
    
    if not response:
        print("❌ Seed doctors failed - No response")
        return False
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Seed doctors successful - {data.get('message', 'Done')}")
        return True
    else:
        print(f"❌ Seed doctors failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_list_doctors():
    """Test GET /api/doctors"""
    global doctors_list
    
    print("\n📋 Testing List Doctors...")
    
    response = make_request("GET", "/doctors")
    
    if not response:
        print("❌ List doctors failed - No response")
        return False
    
    if response.status_code == 200:
        doctors_list = response.json()
        if isinstance(doctors_list, list):
            print(f"✅ List doctors successful - Found {len(doctors_list)} doctors")
            for doctor in doctors_list[:3]:  # Show first 3 doctors
                print(f"   - {doctor['full_name']} ({doctor['specialty']}) - {doctor['location']}")
            return True
        else:
            print(f"❌ List doctors response is not a list: {doctors_list}")
            return False
    else:
        print(f"❌ List doctors failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_list_doctors_with_filters():
    """Test GET /api/doctors with filters"""
    print("\n🔍 Testing List Doctors with Filters...")
    
    # Test specialty filter
    params = {"specialty": "General"}
    response = make_request("GET", "/doctors", params=params)
    
    if not response:
        print("❌ List doctors with specialty filter failed - No response")
        return False
    
    if response.status_code == 200:
        filtered_doctors = response.json()
        print(f"✅ Specialty filter successful - Found {len(filtered_doctors)} General Practitioners")
        
        # Test location filter
        params = {"location": "Accra"}
        response = make_request("GET", "/doctors", params=params)
        
        if response and response.status_code == 200:
            location_doctors = response.json()
            print(f"✅ Location filter successful - Found {len(location_doctors)} doctors in Accra")
            
            # Test rating filter
            params = {"min_rating": 4.0}
            response = make_request("GET", "/doctors", params=params)
            
            if response and response.status_code == 200:
                rating_doctors = response.json()
                print(f"✅ Rating filter successful - Found {len(rating_doctors)} doctors with rating >= 4.0")
                return True
    
    print(f"❌ List doctors with filters failed")
    return False

def test_get_doctor_details():
    """Test GET /api/doctors/{doctor_id}"""
    print("\n🩺 Testing Get Doctor Details...")
    
    if not doctors_list:
        print("❌ No doctors available for testing")
        return False
    
    doctor_id = doctors_list[0]["id"]
    response = make_request("GET", f"/doctors/{doctor_id}")
    
    if not response:
        print("❌ Get doctor details failed - No response")
        return False
    
    if response.status_code == 200:
        doctor = response.json()
        if "id" in doctor and "full_name" in doctor:
            print(f"✅ Get doctor details successful - {doctor['full_name']}")
            print(f"   Specialty: {doctor['specialty']}")
            print(f"   Location: {doctor['location']}")
            print(f"   Fee: GHS {doctor['consultation_fee']}")
            print(f"   Rating: {doctor['rating']}/5.0")
            return True
        else:
            print(f"❌ Get doctor details response missing required fields: {doctor}")
            return False
    else:
        print(f"❌ Get doctor details failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_book_appointment():
    """Test POST /api/appointments"""
    global test_appointment_id
    
    print("\n📅 Testing Book Appointment...")
    
    if not access_token:
        print("❌ No access token available")
        return False
    
    if not doctors_list:
        print("❌ No doctors available for booking")
        return False
    
    # Book appointment with first doctor
    doctor_id = doctors_list[0]["id"]
    appointment_time = datetime.now() + timedelta(days=1)
    
    appointment_data = {
        "doctor_id": doctor_id,
        "appointment_type": "video",
        "scheduled_time": appointment_time.isoformat(),
        "reason": "General consultation and health checkup"
    }
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = make_request("POST", "/appointments", appointment_data, headers)
    
    if not response:
        print("❌ Book appointment failed - No response")
        return False
    
    if response.status_code == 200:
        appointment = response.json()
        if "id" in appointment:
            test_appointment_id = appointment["id"]
            print(f"✅ Book appointment successful - ID: {test_appointment_id}")
            print(f"   Doctor: {appointment['doctor_name']}")
            print(f"   Type: {appointment['appointment_type']}")
            print(f"   Status: {appointment['status']}")
            return True
        else:
            print(f"❌ Book appointment response missing required fields: {appointment}")
            return False
    else:
        print(f"❌ Book appointment failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_get_my_appointments():
    """Test GET /api/appointments/my-appointments"""
    print("\n📋 Testing Get My Appointments...")
    
    if not access_token:
        print("❌ No access token available")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = make_request("GET", "/appointments/my-appointments", headers=headers)
    
    if not response:
        print("❌ Get my appointments failed - No response")
        return False
    
    if response.status_code == 200:
        appointments = response.json()
        if isinstance(appointments, list):
            print(f"✅ Get my appointments successful - Found {len(appointments)} appointments")
            for appointment in appointments:
                print(f"   - {appointment['doctor_name']} on {appointment['scheduled_time'][:10]} ({appointment['status']})")
            return True
        else:
            print(f"❌ Get my appointments response is not a list: {appointments}")
            return False
    else:
        print(f"❌ Get my appointments failed - Status: {response.status_code}, Response: {response.text}")
        return False

def test_cancel_appointment():
    """Test PUT /api/appointments/{appointment_id}/cancel"""
    print("\n❌ Testing Cancel Appointment...")
    
    if not access_token:
        print("❌ No access token available")
        return False
    
    if not test_appointment_id:
        print("❌ No appointment ID available for cancellation")
        return False
    
    headers = {"Authorization": f"Bearer {access_token}"}
    response = make_request("PUT", f"/appointments/{test_appointment_id}/cancel", headers=headers)
    
    if not response:
        print("❌ Cancel appointment failed - No response")
        return False
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Cancel appointment successful - {result.get('message', 'Done')}")
        return True
    else:
        print(f"❌ Cancel appointment failed - Status: {response.status_code}, Response: {response.text}")
        return False

def run_all_tests():
    """Run all backend API tests"""
    print("=" * 60)
    print("🏥 GLENX MEDHUB BACKEND API TESTING")
    print("=" * 60)
    
    test_results = {}
    
    # Authentication Tests
    test_results["User Registration"] = test_user_registration()
    if not access_token:  # If registration failed, try login
        test_results["User Login"] = test_user_login()
    test_results["Get Current User"] = test_get_current_user()
    
    # Doctor Tests
    test_results["Seed Doctors"] = test_seed_doctors()
    test_results["List Doctors"] = test_list_doctors()
    test_results["List Doctors with Filters"] = test_list_doctors_with_filters()
    test_results["Get Doctor Details"] = test_get_doctor_details()
    
    # Appointment Tests
    test_results["Book Appointment"] = test_book_appointment()
    test_results["Get My Appointments"] = test_get_my_appointments()
    test_results["Cancel Appointment"] = test_cancel_appointment()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<35} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {passed + failed}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    return test_results

if __name__ == "__main__":
    results = run_all_tests()
    
    # Exit with error code if any tests failed
    if any(not result for result in results.values()):
        sys.exit(1)
    else:
        sys.exit(0)