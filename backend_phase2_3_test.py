#!/usr/bin/env python3
"""
Backend API Testing for Glenx MedHub Phase 2 & 3
Tests multi-role registration, AI diagnostics, and community forum features
"""

import requests
import json
import os
from datetime import datetime, timedelta
import uuid

# Get backend URL from frontend .env
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "https://telehealth-ghana.preview.emergentagent.com"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def log_success(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def log_failure(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n=== TEST SUMMARY ===")
        print(f"Total Tests: {total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        if self.errors:
            print(f"\nErrors:")
            for error in self.errors:
                print(f"  - {error}")
        return self.failed == 0

def test_multi_role_registration():
    """Test multi-role registration for all user types"""
    results = TestResults()
    
    # Test data for different roles
    test_users = [
        {
            "role": "doctor",
            "data": {
                "email": f"doctor.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
                "phone": "+233244123456",
                "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
                "password": "SecurePass123!",
                "full_name": "Dr. Kwame Test",
                "role": "doctor",
                "specialty": "Cardiology",
                "license_number": f"GMA{uuid.uuid4().hex[:8].upper()}",
                "consultation_fee": 150.0,
                "location": "Accra Medical Center",
                "bio": "Experienced cardiologist with 15 years of practice",
                "years_of_experience": 15
            }
        },
        {
            "role": "hospital",
            "data": {
                "email": f"hospital.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
                "phone": "+233244123457",
                "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
                "password": "SecurePass123!",
                "full_name": "Korle Bu Teaching Hospital",
                "role": "hospital",
                "hospital_name": "Korle Bu Teaching Hospital",
                "services": ["Emergency Care", "Surgery", "Pediatrics", "Cardiology"],
                "operating_hours": "24/7",
                "location": "Korle Bu, Accra"
            }
        },
        {
            "role": "pharmacy",
            "data": {
                "email": f"pharmacy.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
                "phone": "+233244123458",
                "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
                "password": "SecurePass123!",
                "full_name": "Medplus Pharmacy Ltd",
                "role": "pharmacy",
                "pharmacy_name": "Medplus Pharmacy",
                "license_number": f"PHA{uuid.uuid4().hex[:8].upper()}",
                "license_type": "retail",
                "location": "East Legon, Accra"
            }
        },
        {
            "role": "ambulance",
            "data": {
                "email": f"ambulance.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
                "phone": "+233244123459",
                "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
                "password": "SecurePass123!",
                "full_name": "Emergency Response Services",
                "role": "ambulance",
                "service_areas": ["Greater Accra", "Eastern Region"],
                "vehicle_type": "Advanced Life Support",
                "location": "Accra Central"
            }
        },
        {
            "role": "herbalist",
            "data": {
                "email": f"herbalist.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
                "phone": "+233244123460",
                "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
                "password": "SecurePass123!",
                "full_name": "Nana Akoto Traditional Healer",
                "role": "herbalist",
                "practice_years": 25,
                "specializations": ["Digestive Health", "Respiratory Issues", "Skin Conditions"],
                "location": "Kumasi Traditional Medicine Center",
                "bio": "Traditional healer with 25 years of experience in herbal medicine"
            }
        }
    ]
    
    registered_users = {}
    
    for user_info in test_users:
        role = user_info["role"]
        data = user_info["data"]
        
        try:
            response = requests.post(f"{API_URL}/auth/register", json=data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if "access_token" in response_data and "user" in response_data:
                    registered_users[role] = {
                        "token": response_data["access_token"],
                        "user": response_data["user"]
                    }
                    results.log_success(f"Register {role} with role-specific data")
                else:
                    results.log_failure(f"Register {role}", "Missing access_token or user in response")
            else:
                results.log_failure(f"Register {role}", f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            results.log_failure(f"Register {role}", f"Request failed: {str(e)}")
    
    return results, registered_users

def test_patient_registration_and_login():
    """Test patient registration and login for AI diagnostics and forum testing"""
    results = TestResults()
    
    # Register a patient
    patient_data = {
        "email": f"patient.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
        "phone": "+233244987654",
        "national_id": f"GHA{uuid.uuid4().hex[:9].upper()}",
        "password": "PatientPass123!",
        "full_name": "Akosua Test Patient",
        "role": "patient"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/register", json=patient_data, timeout=30)
        
        if response.status_code == 200:
            response_data = response.json()
            if "access_token" in response_data:
                patient_token = response_data["access_token"]
                patient_user = response_data["user"]
                results.log_success("Register patient for testing")
                
                # Test login
                login_data = {
                    "email": patient_data["email"],
                    "password": patient_data["password"]
                }
                
                login_response = requests.post(f"{API_URL}/auth/login", json=login_data, timeout=30)
                if login_response.status_code == 200:
                    results.log_success("Patient login")
                    return results, patient_token, patient_user
                else:
                    results.log_failure("Patient login", f"HTTP {login_response.status_code}")
                    return results, patient_token, patient_user
            else:
                results.log_failure("Register patient", "Missing access_token in response")
        else:
            results.log_failure("Register patient", f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        results.log_failure("Register patient", f"Request failed: {str(e)}")
    
    return results, None, None

def test_ai_diagnostics(patient_token):
    """Test AI diagnostics chat functionality"""
    results = TestResults()
    
    if not patient_token:
        results.log_failure("AI Diagnostics", "No patient token available")
        return results
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Test initial symptom message
    try:
        message_data = {
            "message": "I have been experiencing persistent headaches for the past 3 days, along with mild fever and fatigue. The headache is mostly on the right side of my head and gets worse in bright light."
        }
        
        response = requests.post(f"{API_URL}/diagnostics/chat", json=message_data, headers=headers, timeout=60)
        
        if response.status_code == 200:
            response_data = response.json()
            if "response" in response_data and "session_id" in response_data:
                session_id = response_data["session_id"]
                ai_response = response_data["response"]
                results.log_success("AI diagnostics initial chat")
                
                # Test follow-up message with session_id
                followup_data = {
                    "message": "The headache started after I had been working long hours on my computer. Could this be related to eye strain?",
                    "session_id": session_id
                }
                
                followup_response = requests.post(f"{API_URL}/diagnostics/chat", json=followup_data, headers=headers, timeout=60)
                
                if followup_response.status_code == 200:
                    followup_response_data = followup_response.json()
                    if followup_response_data.get("session_id") == session_id:
                        results.log_success("AI diagnostics follow-up with session_id")
                    else:
                        results.log_failure("AI diagnostics follow-up", "Session ID mismatch")
                else:
                    results.log_failure("AI diagnostics follow-up", f"HTTP {followup_response.status_code}")
                
                # Test diagnostic history
                history_response = requests.get(f"{API_URL}/diagnostics/history", headers=headers, timeout=30)
                
                if history_response.status_code == 200:
                    history_data = history_response.json()
                    if isinstance(history_data, list) and len(history_data) > 0:
                        results.log_success("Get diagnostic history")
                    else:
                        results.log_failure("Get diagnostic history", "Empty or invalid history response")
                else:
                    results.log_failure("Get diagnostic history", f"HTTP {history_response.status_code}")
                    
            else:
                results.log_failure("AI diagnostics initial chat", "Missing response or session_id")
        else:
            results.log_failure("AI diagnostics initial chat", f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        results.log_failure("AI diagnostics", f"Request failed: {str(e)}")
    
    return results

def test_community_forum(patient_token, patient_user):
    """Test community forum functionality"""
    results = TestResults()
    
    if not patient_token:
        results.log_failure("Community Forum", "No patient token available")
        return results
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Test create forum post
    try:
        post_data = {
            "title": "Malaria Prevention Tips for Rainy Season",
            "content": "With the rainy season approaching, I wanted to share some effective malaria prevention strategies that have worked for my family. What methods do you use to protect against mosquito bites?",
            "tags": ["malaria", "prevention", "health-tips", "rainy-season"]
        }
        
        response = requests.post(f"{API_URL}/forum/posts", json=post_data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            response_data = response.json()
            if "id" in response_data:
                post_id = response_data["id"]
                results.log_success("Create forum post with tags")
                
                # Test list all forum posts
                list_response = requests.get(f"{API_URL}/forum/posts", timeout=30)
                
                if list_response.status_code == 200:
                    posts_data = list_response.json()
                    if isinstance(posts_data, list) and len(posts_data) > 0:
                        results.log_success("List all forum posts")
                    else:
                        results.log_failure("List forum posts", "Empty or invalid posts response")
                else:
                    results.log_failure("List forum posts", f"HTTP {list_response.status_code}")
                
                # Test get specific post details
                detail_response = requests.get(f"{API_URL}/forum/posts/{post_id}", timeout=30)
                
                if detail_response.status_code == 200:
                    detail_data = detail_response.json()
                    if "id" in detail_data and "replies" in detail_data:
                        results.log_success("Get specific post details")
                    else:
                        results.log_failure("Get post details", "Missing id or replies in response")
                else:
                    results.log_failure("Get post details", f"HTTP {detail_response.status_code}")
                
                # Test reply to post
                reply_data = {
                    "content": "Great topic! I use bed nets treated with insecticide and make sure to eliminate standing water around my home. Also, wearing long sleeves during peak mosquito hours helps a lot."
                }
                
                reply_response = requests.post(f"{API_URL}/forum/posts/{post_id}/replies", json=reply_data, headers=headers, timeout=30)
                
                if reply_response.status_code == 200:
                    reply_response_data = reply_response.json()
                    if "id" in reply_response_data:
                        results.log_success("Reply to forum post")
                    else:
                        results.log_failure("Reply to post", "Missing id in reply response")
                else:
                    results.log_failure("Reply to post", f"HTTP {reply_response.status_code}")
                
                # Test like post
                like_response = requests.post(f"{API_URL}/forum/posts/{post_id}/like", headers=headers, timeout=30)
                
                if like_response.status_code == 200:
                    like_data = like_response.json()
                    if "message" in like_data:
                        results.log_success("Like forum post")
                    else:
                        results.log_failure("Like post", "Missing message in like response")
                else:
                    results.log_failure("Like post", f"HTTP {like_response.status_code}")
                
                # Test forum search and filtering
                search_response = requests.get(f"{API_URL}/forum/posts?search=malaria", timeout=30)
                
                if search_response.status_code == 200:
                    search_data = search_response.json()
                    if isinstance(search_data, list):
                        results.log_success("Forum search functionality")
                    else:
                        results.log_failure("Forum search", "Invalid search response")
                else:
                    results.log_failure("Forum search", f"HTTP {search_response.status_code}")
                
                # Test tag filtering
                tag_response = requests.get(f"{API_URL}/forum/posts?tag=prevention", timeout=30)
                
                if tag_response.status_code == 200:
                    tag_data = tag_response.json()
                    if isinstance(tag_data, list):
                        results.log_success("Forum tag filtering")
                    else:
                        results.log_failure("Forum tag filtering", "Invalid tag filter response")
                else:
                    results.log_failure("Forum tag filtering", f"HTTP {tag_response.status_code}")
                    
            else:
                results.log_failure("Create forum post", "Missing id in response")
        else:
            results.log_failure("Create forum post", f"HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        results.log_failure("Community forum", f"Request failed: {str(e)}")
    
    return results

def main():
    """Run all Phase 2 & 3 backend tests"""
    print("=== GLENX MEDHUB PHASE 2 & 3 BACKEND API TESTING ===")
    print(f"Testing against: {API_URL}")
    print()
    
    all_results = TestResults()
    
    # Test 1: Multi-role registration
    print("1. Testing Multi-Role Registration...")
    reg_results, registered_users = test_multi_role_registration()
    all_results.passed += reg_results.passed
    all_results.failed += reg_results.failed
    all_results.errors.extend(reg_results.errors)
    print()
    
    # Test 2: Patient registration and login for subsequent tests
    print("2. Testing Patient Registration and Login...")
    patient_results, patient_token, patient_user = test_patient_registration_and_login()
    all_results.passed += patient_results.passed
    all_results.failed += patient_results.failed
    all_results.errors.extend(patient_results.errors)
    print()
    
    # Test 3: AI Diagnostics
    print("3. Testing AI Diagnostics...")
    ai_results = test_ai_diagnostics(patient_token)
    all_results.passed += ai_results.passed
    all_results.failed += ai_results.failed
    all_results.errors.extend(ai_results.errors)
    print()
    
    # Test 4: Community Forum
    print("4. Testing Community Forum...")
    forum_results = test_community_forum(patient_token, patient_user)
    all_results.passed += forum_results.passed
    all_results.failed += forum_results.failed
    all_results.errors.extend(forum_results.errors)
    print()
    
    # Final summary
    success = all_results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Phase 2 & 3 backend APIs are working correctly.")
    else:
        print(f"\n⚠️  {all_results.failed} test(s) failed. Please check the errors above.")
    
    return success

if __name__ == "__main__":
    main()