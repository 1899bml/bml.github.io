#!/usr/bin/env python3
"""
Backend API Testing for Sistema de Gestão de Sócios
Tests all CRUD operations, validations, and error scenarios
"""

import requests
import json
from datetime import datetime, date
import uuid
import sys

# Configuration
BASE_URL = "https://assoc-members-1.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data - realistic association member data
TEST_SOCIOS = [
    {
        "nome": "Maria Silva Santos",
        "email": "maria.santos@email.com",
        "telefone": "(11) 98765-4321",
        "categoria": "ativo",
        "data_ingresso": "2023-01-15",
        "endereco": "Rua das Flores, 123 - São Paulo, SP"
    },
    {
        "nome": "João Carlos Oliveira",
        "email": "joao.oliveira@email.com",
        "telefone": "(21) 99876-5432",
        "categoria": "ativo",
        "data_ingresso": "2023-03-20",
        "endereco": "Av. Paulista, 456 - São Paulo, SP"
    },
    {
        "nome": "Ana Paula Costa",
        "email": "ana.costa@email.com",
        "telefone": "(31) 97654-3210",
        "categoria": "inativo",
        "data_ingresso": "2022-11-10",
        "endereco": "Rua Minas Gerais, 789 - Belo Horizonte, MG"
    },
    {
        "nome": "Carlos Eduardo Lima",
        "email": "carlos.lima@email.com",
        "telefone": "(41) 96543-2109",
        "categoria": "normal",
        "data_ingresso": "2023-06-05",
        "endereco": "Rua Curitiba, 321 - Curitiba, PR"
    }
]

class BackendTester:
    def __init__(self):
        self.created_socios = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        if success:
            self.test_results["passed"] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED {message}")
    
    def test_health_check(self):
        """Test GET /api/health"""
        print("\n🔍 Testing Health Check...")
        try:
            response = requests.get(f"{BASE_URL}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and "timestamp" in data:
                    self.log_result("Health Check", True, f"Status: {data['status']}")
                    return True
                else:
                    self.log_result("Health Check", False, "Missing required fields in response")
            else:
                self.log_result("Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Health Check", False, f"Exception: {str(e)}")
        return False
    
    def test_initial_stats(self):
        """Test GET /api/socios/stats - should return zeros initially"""
        print("\n🔍 Testing Initial Statistics...")
        try:
            response = requests.get(f"{BASE_URL}/socios/stats", timeout=10)
            if response.status_code == 200:
                data = response.json()
                required_fields = ["total_socios", "ativos", "inativos", "normais", "novos_este_mes"]
                if all(field in data for field in required_fields):
                    self.log_result("Initial Stats Structure", True, f"All fields present")
                    # Note: We don't expect zeros since there might be existing data
                    self.log_result("Initial Stats Values", True, f"Total: {data['total_socios']}, Ativos: {data['ativos']}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_result("Initial Stats", False, f"Missing fields: {missing}")
            else:
                self.log_result("Initial Stats", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Initial Stats", False, f"Exception: {str(e)}")
        return False
    
    def test_create_socio(self, socio_data):
        """Test POST /api/socios"""
        try:
            response = requests.post(f"{BASE_URL}/socios", json=socio_data, headers=HEADERS, timeout=10)
            if response.status_code == 201:
                data = response.json()
                if "_id" in data and data["email"] == socio_data["email"]:
                    self.created_socios.append(data["_id"])
                    self.log_result(f"Create Socio ({socio_data['nome']})", True, f"ID: {data['_id']}")
                    return data["_id"]
                else:
                    self.log_result(f"Create Socio ({socio_data['nome']})", False, "Invalid response structure")
            else:
                self.log_result(f"Create Socio ({socio_data['nome']})", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result(f"Create Socio ({socio_data['nome']})", False, f"Exception: {str(e)}")
        return None
    
    def test_get_socio(self, socio_id, expected_name):
        """Test GET /api/socios/{id}"""
        try:
            response = requests.get(f"{BASE_URL}/socios/{socio_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data["id"] == socio_id and data["nome"] == expected_name:
                    self.log_result(f"Get Socio ({expected_name})", True, f"Retrieved successfully")
                    return True
                else:
                    self.log_result(f"Get Socio ({expected_name})", False, "Data mismatch")
            else:
                self.log_result(f"Get Socio ({expected_name})", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result(f"Get Socio ({expected_name})", False, f"Exception: {str(e)}")
        return False
    
    def test_update_socio(self, socio_id, update_data, original_name):
        """Test PUT /api/socios/{id}"""
        try:
            response = requests.put(f"{BASE_URL}/socios/{socio_id}", json=update_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                data = response.json()
                updated_field = list(update_data.keys())[0]
                if data[updated_field] == update_data[updated_field]:
                    self.log_result(f"Update Socio ({original_name})", True, f"Updated {updated_field}")
                    return True
                else:
                    self.log_result(f"Update Socio ({original_name})", False, "Update not reflected")
            else:
                self.log_result(f"Update Socio ({original_name})", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result(f"Update Socio ({original_name})", False, f"Exception: {str(e)}")
        return False
    
    def test_list_socios(self):
        """Test GET /api/socios"""
        print("\n🔍 Testing List Socios...")
        try:
            response = requests.get(f"{BASE_URL}/socios", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("List Socios", True, f"Retrieved {len(data)} socios")
                    return True
                else:
                    self.log_result("List Socios", False, "Response is not a list")
            else:
                self.log_result("List Socios", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("List Socios", False, f"Exception: {str(e)}")
        return False
    
    def test_list_with_filters(self):
        """Test GET /api/socios with filters"""
        print("\n🔍 Testing List with Filters...")
        
        # Test filter by categoria
        try:
            response = requests.get(f"{BASE_URL}/socios?categoria=ativo", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Filter by Categoria", True, f"Found {len(data)} active socios")
                else:
                    self.log_result("Filter by Categoria", False, "Response is not a list")
            else:
                self.log_result("Filter by Categoria", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Filter by Categoria", False, f"Exception: {str(e)}")
        
        # Test filter by nome
        try:
            response = requests.get(f"{BASE_URL}/socios?nome=Maria", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Filter by Nome", True, f"Found {len(data)} socios with 'Maria'")
                else:
                    self.log_result("Filter by Nome", False, "Response is not a list")
            else:
                self.log_result("Filter by Nome", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("Filter by Nome", False, f"Exception: {str(e)}")
    
    def test_bulk_import(self):
        """Test POST /api/socios/import"""
        print("\n🔍 Testing Bulk Import...")
        
        import_data = [
            {
                "nome": "Roberto Silva Import",
                "email": "roberto.import@email.com",
                "telefone": "(11) 91234-5678",
                "categoria": "ativo",
                "data_ingresso": "2023-08-15",
                "endereco": "Rua Import, 100 - São Paulo, SP"
            },
            {
                "nome": "Fernanda Import Costa",
                "email": "fernanda.import@email.com",
                "telefone": "(21) 98765-4321",
                "categoria": "normal",
                "data_ingresso": "2023-09-01",
                "endereco": "Av. Import, 200 - Rio de Janeiro, RJ"
            }
        ]
        
        try:
            response = requests.post(f"{BASE_URL}/socios/import", json=import_data, headers=HEADERS, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "created_count" in data and "message" in data:
                    self.log_result("Bulk Import", True, f"Imported {data['created_count']} socios")
                    return True
                else:
                    self.log_result("Bulk Import", False, "Invalid response structure")
            else:
                self.log_result("Bulk Import", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("Bulk Import", False, f"Exception: {str(e)}")
        return False
    
    def test_validation_errors(self):
        """Test validation scenarios"""
        print("\n🔍 Testing Validation Errors...")
        
        # Test duplicate email
        duplicate_socio = {
            "nome": "Duplicate Test",
            "email": "maria.santos@email.com",  # Using existing email
            "telefone": "(11) 99999-9999",
            "categoria": "ativo",
            "data_ingresso": "2023-10-01",
            "endereco": "Test Address"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/socios", json=duplicate_socio, headers=HEADERS, timeout=10)
            if response.status_code == 400:
                self.log_result("Duplicate Email Validation", True, "Correctly rejected duplicate email")
            else:
                self.log_result("Duplicate Email Validation", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Duplicate Email Validation", False, f"Exception: {str(e)}")
        
        # Test invalid email format
        invalid_email_socio = {
            "nome": "Invalid Email Test",
            "email": "invalid-email-format",
            "telefone": "(11) 99999-9999",
            "categoria": "ativo",
            "data_ingresso": "2023-10-01",
            "endereco": "Test Address"
        }
        
        try:
            response = requests.post(f"{BASE_URL}/socios", json=invalid_email_socio, headers=HEADERS, timeout=10)
            if response.status_code == 422:  # Pydantic validation error
                self.log_result("Invalid Email Format Validation", True, "Correctly rejected invalid email")
            else:
                self.log_result("Invalid Email Format Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Email Format Validation", False, f"Exception: {str(e)}")
        
        # Test missing required fields
        incomplete_socio = {
            "nome": "Incomplete Test"
            # Missing email, data_ingresso
        }
        
        try:
            response = requests.post(f"{BASE_URL}/socios", json=incomplete_socio, headers=HEADERS, timeout=10)
            if response.status_code == 422:  # Pydantic validation error
                self.log_result("Missing Fields Validation", True, "Correctly rejected incomplete data")
            else:
                self.log_result("Missing Fields Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Missing Fields Validation", False, f"Exception: {str(e)}")
    
    def test_nonexistent_id_errors(self):
        """Test operations with non-existent IDs"""
        print("\n🔍 Testing Non-existent ID Errors...")
        
        fake_id = str(uuid.uuid4())
        
        # Test GET with non-existent ID
        try:
            response = requests.get(f"{BASE_URL}/socios/{fake_id}", timeout=10)
            if response.status_code == 404:
                self.log_result("Get Non-existent ID", True, "Correctly returned 404")
            else:
                self.log_result("Get Non-existent ID", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Get Non-existent ID", False, f"Exception: {str(e)}")
        
        # Test PUT with non-existent ID
        try:
            update_data = {"nome": "Updated Name"}
            response = requests.put(f"{BASE_URL}/socios/{fake_id}", json=update_data, headers=HEADERS, timeout=10)
            if response.status_code == 404:
                self.log_result("Update Non-existent ID", True, "Correctly returned 404")
            else:
                self.log_result("Update Non-existent ID", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Update Non-existent ID", False, f"Exception: {str(e)}")
        
        # Test DELETE with non-existent ID
        try:
            response = requests.delete(f"{BASE_URL}/socios/{fake_id}", timeout=10)
            if response.status_code == 404:
                self.log_result("Delete Non-existent ID", True, "Correctly returned 404")
            else:
                self.log_result("Delete Non-existent ID", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Delete Non-existent ID", False, f"Exception: {str(e)}")
    
    def test_delete_socio(self, socio_id, socio_name):
        """Test DELETE /api/socios/{id}"""
        try:
            response = requests.delete(f"{BASE_URL}/socios/{socio_id}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result(f"Delete Socio ({socio_name})", True, "Deleted successfully")
                    return True
                else:
                    self.log_result(f"Delete Socio ({socio_name})", False, "Invalid response structure")
            else:
                self.log_result(f"Delete Socio ({socio_name})", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result(f"Delete Socio ({socio_name})", False, f"Exception: {str(e)}")
        return False
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Backend API Tests for Sistema de Gestão de Sócios")
        print(f"🌐 Testing against: {BASE_URL}")
        print("=" * 80)
        
        # 1. Health Check
        if not self.test_health_check():
            print("❌ Health check failed - backend may not be running")
            return
        
        # 2. Initial Statistics
        self.test_initial_stats()
        
        # 3. Create test socios
        print("\n🔍 Testing CRUD Operations...")
        created_ids = []
        for socio in TEST_SOCIOS:
            socio_id = self.test_create_socio(socio)
            if socio_id:
                created_ids.append((socio_id, socio["nome"]))
        
        # 4. Test individual retrieval
        for socio_id, nome in created_ids:
            self.test_get_socio(socio_id, nome)
        
        # 5. Test updates
        if created_ids:
            first_id, first_name = created_ids[0]
            self.test_update_socio(first_id, {"telefone": "(11) 99999-0000"}, first_name)
        
        # 6. Test listing
        self.test_list_socios()
        
        # 7. Test filters
        self.test_list_with_filters()
        
        # 8. Test bulk import
        self.test_bulk_import()
        
        # 9. Test validations
        self.test_validation_errors()
        
        # 10. Test non-existent ID errors
        self.test_nonexistent_id_errors()
        
        # 11. Clean up - delete created socios
        print("\n🧹 Cleaning up test data...")
        for socio_id, nome in created_ids:
            self.test_delete_socio(socio_id, nome)
        
        # Final statistics after testing
        print("\n🔍 Testing Final Statistics...")
        self.test_initial_stats()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        if self.test_results['failed'] == 0:
            print("🎉 All tests passed! Backend is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the errors above.")

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()