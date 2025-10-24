#!/usr/bin/env python3
"""
Backend API Edge Cases Testing for Glenx MedHub
Tests error handling and edge cases
"""

import requests
import json
from datetime import datetime, timedelta
import sys

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=')[1].strip()
    except:
        pass
    return "https://medhub-app-1.preview.emergentagent.com"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

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

def test_invalid_login():
    """Test login with invalid credentials"""
    print("\n🔑 Testing Invalid Login...")
    
    login_data = {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    }
    
    response = make_request("POST", "/auth/login", login_data)
    
    if response and response.status_code == 401:
        print("✅ Invalid login correctly rejected with 401")
        return True
    else:
        print(f"❌ Invalid login test failed - Expected 401, got {response.status_code if response else 'No response'}")
        return False

def test_unauthorized_access():
    """Test accessing protected endpoints without token"""
    print("\n🚫 Testing Unauthorized Access...")
    
    response = make_request("GET", "/auth/me")
    
    if response and response.status_code == 403:
        print("✅ Unauthorized access correctly rejected with 403")
        return True
    else:
        print(f"❌ Unauthorized access test failed - Expected 403, got {response.status_code if response else 'No response'}")
        return False

def test_invalid_doctor_id():
    """Test getting doctor with invalid ID"""
    print("\n👨‍⚕️ Testing Invalid Doctor ID...")
    
    response = make_request("GET", "/doctors/invalid_id_123")
    
    if response and response.status_code == 400:
        print("✅ Invalid doctor ID correctly rejected with 400")
        return True
    else:
        print(f"❌ Invalid doctor ID test failed - Expected 400, got {response.status_code if response else 'No response'}")
        return False

def test_duplicate_registration():
    """Test registering with existing email"""
    print("\n📧 Testing Duplicate Registration...")
    
    # Use the same test user from main test
    test_user = {
        "email": "kwame.asante@gmail.com",
        "phone": "+233244567891",  # Different phone
        "national_id": "GHA-123456789-02",  # Different ID
        "password": "SecurePass123!",
        "full_name": "Kwame Asante Jr",
        "role": "patient"
    }
    
    response = make_request("POST", "/auth/register", test_user)
    
    if response and response.status_code == 400:
        error_detail = response.json().get("detail", "")
        if "already exists" in error_detail:
            print("✅ Duplicate registration correctly rejected with 400")
            return True
    
    print(f"❌ Duplicate registration test failed - Expected 400 with 'already exists', got {response.status_code if response else 'No response'}")
    return False

def test_missing_required_fields():
    """Test registration with missing required fields"""
    print("\n📝 Testing Missing Required Fields...")
    
    incomplete_user = {
        "email": "incomplete@example.com",
        "password": "password123"
        # Missing phone, national_id, full_name
    }
    
    response = make_request("POST", "/auth/register", incomplete_user)
    
    if response and response.status_code == 422:
        print("✅ Missing required fields correctly rejected with 422")
        return True
    else:
        print(f"❌ Missing required fields test failed - Expected 422, got {response.status_code if response else 'No response'}")
        return False

def run_edge_case_tests():
    """Run all edge case tests"""
    print("=" * 60)
    print("🧪 GLENX MEDHUB BACKEND EDGE CASES TESTING")
    print("=" * 60)
    
    test_results = {}
    
    test_results["Invalid Login"] = test_invalid_login()
    test_results["Unauthorized Access"] = test_unauthorized_access()
    test_results["Invalid Doctor ID"] = test_invalid_doctor_id()
    test_results["Duplicate Registration"] = test_duplicate_registration()
    test_results["Missing Required Fields"] = test_missing_required_fields()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 EDGE CASE TEST RESULTS SUMMARY")
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
    results = run_edge_case_tests()
    
    # Exit with error code if any tests failed
    if any(not result for result in results.values()):
        sys.exit(1)
    else:
        sys.exit(0)