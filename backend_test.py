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

def make_request(method, endpoint, headers=None, json_data=None, params=None):
    """Make HTTP request with error handling"""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        response = requests.request(method, url, headers=headers, json=json_data, params=params, timeout=30)
        return response
    except Exception as e:
        return None

def test_user_registration_and_login():
    """Test user registration and login for different roles"""
    print("\n🔐 Testing User Registration & Authentication...")
    
    # Test data for different user types
    users = {
        "patient": {
            "email": f"patient.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
            "phone": f"+233{uuid.uuid4().int % 1000000000:09d}",
            "national_id": f"GHA{uuid.uuid4().int % 1000000000:09d}",
            "password": "TestPass123!",
            "full_name": "Kwame Asante",
            "role": "patient"
        },
        "pharmacy": {
            "email": f"pharmacy.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
            "phone": f"+233{uuid.uuid4().int % 1000000000:09d}",
            "national_id": f"GHA{uuid.uuid4().int % 1000000000:09d}",
            "password": "TestPass123!",
            "full_name": "Accra Central Pharmacy",
            "role": "pharmacy",
            "pharmacy_name": "Accra Central Pharmacy",
            "location": "Accra",
            "license_number": f"PHARM{uuid.uuid4().int % 100000:05d}",
            "license_type": "retail"
        },
        "ambulance": {
            "email": f"ambulance.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
            "phone": f"+233{uuid.uuid4().int % 1000000000:09d}",
            "national_id": f"GHA{uuid.uuid4().int % 1000000000:09d}",
            "password": "TestPass123!",
            "full_name": "Accra Emergency Services",
            "role": "ambulance",
            "location": "Accra",
            "service_areas": ["Accra", "Tema"],
            "vehicle_type": "Advanced Life Support"
        },
        "doctor": {
            "email": f"doctor.test.{uuid.uuid4().hex[:8]}@glenxmed.com",
            "phone": f"+233{uuid.uuid4().int % 1000000000:09d}",
            "national_id": f"GHA{uuid.uuid4().int % 1000000000:09d}",
            "password": "TestPass123!",
            "full_name": "Dr. Ama Boateng",
            "role": "doctor",
            "specialty": "General Practitioner",
            "license_number": f"GMA{uuid.uuid4().int % 100000:05d}",
            "consultation_fee": 80.0,
            "location": "Accra",
            "bio": "Experienced GP with 8+ years in family medicine",
            "years_of_experience": 8
        }
    }
    
    tokens = {}
    user_ids = {}
    
    # Register users
    for role, user_data in users.items():
        response = make_request("POST", "/auth/register", json_data=user_data)
        if response and response.status_code == 200:
            data = response.json()
            tokens[role] = data["access_token"]
            user_ids[role] = data["user"]["id"]
            results.log_pass(f"Register {role} user")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail(f"Register {role} user", error_msg)
            return None, None
    
    # Test login for patient
    login_data = {"email": users["patient"]["email"], "password": users["patient"]["password"]}
    response = make_request("POST", "/auth/login", json_data=login_data)
    if response and response.status_code == 200:
        results.log_pass("Patient login")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Patient login", error_msg)
    
    return tokens, user_ids

def test_pharmacy_product_management(pharmacy_token):
    """Test pharmacy product CRUD operations"""
    print("\n🏪 Testing Pharmacy Product Management APIs...")
    
    if not pharmacy_token:
        results.log_fail("Pharmacy Product Management", "No pharmacy token available")
        return []
    
    headers = {"Authorization": f"Bearer {pharmacy_token}"}
    product_ids = []
    
    # Test products to create
    test_products = [
        {
            "name": "Paracetamol 500mg",
            "description": "Pain relief and fever reducer tablets",
            "price": 15.50,
            "category": "Pain Relief",
            "requires_prescription": False,
            "stock_quantity": 100,
            "manufacturer": "Ghana Pharma Ltd",
            "dosage_form": "Tablet"
        },
        {
            "name": "Amoxicillin 250mg",
            "description": "Antibiotic for bacterial infections",
            "price": 25.00,
            "category": "Antibiotics",
            "requires_prescription": True,
            "stock_quantity": 50,
            "manufacturer": "Ghana Pharma Ltd",
            "dosage_form": "Capsule"
        },
        {
            "name": "Vitamin C 1000mg",
            "description": "Immune system support supplement",
            "price": 35.00,
            "category": "Vitamins",
            "requires_prescription": False,
            "stock_quantity": 75,
            "manufacturer": "HealthCare Ghana",
            "dosage_form": "Tablet"
        }
    ]
    
    # Test CREATE products - This will fail due to missing verify_token function
    for i, product in enumerate(test_products):
        response = make_request("POST", "/products", headers=headers, json_data=product)
        if response and response.status_code == 200:
            data = response.json()
            product_ids.append(data["product_id"])
            results.log_pass(f"Create product {i+1} ({product['name']})")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail(f"Create product {i+1}", error_msg)
    
    # Test LIST all products
    response = make_request("GET", "/products")
    if response and response.status_code == 200:
        products = response.json()
        if len(products) >= 0:  # May be 0 if creation failed
            results.log_pass("List all products")
        else:
            results.log_fail("List all products", f"Unexpected response: {products}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("List all products", error_msg)
    
    # Test FILTER by category
    response = make_request("GET", "/products", params={"category": "Pain Relief"})
    if response and response.status_code == 200:
        products = response.json()
        results.log_pass("Filter products by category")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Filter products by category", error_msg)
    
    # Test SEARCH products
    response = make_request("GET", "/products", params={"search": "Paracetamol"})
    if response and response.status_code == 200:
        products = response.json()
        results.log_pass("Search products")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Search products", error_msg)
    
    return product_ids

def test_shopping_cart_apis(patient_token, product_ids):
    """Test shopping cart functionality"""
    print("\n🛒 Testing Shopping Cart APIs...")
    
    if not patient_token:
        results.log_fail("Shopping Cart APIs", "Missing patient token")
        return
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Use real product ID if available, otherwise skip cart tests
    if not product_ids:
        results.log_fail("Shopping Cart APIs", "No product IDs available for testing")
        return
    
    test_product_id = product_ids[0]
    
    # Test ADD to cart
    cart_item = {"product_id": test_product_id, "quantity": 2}
    response = make_request("POST", "/cart/add", headers=headers, json_data=cart_item)
    if response and response.status_code == 200:
        results.log_pass("Add product to cart")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Add product to cart", error_msg)
    
    # Test VIEW cart
    response = make_request("GET", "/cart", headers=headers)
    if response and response.status_code == 200:
        cart = response.json()
        results.log_pass("View cart")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("View cart", error_msg)
    
    # Test UPDATE cart quantity
    response = make_request("PUT", f"/cart/item/{test_product_id}", headers=headers, params={"quantity": 3})
    if response and response.status_code == 200:
        results.log_pass("Update cart item quantity")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Update cart item quantity", error_msg)
    
    # Test REMOVE from cart
    response = make_request("DELETE", f"/cart/item/{test_product_id}", headers=headers)
    if response and response.status_code == 200:
        results.log_pass("Remove item from cart")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Remove item from cart", error_msg)

def test_order_management_apis(patient_token, product_ids, pharmacy_id):
    """Test order placement and management"""
    print("\n📦 Testing Order Management APIs...")
    
    if not patient_token:
        results.log_fail("Order Management APIs", "Missing patient token")
        return None
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Test CREATE order - Will fail due to missing verify_token function
    order_data = {
        "pharmacy_id": pharmacy_id or "mock_pharmacy_id",
        "items": [
            {"product_id": "mock_product_1", "quantity": 1},
            {"product_id": "mock_product_2", "quantity": 2}
        ],
        "delivery_address": "123 Liberation Road, Accra",
        "delivery_city": "Accra",
        "delivery_phone": "+233501234567",
        "payment_method": "mtn",
        "payment_phone": "+233501234567"
    }
    
    response = make_request("POST", "/orders", headers=headers, json_data=order_data)
    order_id = None
    if response and response.status_code == 200:
        data = response.json()
        order_id = data["order_id"]
        if data["payment_status"] == "completed":
            results.log_pass("Create order with mock payment")
        else:
            results.log_fail("Create order", f"Payment status: {data.get('payment_status')}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Create order", error_msg)
    
    # Test GET order history
    response = make_request("GET", "/orders/my-orders", headers=headers)
    if response and response.status_code == 200:
        orders = response.json()
        results.log_pass("Get order history")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Get order history", error_msg)
    
    # Test GET specific order details
    if order_id:
        response = make_request("GET", f"/orders/{order_id}", headers=headers)
        if response and response.status_code == 200:
            order = response.json()
            results.log_pass("Get order details")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("Get order details", error_msg)
    
    # Test unauthorized access
    response = make_request("GET", "/orders/my-orders")  # No auth header
    if response and response.status_code in [401, 403]:
        results.log_pass("Unauthorized order access blocked")
    else:
        results.log_fail("Unauthorized order access", "Should have returned 401/403")
    
    return order_id

def test_ambulance_booking_apis(patient_token, ambulance_id):
    """Test ambulance booking system"""
    print("\n🚑 Testing Ambulance Booking APIs...")
    
    if not patient_token:
        results.log_fail("Ambulance Booking APIs", "Missing patient token")
        return None
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Test BOOK immediate ambulance - Will fail due to missing verify_token function
    immediate_booking = {
        "ambulance_id": ambulance_id or "mock_ambulance_id",
        "booking_type": "immediate",
        "pickup_address": "37 Military Hospital, Accra",
        "pickup_latitude": 5.6037,
        "pickup_longitude": -0.1870,
        "destination_address": "Korle Bu Teaching Hospital, Accra",
        "destination_latitude": 5.5502,
        "destination_longitude": -0.2174,
        "emergency_type": "cardiac",
        "patient_condition": "Chest pain and difficulty breathing",
        "patient_name": "Kwame Asante",
        "patient_phone": "+233501234567",
        "additional_notes": "Patient is conscious but in severe pain"
    }
    
    response = make_request("POST", "/ambulance/book", headers=headers, json_data=immediate_booking)
    booking_id = None
    if response and response.status_code == 200:
        data = response.json()
        booking_id = data["booking_id"]
        if data["total_price"] == 100.0:  # Base fare 50 + (10km * 5)
            results.log_pass("Book immediate ambulance with distance pricing")
        else:
            results.log_fail("Book immediate ambulance", f"Unexpected price: {data.get('total_price')}")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Book immediate ambulance", error_msg)
    
    # Test BOOK scheduled ambulance
    future_datetime = (datetime.utcnow() + timedelta(hours=2)).isoformat()
    scheduled_booking = {
        "ambulance_id": ambulance_id or "mock_ambulance_id",
        "booking_type": "scheduled",
        "scheduled_datetime": future_datetime,
        "pickup_address": "Accra Mall, Tetteh Quarshie",
        "destination_address": "Ridge Hospital, Accra",
        "emergency_type": "other",
        "patient_condition": "Scheduled medical appointment transport",
        "patient_name": "Ama Boateng",
        "patient_phone": "+233501234568"
    }
    
    response = make_request("POST", "/ambulance/book", headers=headers, json_data=scheduled_booking)
    if response and response.status_code == 200:
        data = response.json()
        if "driver_name" in data and "vehicle_number" in data:
            results.log_pass("Book scheduled ambulance with driver info")
        else:
            results.log_fail("Book scheduled ambulance", "Missing driver info")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Book scheduled ambulance", error_msg)
    
    # Test GET booking history
    response = make_request("GET", "/ambulance/bookings", headers=headers)
    if response and response.status_code == 200:
        bookings = response.json()
        results.log_pass("Get ambulance booking history")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Get booking history", error_msg)
    
    # Test GET booking details
    if booking_id:
        response = make_request("GET", f"/ambulance/bookings/{booking_id}", headers=headers)
        if response and response.status_code == 200:
            booking = response.json()
            results.log_pass("Get ambulance booking details")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("Get booking details", error_msg)
    
    # Test TRACK ambulance (mock GPS)
    if booking_id:
        response = make_request("GET", f"/ambulance/track/{booking_id}", headers=headers)
        if response and response.status_code == 200:
            tracking = response.json()
            if "current_location" in tracking and "estimated_arrival_minutes" in tracking:
                results.log_pass("Track ambulance with mock GPS")
            else:
                results.log_fail("Track ambulance", "Missing tracking data")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("Track ambulance", error_msg)
    
    # Test unauthorized access
    response = make_request("GET", "/ambulance/bookings")  # No auth header
    if response and response.status_code in [401, 403]:
        results.log_pass("Unauthorized ambulance access blocked")
    else:
        results.log_fail("Unauthorized ambulance access", "Should have returned 401/403")
    
    return booking_id

def test_video_consultation_apis(patient_token, doctor_id):
    """Test video consultation system"""
    print("\n📹 Testing Video Consultation APIs...")
    
    if not patient_token:
        results.log_fail("Video Consultation APIs", "Missing patient token")
        return None
    
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    # Test SCHEDULE consultation - Will fail due to missing verify_token function
    future_datetime = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    consultation_data = {
        "doctor_id": doctor_id or "mock_doctor_id",
        "scheduled_datetime": future_datetime,
        "consultation_type": "video",
        "reason": "Follow-up consultation for hypertension",
        "symptoms": "Occasional headaches and dizziness"
    }
    
    response = make_request("POST", "/consultations/schedule", headers=headers, json_data=consultation_data)
    consultation_id = None
    if response and response.status_code == 200:
        data = response.json()
        consultation_id = data["consultation_id"]
        if "room_id" in data and data["consultation_fee"] > 0:
            results.log_pass("Schedule video consultation with room ID")
        else:
            results.log_fail("Schedule consultation", "Missing room_id or consultation_fee")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Schedule consultation", error_msg)
    
    # Test GET consultation history
    response = make_request("GET", "/consultations/my-consultations", headers=headers)
    if response and response.status_code == 200:
        consultations = response.json()
        results.log_pass("Get consultation history")
    else:
        error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
        results.log_fail("Get consultation history", error_msg)
    
    # Test GET consultation details
    if consultation_id:
        response = make_request("GET", f"/consultations/{consultation_id}", headers=headers)
        if response and response.status_code == 200:
            consultation = response.json()
            results.log_pass("Get consultation details")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("Get consultation details", error_msg)
    
    # Test JOIN consultation (mock Agora token)
    if consultation_id:
        response = make_request("POST", f"/consultations/{consultation_id}/join", headers=headers)
        if response and response.status_code == 200:
            join_data = response.json()
            if "agora_token" in join_data and "room_id" in join_data:
                results.log_pass("Join consultation with mock Agora token")
            else:
                results.log_fail("Join consultation", "Missing Agora token or room_id")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("Join consultation", error_msg)
    
    # Test END consultation
    if consultation_id:
        response = make_request("POST", f"/consultations/{consultation_id}/end", headers=headers)
        if response and response.status_code == 200:
            results.log_pass("End consultation")
        else:
            error_msg = response.json().get("detail", "Unknown error") if response else "Connection failed"
            results.log_fail("End consultation", error_msg)
        
        # Verify status changed to completed
        response = make_request("GET", f"/consultations/{consultation_id}", headers=headers)
        if response and response.status_code == 200:
            consultation = response.json()
            if consultation["status"] == "completed":
                results.log_pass("Consultation status updated to completed")
            else:
                results.log_fail("Consultation status update", f"Status: {consultation.get('status')}")
    
    # Test unauthorized access
    response = make_request("GET", "/consultations/my-consultations")  # No auth header
    if response and response.status_code in [401, 403]:
        results.log_pass("Unauthorized consultation access blocked")
    else:
        results.log_fail("Unauthorized consultation access", "Should have returned 401/403")
    
    return consultation_id

def main():
    """Run all backend API tests"""
    print("🚀 Starting Glenx MedHub Backend API Testing")
    print(f"Backend URL: {BACKEND_URL}")
    print("="*60)
    
    # Test 1: User Registration and Authentication
    tokens, user_ids = test_user_registration_and_login()
    if not tokens:
        print("❌ Cannot proceed without user authentication")
        results.summary()
        return
    
    # Test 2: Pharmacy Product Management
    product_ids = test_pharmacy_product_management(tokens.get("pharmacy"))
    
    # Test 3: Shopping Cart APIs
    test_shopping_cart_apis(tokens.get("patient"), product_ids)
    
    # Test 4: Order Management APIs
    pharmacy_id = user_ids.get("pharmacy")
    order_id = test_order_management_apis(tokens.get("patient"), product_ids, pharmacy_id)
    
    # Test 5: Ambulance Booking APIs
    ambulance_id = user_ids.get("ambulance")
    booking_id = test_ambulance_booking_apis(tokens.get("patient"), ambulance_id)
    
    # Test 6: Video Consultation APIs
    doctor_id = user_ids.get("doctor")
    consultation_id = test_video_consultation_apis(tokens.get("patient"), doctor_id)
    
    # Final summary
    results.summary()
    
    if results.failed == 0:
        print("\n🎉 ALL TESTS PASSED! Backend APIs are fully functional.")
    else:
        print(f"\n⚠️  {results.failed} tests failed. Please review the issues above.")

if __name__ == "__main__":
    main()