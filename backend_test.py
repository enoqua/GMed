#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Glenx MedHub
Testing new pharmacy e-commerce, ambulance booking, and video consultation APIs
"""

import requests
import json
import os
from datetime import datetime, timedelta
import uuid

# Get backend URL from frontend env
BACKEND_URL = "https://medhub-ghana.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_pass(self, test_name):
        self.passed += 1
        print(f"✅ PASS: {test_name}")
        
    def log_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ FAIL: {test_name} - {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        print(f"{'='*60}")
        if self.errors:
            print("FAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")

results = TestResults()

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

def test_pharmacy_ambulance_listing():
    """Test pharmacy and ambulance listing endpoints"""
    results = TestResults()
    
    print("🧪 Testing Pharmacy and Ambulance Listing APIs")
    print(f"Backend URL: {API_URL}")
    print("="*60)
    
    try:
        # 1. Create test pharmacy users
        print("\n📋 Creating test pharmacy users...")
        pharmacy_users = [
            {
                "email": "accra.pharmacy@test.com",
                "phone": "+233244123456",
                "national_id": "GHA123456789",
                "password": "pharmacy123",
                "full_name": "Accra Central Pharmacy",
                "role": "pharmacy",
                "pharmacy_name": "Accra Central Pharmacy",
                "location": "Accra",
                "license_number": "PHA001234",
                "license_type": "retail"
            },
            {
                "email": "kumasi.pharmacy@test.com", 
                "phone": "+233244234567",
                "national_id": "GHA234567890",
                "password": "pharmacy123",
                "full_name": "Kumasi Health Pharmacy",
                "role": "pharmacy",
                "pharmacy_name": "Kumasi Health Pharmacy", 
                "location": "Kumasi",
                "license_number": "PHA002345",
                "license_type": "retail"
            },
            {
                "email": "tema.pharmacy@test.com",
                "phone": "+233244345678", 
                "national_id": "GHA345678901",
                "password": "pharmacy123",
                "full_name": "Tema Medical Pharmacy",
                "role": "pharmacy",
                "pharmacy_name": "Tema Medical Pharmacy",
                "location": "Tema",
                "license_number": "PHA003456",
                "license_type": "retail"
            }
        ]
        
        for user_data in pharmacy_users:
            try:
                response = make_request("POST", "/auth/register", user_data)
                if response and (response.status_code == 201 or response.status_code == 200):
                    results.add_pass(f"Created pharmacy user: {user_data['pharmacy_name']}")
                elif response and response.status_code == 400 and "already exists" in response.text:
                    results.add_pass(f"Pharmacy user already exists: {user_data['pharmacy_name']}")
                else:
                    error_msg = response.text if response else "No response"
                    results.add_fail(f"Create pharmacy user: {user_data['pharmacy_name']}", 
                                   f"Status {response.status_code if response else 'None'}: {error_msg}")
            except Exception as e:
                results.add_fail(f"Create pharmacy user: {user_data['pharmacy_name']}", str(e))
        
        # 2. Create test ambulance users
        print("\n🚑 Creating test ambulance users...")
        ambulance_users = [
            {
                "email": "accra.ambulance@test.com",
                "phone": "+233244456789",
                "national_id": "GHA456789012", 
                "password": "ambulance123",
                "full_name": "Accra Emergency Services",
                "role": "ambulance",
                "location": "Accra",
                "service_areas": ["Accra", "Tema", "Kasoa"],
                "vehicle_type": "Advanced Life Support"
            },
            {
                "email": "kumasi.ambulance@test.com",
                "phone": "+233244567890",
                "national_id": "GHA567890123",
                "password": "ambulance123", 
                "full_name": "Kumasi Rescue Services",
                "role": "ambulance",
                "location": "Kumasi",
                "service_areas": ["Kumasi", "Sunyani", "Techiman"],
                "vehicle_type": "Basic Life Support"
            },
            {
                "email": "cape.ambulance@test.com",
                "phone": "+233244678901",
                "national_id": "GHA678901234",
                "password": "ambulance123",
                "full_name": "Cape Coast Medical Transport",
                "role": "ambulance", 
                "location": "Cape Coast",
                "service_areas": ["Cape Coast", "Elmina", "Winneba"],
                "vehicle_type": "Patient Transport"
            }
        ]
        
        for user_data in ambulance_users:
            try:
                response = make_request("POST", "/auth/register", user_data)
                if response and (response.status_code == 201 or response.status_code == 200):
                    results.add_pass(f"Created ambulance user: {user_data['full_name']}")
                elif response and response.status_code == 400 and "already exists" in response.text:
                    results.add_pass(f"Ambulance user already exists: {user_data['full_name']}")
                else:
                    error_msg = response.text if response else "No response"
                    results.add_fail(f"Create ambulance user: {user_data['full_name']}", 
                                   f"Status {response.status_code if response else 'None'}: {error_msg}")
            except Exception as e:
                results.add_fail(f"Create ambulance user: {user_data['full_name']}", str(e))
        
        # 3. Test Pharmacy Listing API
        print("\n💊 Testing Pharmacy Listing API...")
        
        # Test 3a: Get all pharmacies
        try:
            response = make_request("GET", "/pharmacies/all")
            if response and response.status_code == 200:
                pharmacies = response.json()
                if isinstance(pharmacies, list):
                    results.add_pass("GET /api/pharmacies/all - Returns array")
                    
                    # Check if we have pharmacies
                    if len(pharmacies) >= 3:
                        results.add_pass("GET /api/pharmacies/all - Has expected pharmacy count")
                        
                        # Verify response structure
                        pharmacy = pharmacies[0]
                        required_fields = ["id", "pharmacy_name", "location", "license_number", "inventory_count", "phone", "email"]
                        missing_fields = [field for field in required_fields if field not in pharmacy]
                        
                        if not missing_fields:
                            results.add_pass("GET /api/pharmacies/all - Response structure correct")
                        else:
                            results.add_fail("GET /api/pharmacies/all - Response structure", 
                                           f"Missing fields: {missing_fields}")
                    else:
                        results.add_fail("GET /api/pharmacies/all - Pharmacy count", 
                                       f"Expected at least 3 pharmacies, got {len(pharmacies)}")
                else:
                    results.add_fail("GET /api/pharmacies/all - Response type", 
                                   f"Expected array, got {type(pharmacies)}")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/pharmacies/all", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/pharmacies/all", str(e))
        
        # Test 3b: Filter pharmacies by location (Accra)
        try:
            response = make_request("GET", "/pharmacies/all", params={"location": "Accra"})
            if response and response.status_code == 200:
                pharmacies = response.json()
                if isinstance(pharmacies, list):
                    # Check if filtered results contain Accra
                    accra_pharmacies = [p for p in pharmacies if "accra" in p.get("location", "").lower()]
                    if len(accra_pharmacies) > 0:
                        results.add_pass("GET /api/pharmacies/all?location=Accra - Location filter works")
                    else:
                        results.add_fail("GET /api/pharmacies/all?location=Accra - Location filter", 
                                       "No Accra pharmacies found in filtered results")
                else:
                    results.add_fail("GET /api/pharmacies/all?location=Accra - Response type", 
                                   f"Expected array, got {type(pharmacies)}")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/pharmacies/all?location=Accra", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/pharmacies/all?location=Accra", str(e))
        
        # Test 3c: Filter with non-existent location
        try:
            response = make_request("GET", "/pharmacies/all", params={"location": "NonExistentCity"})
            if response and response.status_code == 200:
                pharmacies = response.json()
                if isinstance(pharmacies, list) and len(pharmacies) == 0:
                    results.add_pass("GET /api/pharmacies/all?location=NonExistentCity - Empty results handled")
                else:
                    results.add_fail("GET /api/pharmacies/all?location=NonExistentCity - Empty results", 
                                   f"Expected empty array, got {len(pharmacies)} results")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/pharmacies/all?location=NonExistentCity", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/pharmacies/all?location=NonExistentCity", str(e))
        
        # 4. Test Ambulance Listing API
        print("\n🚑 Testing Ambulance Listing API...")
        
        # Test 4a: Get all ambulances
        try:
            response = make_request("GET", "/ambulances/all")
            if response and response.status_code == 200:
                ambulances = response.json()
                if isinstance(ambulances, list):
                    results.add_pass("GET /api/ambulances/all - Returns array")
                    
                    # Check if we have ambulances
                    if len(ambulances) >= 3:
                        results.add_pass("GET /api/ambulances/all - Has expected ambulance count")
                        
                        # Verify response structure
                        ambulance = ambulances[0]
                        required_fields = ["id", "service_name", "location", "vehicle_type", "service_areas", "availability_status", "phone", "email"]
                        missing_fields = [field for field in required_fields if field not in ambulance]
                        
                        if not missing_fields:
                            results.add_pass("GET /api/ambulances/all - Response structure correct")
                        else:
                            results.add_fail("GET /api/ambulances/all - Response structure", 
                                           f"Missing fields: {missing_fields}")
                    else:
                        results.add_fail("GET /api/ambulances/all - Ambulance count", 
                                       f"Expected at least 3 ambulances, got {len(ambulances)}")
                else:
                    results.add_fail("GET /api/ambulances/all - Response type", 
                                   f"Expected array, got {type(ambulances)}")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/ambulances/all", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/ambulances/all", str(e))
        
        # Test 4b: Filter ambulances by location (Kumasi)
        try:
            response = make_request("GET", "/ambulances/all", params={"location": "Kumasi"})
            if response and response.status_code == 200:
                ambulances = response.json()
                if isinstance(ambulances, list):
                    # Check if filtered results contain Kumasi
                    kumasi_ambulances = [a for a in ambulances if "kumasi" in a.get("location", "").lower()]
                    if len(kumasi_ambulances) > 0:
                        results.add_pass("GET /api/ambulances/all?location=Kumasi - Location filter works")
                    else:
                        results.add_fail("GET /api/ambulances/all?location=Kumasi - Location filter", 
                                       "No Kumasi ambulances found in filtered results")
                else:
                    results.add_fail("GET /api/ambulances/all?location=Kumasi - Response type", 
                                   f"Expected array, got {type(ambulances)}")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/ambulances/all?location=Kumasi", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/ambulances/all?location=Kumasi", str(e))
        
        # Test 4c: Filter with non-existent location
        try:
            response = make_request("GET", "/ambulances/all", params={"location": "NonExistentCity"})
            if response and response.status_code == 200:
                ambulances = response.json()
                if isinstance(ambulances, list) and len(ambulances) == 0:
                    results.add_pass("GET /api/ambulances/all?location=NonExistentCity - Empty results handled")
                else:
                    results.add_fail("GET /api/ambulances/all?location=NonExistentCity - Empty results", 
                                   f"Expected empty array, got {len(ambulances)} results")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/ambulances/all?location=NonExistentCity", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/ambulances/all?location=NonExistentCity", str(e))
        
        # 5. Test endpoints without authentication (should work for public listing)
        print("\n🔓 Testing endpoints without authentication...")
        
        try:
            response = make_request("GET", "/pharmacies/all")
            if response and response.status_code == 200:
                results.add_pass("GET /api/pharmacies/all - Works without authentication")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/pharmacies/all - No auth", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/pharmacies/all - No auth", str(e))
        
        try:
            response = make_request("GET", "/ambulances/all")
            if response and response.status_code == 200:
                results.add_pass("GET /api/ambulances/all - Works without authentication")
            else:
                error_msg = response.text if response else "No response"
                results.add_fail("GET /api/ambulances/all - No auth", 
                               f"Status {response.status_code if response else 'None'}: {error_msg}")
        except Exception as e:
            results.add_fail("GET /api/ambulances/all - No auth", str(e))
        
    except Exception as e:
        results.add_fail("Overall test execution", str(e))
    
    return results.summary()

def run_all_tests():
    """Run all backend API tests"""
    print("=" * 60)
    print("🏥 GLENX MEDHUB BACKEND API TESTING")
    print("=" * 60)
    
    # Run pharmacy and ambulance listing tests
    success = test_pharmacy_ambulance_listing()
    
    return success

if __name__ == "__main__":
    success = run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(0 if success else 1)