#!/usr/bin/env python3
"""
Test script for RAG Microservice query endpoint
"""
import requests
import json

url = "https://ragmicroservice-production.up.railway.app/api/v1/query"

payload = {
    "query": "What is Eden Levi's role?",
    "tenant_id": "default.local",
    "context": {
        "user_id": "admin-user-123",
        "role": "admin"
    }
}

headers = {
    "Content-Type": "application/json"
}

print("Sending request to:", url)
print("Payload:", json.dumps(payload, indent=2))
print("\n" + "="*50 + "\n")

try:
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print("\nResponse Body:")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.Timeout:
    print("ERROR: Request timed out after 30 seconds")
except requests.exceptions.RequestException as e:
    print(f"ERROR: {e}")
except json.JSONDecodeError:
    print("Response (not JSON):")
    print(response.text)

