import logging
import io
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import httpx
import subprocess
from time import sleep

API_URL = "http://localhost:8000/api"

def test_n_plus_1():
    server = subprocess.Popen([".venv/Scripts/python", "-m", "uvicorn", "app.main:app", "--port", "8000"])
    sleep(2)
    try:
        with httpx.Client(base_url=API_URL) as client:
            # Check for N+1
            # But the server has its own logger. We can't capture it easily from client side unless we parse the server output.
            # Instead of a server, let's just use FastAPI TestClient
            from fastapi.testclient import TestClient
            from app.main import app
            from app.db import get_db, Base
            
            # Use testclient to bypass server startup overhead and capture logs in process
            test_engine = create_engine("sqlite:///:memory:", echo=True)
            Base.metadata.create_all(bind=test_engine)
            TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
            
            def override_get_db():
                try:
                    db = TestingSessionLocal()
                    yield db
                finally:
                    db.close()
            
            app.dependency_overrides[get_db] = override_get_db
            tclient = TestClient(app)
            
            # Setup User
            db = TestingSessionLocal()
            from app.models.user import User
            db.add(User(id=1, email="x@x.com", name="x"))
            db.commit()
            
            for _ in range(3):
                tclient.post("/forms", json={"title": "F"})
                
            log_capture = io.StringIO()
            handler = logging.StreamHandler(log_capture)
            logger = logging.getLogger('sqlalchemy.engine')
            logger.setLevel(logging.INFO)
            logger.addHandler(handler)
            
            tclient.get("/forms")
            log_contents = log_capture.getvalue()
            queries_3 = log_contents.count("SELECT")
            
            logger.removeHandler(handler)
            log_capture.truncate(0)
            log_capture.seek(0)
            
            for _ in range(27):
                tclient.post("/forms", json={"title": "F"})
                
            logger.addHandler(handler)
            tclient.get("/forms")
            log_contents = log_capture.getvalue()
            queries_30 = log_contents.count("SELECT")
            
            print(f"Queries for 3 forms: {queries_3}")
            print(f"Queries for 30 forms: {queries_30}")
    finally:
        server.terminate()

if __name__ == "__main__":
    test_n_plus_1()
