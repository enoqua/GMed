from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'glenx-medhub-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Glenx MedHub API")
api_router = APIRouter(prefix="/api")

# Pydantic Models
class UserRole:
    PATIENT = "patient"
    DOCTOR = "doctor"
    HOSPITAL = "hospital"
    PHARMACY = "pharmacy"
    AMBULANCE = "ambulance"
    HERBALIST = "herbalist"

class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str
    national_id: str
    password: str
    full_name: str
    role: str = UserRole.PATIENT

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class DoctorCreate(BaseModel):
    specialty: str
    license_number: str
    consultation_fee: float
    location: str
    bio: str
    years_of_experience: int = 0

class DoctorResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    specialty: str
    license_number: str
    consultation_fee: float
    location: str
    bio: str
    years_of_experience: int
    rating: float = 0.0
    total_reviews: int = 0
    profile_picture: Optional[str] = None

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_type: str  # video, audio, in-person
    scheduled_time: datetime
    reason: str

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    appointment_type: str
    scheduled_time: datetime
    status: str
    reason: str
    created_at: datetime

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: RegisterRequest):
    # Check if user exists
    existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"phone": user_data.phone}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email or phone already exists")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user_doc = {
        "email": user_data.email,
        "phone": user_data.phone,
        "national_id": user_data.national_id,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "verified_email": False,
        "verified_phone": False,
        "verified_id": False,
        "profile_picture": None,
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # If patient, create patient record
    if user_data.role == UserRole.PATIENT:
        patient_doc = {
            "user_id": user_id,
            "medical_history": [],
            "allergies": [],
            "blood_type": None,
            "emergency_contact": None,
            "access_code": str(uuid.uuid4())[:6].upper(),
            "created_at": datetime.utcnow()
        }
        await db.patients.insert_one(patient_doc)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id, "role": user_data.role})
    
    user_response = {
        "id": user_id,
        "email": user_data.email,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "phone": user_data.phone
    }
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user_id = str(user["_id"])
    access_token = create_access_token(data={"sub": user_id, "role": user["role"]})
    
    user_response = {
        "id": user_id,
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "phone": user.get("phone")
    }
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    return {
        "id": user_id,
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "phone": current_user.get("phone"),
        "profile_picture": current_user.get("profile_picture")
    }

# Doctor Routes
@api_router.get("/doctors", response_model=List[DoctorResponse])
async def get_doctors(
    specialty: Optional[str] = None,
    location: Optional[str] = None,
    min_rating: Optional[float] = None
):
    query = {}
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    
    doctors = await db.doctors.find(query).to_list(100)
    
    # Fetch user details for each doctor
    result = []
    for doctor in doctors:
        user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
        if user:
            result.append(DoctorResponse(
                id=str(doctor["_id"]),
                user_id=doctor["user_id"],
                full_name=user["full_name"],
                email=user["email"],
                specialty=doctor["specialty"],
                license_number=doctor["license_number"],
                consultation_fee=doctor["consultation_fee"],
                location=doctor["location"],
                bio=doctor["bio"],
                years_of_experience=doctor.get("years_of_experience", 0),
                rating=doctor.get("rating", 0.0),
                total_reviews=doctor.get("total_reviews", 0),
                profile_picture=user.get("profile_picture")
            ))
    
    return result

@api_router.get("/doctors/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: str):
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return DoctorResponse(
            id=str(doctor["_id"]),
            user_id=doctor["user_id"],
            full_name=user["full_name"],
            email=user["email"],
            specialty=doctor["specialty"],
            license_number=doctor["license_number"],
            consultation_fee=doctor["consultation_fee"],
            location=doctor["location"],
            bio=doctor["bio"],
            years_of_experience=doctor.get("years_of_experience", 0),
            rating=doctor.get("rating", 0.0),
            total_reviews=doctor.get("total_reviews", 0),
            profile_picture=user.get("profile_picture")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Appointment Routes
@api_router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can book appointments")
    
    # Verify doctor exists
    doctor = await db.doctors.find_one({"_id": ObjectId(appointment_data.doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor_user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
    
    appointment_doc = {
        "patient_id": str(current_user["_id"]),
        "doctor_id": appointment_data.doctor_id,
        "appointment_type": appointment_data.appointment_type,
        "scheduled_time": appointment_data.scheduled_time,
        "status": "pending",
        "reason": appointment_data.reason,
        "created_at": datetime.utcnow(),
        "notes": None,
        "prescription": None
    }
    
    result = await db.appointments.insert_one(appointment_doc)
    
    return AppointmentResponse(
        id=str(result.inserted_id),
        patient_id=str(current_user["_id"]),
        patient_name=current_user["full_name"],
        doctor_id=appointment_data.doctor_id,
        doctor_name=doctor_user["full_name"],
        appointment_type=appointment_data.appointment_type,
        scheduled_time=appointment_data.scheduled_time,
        status="pending",
        reason=appointment_data.reason,
        created_at=datetime.utcnow()
    )

@api_router.get("/appointments/my-appointments", response_model=List[AppointmentResponse])
async def get_my_appointments(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    if current_user["role"] == UserRole.PATIENT:
        appointments = await db.appointments.find({"patient_id": user_id}).sort("scheduled_time", -1).to_list(100)
    elif current_user["role"] == UserRole.DOCTOR:
        # Find doctor record
        doctor = await db.doctors.find_one({"user_id": user_id})
        if not doctor:
            return []
        doctor_id = str(doctor["_id"])
        appointments = await db.appointments.find({"doctor_id": doctor_id}).sort("scheduled_time", -1).to_list(100)
    else:
        return []
    
    result = []
    for appointment in appointments:
        patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})
        doctor = await db.doctors.find_one({"_id": ObjectId(appointment["doctor_id"])})
        doctor_user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
        
        result.append(AppointmentResponse(
            id=str(appointment["_id"]),
            patient_id=appointment["patient_id"],
            patient_name=patient_user["full_name"],
            doctor_id=appointment["doctor_id"],
            doctor_name=doctor_user["full_name"],
            appointment_type=appointment["appointment_type"],
            scheduled_time=appointment["scheduled_time"],
            status=appointment["status"],
            reason=appointment["reason"],
            created_at=appointment["created_at"]
        ))
    
    return result

@api_router.put("/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, current_user: dict = Depends(get_current_user)):
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Verify ownership
        user_id = str(current_user["_id"])
        if appointment["patient_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
        
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"status": "cancelled"}}
        )
        
        return {"message": "Appointment cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Seed data endpoint for testing
@api_router.post("/seed-doctors")
async def seed_doctors():
    # Check if doctors already exist
    existing_doctors = await db.doctors.count_documents({})
    if existing_doctors > 0:
        return {"message": "Doctors already seeded"}
    
    # Create sample doctors
    doctors_data = [
        {
            "email": "dr.mensah@glenxmed.com",
            "full_name": "Dr. Kwame Mensah",
            "specialty": "General Practitioner",
            "location": "Accra",
            "fee": 50.0,
            "bio": "Experienced GP with 10+ years in family medicine",
            "years": 10
        },
        {
            "email": "dr.ama@glenxmed.com",
            "full_name": "Dr. Ama Boateng",
            "specialty": "Pediatrician",
            "location": "Kumasi",
            "fee": 70.0,
            "bio": "Specialist in child healthcare and development",
            "years": 8
        },
        {
            "email": "dr.kofi@glenxmed.com",
            "full_name": "Dr. Kofi Asante",
            "specialty": "Cardiologist",
            "location": "Accra",
            "fee": 120.0,
            "bio": "Heart specialist with international training",
            "years": 15
        },
        {
            "email": "dr.abena@glenxmed.com",
            "full_name": "Dr. Abena Osei",
            "specialty": "Dermatologist",
            "location": "Tema",
            "fee": 90.0,
            "bio": "Skin care expert specializing in tropical conditions",
            "years": 7
        },
        {
            "email": "dr.yaw@glenxmed.com",
            "full_name": "Dr. Yaw Owusu",
            "specialty": "Neurologist",
            "location": "Kumasi",
            "fee": 150.0,
            "bio": "Brain and nervous system specialist",
            "years": 12
        }
    ]
    
    for doctor_data in doctors_data:
        # Create user
        hashed_password = get_password_hash("password123")
        user_doc = {
            "email": doctor_data["email"],
            "phone": "+233" + str(uuid.uuid4().int)[:9],
            "national_id": "GHA" + str(uuid.uuid4().int)[:9],
            "password": hashed_password,
            "full_name": doctor_data["full_name"],
            "role": UserRole.DOCTOR,
            "verified_email": True,
            "verified_phone": True,
            "verified_id": True,
            "profile_picture": None,
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        # Create doctor record
        doctor_doc = {
            "user_id": user_id,
            "specialty": doctor_data["specialty"],
            "license_number": "GMA" + str(uuid.uuid4().int)[:8],
            "consultation_fee": doctor_data["fee"],
            "location": doctor_data["location"],
            "bio": doctor_data["bio"],
            "years_of_experience": doctor_data["years"],
            "rating": round(4.0 + (uuid.uuid4().int % 10) / 10, 1),
            "total_reviews": uuid.uuid4().int % 50 + 10,
            "created_at": datetime.utcnow()
        }
        await db.doctors.insert_one(doctor_doc)
    
    return {"message": "Sample doctors created successfully"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
