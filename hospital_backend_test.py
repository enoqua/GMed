#!/usr/bin/env python3
"""
Hospital Management Backend API Testing
Tests all hospital management endpoints with comprehensive scenarios
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime
from typing import Dict, Any

# Configuration
BACKEND_URL = "https://medhub-app-1.preview.emergentagent.com/api"

class HospitalAPITester:
    def __init__(self):
        self.session = None
        self.hospital_token = None
        self.hospital_user_id = None
        self.hospital_id = None
        self.created_departments = []
        self.created_beds = []
        
    async def setup_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            
    async def register_hospital_user(self) -> Dict[str, Any]:
        """Register a hospital user for testing"""
        hospital_data = {
            "email": "korle_bu_hospital@test.com",
            "phone": "+233244567890",
            "national_id": "GHA123456789",
            "password": "SecurePass123!",
            "full_name": "Korle Bu Teaching Hospital",
            "role": "hospital",
            "hospital_name": "Korle Bu Teaching Hospital",
            "location": "Accra",
            "services": ["Emergency Care", "Surgery", "Pediatrics", "Cardiology"],
            "operating_hours": "24/7"
        }
        
        async with self.session.post(f"{BACKEND_URL}/auth/register", json=hospital_data) as response:
            if response.status == 200:
                result = await response.json()
                self.hospital_token = result["access_token"]
                self.hospital_user_id = result["user"]["id"]
                print(f"✅ Hospital user registered successfully: {result['user']['full_name']}")
                return result
            else:
                error_text = await response.text()
                print(f"❌ Hospital registration failed: {response.status} - {error_text}")
                raise Exception(f"Hospital registration failed: {response.status}")
                
    async def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.hospital_token}"}
        
    async def test_dashboard_stats_initial(self) -> bool:
        """Test dashboard stats endpoint - should return zeros initially"""
        try:
            headers = await self.get_auth_headers()
            async with self.session.get(f"{BACKEND_URL}/hospital/dashboard/stats", headers=headers) as response:
                if response.status == 200:
                    stats = await response.json()
                    
                    # Validate response structure
                    required_fields = ["hospital_name", "departments", "staff", "beds", "patients", "revenue"]
                    for field in required_fields:
                        if field not in stats:
                            print(f"❌ Missing field in dashboard stats: {field}")
                            return False
                    
                    # Check beds structure
                    beds = stats["beds"]
                    bed_fields = ["total", "occupied", "available", "occupancy_rate"]
                    for field in bed_fields:
                        if field not in beds:
                            print(f"❌ Missing field in beds stats: {field}")
                            return False
                    
                    # Check patients structure
                    patients = stats["patients"]
                    patient_fields = ["active_admissions", "today_admissions"]
                    for field in patient_fields:
                        if field not in patients:
                            print(f"❌ Missing field in patients stats: {field}")
                            return False
                    
                    # Check revenue structure
                    revenue = stats["revenue"]
                    if "total" not in revenue:
                        print(f"❌ Missing total field in revenue stats")
                        return False
                    
                    print(f"✅ Dashboard stats retrieved successfully")
                    print(f"   Hospital: {stats['hospital_name']}")
                    print(f"   Departments: {stats['departments']}")
                    print(f"   Staff: {stats['staff']}")
                    print(f"   Beds: {stats['beds']['total']} total, {stats['beds']['occupied']} occupied")
                    print(f"   Patients: {stats['patients']['active_admissions']} active")
                    print(f"   Revenue: GH₵{stats['revenue']['total']}")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Dashboard stats failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Dashboard stats test error: {str(e)}")
            return False
            
    async def test_create_departments(self) -> bool:
        """Test creating hospital departments"""
        try:
            headers = await self.get_auth_headers()
            
            # Test departments with realistic Ghana hospital data
            departments = [
                {
                    "name": "Emergency Department",
                    "description": "24/7 emergency medical services and trauma care",
                    "head_doctor": "Dr. Kwame Asante",
                    "contact_phone": "+233244111001",
                    "services": ["Emergency Care", "Trauma Surgery", "Critical Care", "Ambulance Services"]
                },
                {
                    "name": "Pediatrics",
                    "description": "Comprehensive healthcare for children from birth to 18 years",
                    "head_doctor": "Dr. Ama Boateng",
                    "contact_phone": "+233244111002", 
                    "services": ["Child Healthcare", "Immunizations", "Neonatal Care", "Pediatric Surgery"]
                },
                {
                    "name": "Maternity Ward",
                    "description": "Maternal and newborn care services",
                    "head_doctor": "Dr. Akosua Mensah",
                    "contact_phone": "+233244111003",
                    "services": ["Prenatal Care", "Delivery Services", "Postnatal Care", "Family Planning"]
                }
            ]
            
            for dept_data in departments:
                async with self.session.post(f"{BACKEND_URL}/hospital/departments", 
                                           json=dept_data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.created_departments.append(result["department_id"])
                        print(f"✅ Department created: {dept_data['name']} (ID: {result['department_id']})")
                    else:
                        error_text = await response.text()
                        print(f"❌ Department creation failed for {dept_data['name']}: {response.status} - {error_text}")
                        return False
            
            return True
        except Exception as e:
            print(f"❌ Department creation test error: {str(e)}")
            return False
            
    async def test_get_departments(self) -> bool:
        """Test retrieving hospital departments"""
        try:
            headers = await self.get_auth_headers()
            async with self.session.get(f"{BACKEND_URL}/hospital/departments", headers=headers) as response:
                if response.status == 200:
                    departments = await response.json()
                    
                    if len(departments) != 3:
                        print(f"❌ Expected 3 departments, got {len(departments)}")
                        return False
                    
                    # Validate department structure
                    required_fields = ["id", "name", "description", "head_doctor", "contact_phone", "services", "staff_count", "status"]
                    for dept in departments:
                        for field in required_fields:
                            if field not in dept:
                                print(f"❌ Missing field in department: {field}")
                                return False
                    
                    print(f"✅ Retrieved {len(departments)} departments successfully")
                    for dept in departments:
                        print(f"   - {dept['name']}: {dept['description'][:50]}...")
                        print(f"     Head: {dept['head_doctor']}, Staff: {dept['staff_count']}")
                    
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Get departments failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Get departments test error: {str(e)}")
            return False
            
    async def test_create_beds(self) -> bool:
        """Test creating hospital beds"""
        try:
            headers = await self.get_auth_headers()
            
            # Test beds with different types and departments
            beds = [
                {
                    "room_number": "ER-101",
                    "bed_number": "ER-101-A",
                    "department": "Emergency Department",
                    "bed_type": "general",
                    "price_per_day": 150.0
                },
                {
                    "room_number": "ER-101", 
                    "bed_number": "ER-101-B",
                    "department": "Emergency Department",
                    "bed_type": "general",
                    "price_per_day": 150.0
                },
                {
                    "room_number": "ICU-201",
                    "bed_number": "ICU-201-A",
                    "department": "Emergency Department",
                    "bed_type": "icu",
                    "price_per_day": 500.0
                },
                {
                    "room_number": "PED-301",
                    "bed_number": "PED-301-A",
                    "department": "Pediatrics",
                    "bed_type": "general",
                    "price_per_day": 120.0
                },
                {
                    "room_number": "PED-301",
                    "bed_number": "PED-301-B", 
                    "department": "Pediatrics",
                    "bed_type": "general",
                    "price_per_day": 120.0
                },
                {
                    "room_number": "MAT-401",
                    "bed_number": "MAT-401-A",
                    "department": "Maternity Ward",
                    "bed_type": "maternity",
                    "price_per_day": 200.0
                },
                {
                    "room_number": "MAT-401",
                    "bed_number": "MAT-401-B",
                    "department": "Maternity Ward", 
                    "bed_type": "maternity",
                    "price_per_day": 200.0
                },
                {
                    "room_number": "VIP-501",
                    "bed_number": "VIP-501-A",
                    "department": "Emergency Department",
                    "bed_type": "vip",
                    "price_per_day": 800.0
                }
            ]
            
            for bed_data in beds:
                async with self.session.post(f"{BACKEND_URL}/hospital/beds",
                                           json=bed_data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.created_beds.append(result["bed_id"])
                        print(f"✅ Bed created: {bed_data['bed_number']} ({bed_data['bed_type']}) - GH₵{bed_data['price_per_day']}/day")
                    else:
                        error_text = await response.text()
                        print(f"❌ Bed creation failed for {bed_data['bed_number']}: {response.status} - {error_text}")
                        return False
            
            return True
        except Exception as e:
            print(f"❌ Bed creation test error: {str(e)}")
            return False
            
    async def test_get_beds(self) -> bool:
        """Test retrieving hospital beds"""
        try:
            headers = await self.get_auth_headers()
            
            # Test getting all beds
            async with self.session.get(f"{BACKEND_URL}/hospital/beds", headers=headers) as response:
                if response.status == 200:
                    beds = await response.json()
                    
                    if len(beds) != 8:
                        print(f"❌ Expected 8 beds, got {len(beds)}")
                        return False
                    
                    # Validate bed structure
                    required_fields = ["id", "room_number", "bed_number", "department", "bed_type", "price_per_day", "status", "current_patient_id"]
                    for bed in beds:
                        for field in required_fields:
                            if field not in bed:
                                print(f"❌ Missing field in bed: {field}")
                                return False
                    
                    print(f"✅ Retrieved {len(beds)} beds successfully")
                    
                    # Group beds by department for display
                    dept_beds = {}
                    for bed in beds:
                        dept = bed["department"]
                        if dept not in dept_beds:
                            dept_beds[dept] = []
                        dept_beds[dept].append(bed)
                    
                    for dept, dept_bed_list in dept_beds.items():
                        print(f"   {dept}: {len(dept_bed_list)} beds")
                        for bed in dept_bed_list:
                            print(f"     - {bed['bed_number']} ({bed['bed_type']}) - GH₵{bed['price_per_day']}/day [{bed['status']}]")
                    
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Get beds failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Get beds test error: {str(e)}")
            return False
            
    async def test_beds_filtering(self) -> bool:
        """Test bed filtering by status and department"""
        try:
            headers = await self.get_auth_headers()
            
            # Test filter by department
            async with self.session.get(f"{BACKEND_URL}/hospital/beds?department=Pediatrics", headers=headers) as response:
                if response.status == 200:
                    beds = await response.json()
                    if len(beds) != 2:
                        print(f"❌ Expected 2 pediatric beds, got {len(beds)}")
                        return False
                    print(f"✅ Department filter works: {len(beds)} pediatric beds")
                else:
                    print(f"❌ Department filter failed: {response.status}")
                    return False
            
            # Test filter by status (all should be available initially)
            async with self.session.get(f"{BACKEND_URL}/hospital/beds?status=available", headers=headers) as response:
                if response.status == 200:
                    beds = await response.json()
                    if len(beds) != 8:
                        print(f"❌ Expected 8 available beds, got {len(beds)}")
                        return False
                    print(f"✅ Status filter works: {len(beds)} available beds")
                else:
                    print(f"❌ Status filter failed: {response.status}")
                    return False
            
            return True
        except Exception as e:
            print(f"❌ Bed filtering test error: {str(e)}")
            return False
            
    async def test_dashboard_stats_updated(self) -> bool:
        """Test dashboard stats after creating departments and beds"""
        try:
            headers = await self.get_auth_headers()
            async with self.session.get(f"{BACKEND_URL}/hospital/dashboard/stats", headers=headers) as response:
                if response.status == 200:
                    stats = await response.json()
                    
                    # Verify counts are updated
                    if stats["departments"] != 3:
                        print(f"❌ Expected 3 departments in stats, got {stats['departments']}")
                        return False
                    
                    if stats["beds"]["total"] != 8:
                        print(f"❌ Expected 8 total beds in stats, got {stats['beds']['total']}")
                        return False
                    
                    if stats["beds"]["available"] != 8:
                        print(f"❌ Expected 8 available beds in stats, got {stats['beds']['available']}")
                        return False
                    
                    if stats["beds"]["occupied"] != 0:
                        print(f"❌ Expected 0 occupied beds in stats, got {stats['beds']['occupied']}")
                        return False
                    
                    if stats["beds"]["occupancy_rate"] != 0:
                        print(f"❌ Expected 0% occupancy rate, got {stats['beds']['occupancy_rate']}%")
                        return False
                    
                    print(f"✅ Dashboard stats updated correctly after data creation")
                    print(f"   Departments: {stats['departments']}")
                    print(f"   Total Beds: {stats['beds']['total']}")
                    print(f"   Available Beds: {stats['beds']['available']}")
                    print(f"   Occupancy Rate: {stats['beds']['occupancy_rate']}%")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Updated dashboard stats failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Updated dashboard stats test error: {str(e)}")
            return False
            
    async def test_authentication_errors(self) -> bool:
        """Test error handling for authentication"""
        try:
            # Test without authentication
            async with self.session.get(f"{BACKEND_URL}/hospital/dashboard/stats") as response:
                if response.status != 401:
                    print(f"❌ Expected 401 without auth, got {response.status}")
                    return False
                print("✅ 401 error returned correctly without authentication")
            
            # Test with invalid token
            invalid_headers = {"Authorization": "Bearer invalid_token_here"}
            async with self.session.get(f"{BACKEND_URL}/hospital/dashboard/stats", headers=invalid_headers) as response:
                if response.status != 401:
                    print(f"❌ Expected 401 with invalid token, got {response.status}")
                    return False
                print("✅ 401 error returned correctly with invalid token")
            
            return True
        except Exception as e:
            print(f"❌ Authentication error test failed: {str(e)}")
            return False
            
    async def test_role_based_access(self) -> bool:
        """Test that non-hospital users cannot access hospital endpoints"""
        try:
            # Register a patient user
            patient_data = {
                "email": "patient_test@test.com",
                "phone": "+233244567891",
                "national_id": "GHA987654321",
                "password": "PatientPass123!",
                "full_name": "John Doe",
                "role": "patient"
            }
            
            async with self.session.post(f"{BACKEND_URL}/auth/register", json=patient_data) as response:
                if response.status == 200:
                    result = await response.json()
                    patient_token = result["access_token"]
                    print(f"✅ Patient user registered for role testing")
                else:
                    print(f"❌ Failed to register patient user for role testing")
                    return False
            
            # Try to access hospital endpoints with patient token
            patient_headers = {"Authorization": f"Bearer {patient_token}"}
            
            async with self.session.get(f"{BACKEND_URL}/hospital/dashboard/stats", headers=patient_headers) as response:
                if response.status != 403:
                    print(f"❌ Expected 403 for patient accessing hospital stats, got {response.status}")
                    return False
                print("✅ 403 error returned correctly for patient accessing hospital stats")
            
            async with self.session.get(f"{BACKEND_URL}/hospital/departments", headers=patient_headers) as response:
                if response.status != 403:
                    print(f"❌ Expected 403 for patient accessing departments, got {response.status}")
                    return False
                print("✅ 403 error returned correctly for patient accessing departments")
            
            return True
        except Exception as e:
            print(f"❌ Role-based access test failed: {str(e)}")
            return False
            
    async def run_all_tests(self):
        """Run all hospital management API tests"""
        print("🏥 Starting Hospital Management Backend API Tests")
        print("=" * 60)
        
        await self.setup_session()
        
        try:
            # Test sequence
            tests = [
                ("Hospital User Registration", self.register_hospital_user),
                ("Dashboard Stats (Initial)", self.test_dashboard_stats_initial),
                ("Create Departments", self.test_create_departments),
                ("Get Departments", self.test_get_departments),
                ("Create Beds", self.test_create_beds),
                ("Get Beds", self.test_get_beds),
                ("Bed Filtering", self.test_beds_filtering),
                ("Dashboard Stats (Updated)", self.test_dashboard_stats_updated),
                ("Authentication Errors", self.test_authentication_errors),
                ("Role-Based Access Control", self.test_role_based_access)
            ]
            
            passed = 0
            total = len(tests)
            
            for test_name, test_func in tests:
                print(f"\n🧪 Testing: {test_name}")
                print("-" * 40)
                
                if callable(test_func):
                    result = await test_func()
                else:
                    result = await test_func
                    
                if result:
                    passed += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            
            print("\n" + "=" * 60)
            print(f"🏥 Hospital Management API Test Results")
            print(f"✅ Passed: {passed}/{total}")
            print(f"❌ Failed: {total - passed}/{total}")
            print(f"📊 Success Rate: {(passed/total)*100:.1f}%")
            
            if passed == total:
                print("🎉 All hospital management tests passed!")
                return True
            else:
                print("⚠️  Some tests failed - check logs above")
                return False
                
        finally:
            await self.cleanup_session()

async def main():
    """Main test runner"""
    tester = HospitalAPITester()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)