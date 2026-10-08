import httpx
import sqlite3
import json
import logging
from time import sleep
import os
import subprocess

# Configure logger for N+1 check
logging.basicConfig()
logger = logging.getLogger('sqlalchemy.engine')
logger.setLevel(logging.INFO)

API_URL = "http://localhost:8000/api"

def run_tests():
    # Setup DB - create a second user
    conn = sqlite3.connect('db.sqlite3')
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO users (id, email, name) VALUES (2, 'user2@example.com', 'User 2')")
    
    # We will test creator endpoints.
    # Note: the app uses get_current_user which returns user 1 by default.
    # We might need to override the dependency if possible, but actually we can test by creating a form for user 1 and user 2.
    
    # Let's write a simple script that hits the endpoints.
    # We need uvicorn running. We can start it using subprocess.
    
    server = subprocess.Popen([".venv/Scripts/python", "-m", "uvicorn", "app.main:app", "--port", "8000"])
    sleep(2) # wait for server to start
    
    results = []
    
    try:
        with httpx.Client(base_url=API_URL) as client:
            # 2. Test endpoints
            print("Testing POST /forms")
            res = client.post("/forms", json={"title": "Test Form"})
            if res.status_code == 201:
                form_id = res.json()["id"]
                results.append("POST /forms valid: PASS")
            else:
                results.append(f"POST /forms valid: FAIL ({res.status_code} {res.text})")
                form_id = 1 # fallback
                
            print("Testing POST /forms with invalid body")
            res = client.post("/forms", json={"invalid": "data"})
            results.append(f"POST /forms invalid: {res.status_code} {res.text}")
            
            print(f"Testing GET /forms/{form_id}")
            res = client.get(f"/forms/{form_id}")
            results.append(f"GET /forms/{form_id}: {res.status_code}")
            
            print(f"Testing GET /forms/99999")
            res = client.get("/forms/99999")
            results.append(f"GET /forms/99999: {res.status_code} {res.text}")
            
            # Form belonging to another user
            # Let's create a form in DB for user 2
            c.execute("INSERT INTO forms (id, user_id, public_id, title, status) VALUES (999, 2, 'abc123xyz1', 'User 2 Form', 'draft')")
            conn.commit()
            
            print(f"Testing GET /forms/999 (other user)")
            res = client.get("/forms/999")
            results.append(f"GET /forms/999 (other user): {res.status_code} {res.text}")
            
            # 4. Reorder edge cases
            # Add some questions
            q1 = client.post(f"/forms/{form_id}/questions", json={"type": "short_text", "title": "Q1"}).json()
            q2 = client.post(f"/forms/{form_id}/questions", json={"type": "short_text", "title": "Q2"}).json()
            q3 = client.post(f"/forms/{form_id}/questions", json={"type": "short_text", "title": "Q3"}).json()
            
            q1_id = q1["id"]
            q2_id = q2["id"]
            q3_id = q3["id"]
            
            # missing id
            res = client.put(f"/forms/{form_id}/questions/order", json=[q1_id, q3_id])
            results.append(f"Reorder missing id: {res.status_code} {res.text}")
            
            # extra id
            res = client.put(f"/forms/{form_id}/questions/order", json=[q1_id, q2_id, q3_id, 9999])
            results.append(f"Reorder extra id: {res.status_code} {res.text}")
            
            # duplicate id
            res = client.put(f"/forms/{form_id}/questions/order", json=[q1_id, q2_id, q2_id])
            results.append(f"Reorder duplicate id: {res.status_code} {res.text}")
            
            # empty list
            res = client.put(f"/forms/{form_id}/questions/order", json=[])
            results.append(f"Reorder empty list: {res.status_code} {res.text}")
            
            # delete middle question
            res = client.delete(f"/questions/{q2_id}")
            results.append(f"Delete middle question: {res.status_code}")
            
            res = client.get(f"/forms/{form_id}")
            questions = res.json().get("questions", [])
            positions = [q["position"] for q in questions]
            results.append(f"Positions after delete: {positions}")
            
    finally:
        server.terminate()
        conn.close()

    with open("audit_results.txt", "w") as f:
        f.write("\\n".join(results))

if __name__ == "__main__":
    run_tests()
