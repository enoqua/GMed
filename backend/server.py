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
    ADMIN = "admin"

class RegisterRequest(BaseModel):
    email: EmailStr
    phone: str
    national_id: str
    password: str
    full_name: str
    role: str = UserRole.PATIENT
    
    # Doctor specific fields
    specialty: Optional[str] = None
    license_number: Optional[str] = None
    consultation_fee: Optional[float] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    years_of_experience: Optional[int] = 0
    certifications: Optional[str] = None  # base64 document
    
    # Hospital specific fields
    hospital_name: Optional[str] = None
    services: Optional[List[str]] = None
    operating_hours: Optional[str] = None
    
    # Pharmacy specific fields
    pharmacy_name: Optional[str] = None
    license_type: Optional[str] = None
    
    # Ambulance specific fields
    service_areas: Optional[List[str]] = None
    vehicle_type: Optional[str] = None
    
    # Herbalist specific fields
    practice_years: Optional[int] = 0
    specializations: Optional[List[str]] = None

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

def verify_token(token: str):
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return user_id
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
    
    # Create role-specific records
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
    
    elif user_data.role == UserRole.DOCTOR:
        doctor_doc = {
            "user_id": user_id,
            "specialty": user_data.specialty or "General Practitioner",
            "license_number": user_data.license_number or "PENDING",
            "consultation_fee": user_data.consultation_fee or 50.0,
            "location": user_data.location or "Not specified",
            "bio": user_data.bio or "Healthcare professional",
            "years_of_experience": user_data.years_of_experience or 0,
            "rating": 0.0,
            "total_reviews": 0,
            "certifications": user_data.certifications,
            "subscription_status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.doctors.insert_one(doctor_doc)
    
    elif user_data.role == UserRole.HOSPITAL:
        hospital_doc = {
            "user_id": user_id,
            "hospital_name": user_data.hospital_name or user_data.full_name,
            "location": user_data.location or "Not specified",
            "services": user_data.services or [],
            "operating_hours": user_data.operating_hours or "24/7",
            "departments": [],
            "subscription_status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.hospitals.insert_one(hospital_doc)
    
    elif user_data.role == UserRole.PHARMACY:
        pharmacy_doc = {
            "user_id": user_id,
            "pharmacy_name": user_data.pharmacy_name or user_data.full_name,
            "location": user_data.location or "Not specified",
            "license_number": user_data.license_number or "PENDING",
            "license_type": user_data.license_type or "retail",
            "inventory": [],
            "subscription_status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.pharmacies.insert_one(pharmacy_doc)
    
    elif user_data.role == UserRole.AMBULANCE:
        ambulance_doc = {
            "user_id": user_id,
            "service_areas": user_data.service_areas or [],
            "vehicle_type": user_data.vehicle_type or "Standard",
            "location": user_data.location or "Not specified",
            "availability_status": "available",
            "subscription_status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.ambulances.insert_one(ambulance_doc)
    
    elif user_data.role == UserRole.HERBALIST:
        herbalist_doc = {
            "user_id": user_id,
            "practice_years": user_data.practice_years or 0,
            "specializations": user_data.specializations or [],
            "location": user_data.location or "Not specified",
            "bio": user_data.bio or "Traditional medicine practitioner",
            "rating": 0.0,
            "total_reviews": 0,
            "subscription_status": "pending",
            "created_at": datetime.utcnow()
        }
        await db.herbalists.insert_one(herbalist_doc)
    
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

# AI Diagnostics Models
class DiagnosticMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class DiagnosticResponse(BaseModel):
    response: str
    session_id: str

# Forum Models
class ForumPostCreate(BaseModel):
    title: str
    content: str
    tags: List[str] = []

class ForumPostResponse(BaseModel):
    id: str
    author_id: str
    author_name: str
    title: str
    content: str
    tags: List[str]
    likes: int
    replies_count: int
    created_at: datetime

class ForumReplyCreate(BaseModel):
    content: str

class ForumReplyResponse(BaseModel):
    id: str
    author_id: str
    author_name: str
    content: str
    likes: int
    created_at: datetime

# AI Diagnostics Routes
@api_router.post("/diagnostics/chat", response_model=DiagnosticResponse)
async def ai_diagnostics_chat(
    message_data: DiagnosticMessage,
    current_user: dict = Depends(get_current_user)
):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    try:
        session_id = message_data.session_id or str(uuid.uuid4())
        
        # Get chat history from database
        chat_history = await db.diagnostic_chats.find_one({"session_id": session_id})
        
        # Initialize LLM Chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        system_message = """You are a medical AI assistant for Glenx MedHub. 
        Your role is to help users understand their symptoms and provide preliminary guidance.
        
        IMPORTANT DISCLAIMERS:
        1. You are NOT a replacement for professional medical diagnosis
        2. Always recommend consulting a licensed doctor for proper diagnosis
        3. In emergencies, advise calling emergency services immediately
        4. Do not prescribe medications
        
        Be empathetic, ask relevant follow-up questions, and help users describe their symptoms clearly.
        At the end of your assessment, suggest booking an appointment with a relevant specialist on the platform."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        # Send message
        user_message = UserMessage(text=message_data.message)
        response = await chat.send_message(user_message)
        
        # Save conversation to database
        if not chat_history:
            await db.diagnostic_chats.insert_one({
                "session_id": session_id,
                "user_id": str(current_user["_id"]),
                "messages": [
                    {"role": "user", "content": message_data.message, "timestamp": datetime.utcnow()},
                    {"role": "assistant", "content": response, "timestamp": datetime.utcnow()}
                ],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        else:
            await db.diagnostic_chats.update_one(
                {"session_id": session_id},
                {
                    "$push": {
                        "messages": {
                            "$each": [
                                {"role": "user", "content": message_data.message, "timestamp": datetime.utcnow()},
                                {"role": "assistant", "content": response, "timestamp": datetime.utcnow()}
                            ]
                        }
                    },
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
        
        return DiagnosticResponse(response=response, session_id=session_id)
    
    except Exception as e:
        logger.error(f"AI Diagnostics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/diagnostics/history")
async def get_diagnostic_history(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sessions = await db.diagnostic_chats.find({"user_id": user_id}).sort("updated_at", -1).to_list(100)
    
    result = []
    for session in sessions:
        result.append({
            "session_id": session["session_id"],
            "created_at": session["created_at"],
            "updated_at": session["updated_at"],
            "message_count": len(session.get("messages", []))
        })
    
    return result

# Forum Routes
@api_router.post("/forum/posts", response_model=ForumPostResponse)
async def create_forum_post(
    post_data: ForumPostCreate,
    current_user: dict = Depends(get_current_user)
):
    post_doc = {
        "author_id": str(current_user["_id"]),
        "title": post_data.title,
        "content": post_data.content,
        "tags": post_data.tags,
        "likes": 0,
        "replies_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.forum_posts.insert_one(post_doc)
    
    return ForumPostResponse(
        id=str(result.inserted_id),
        author_id=str(current_user["_id"]),
        author_name=current_user["full_name"],
        title=post_data.title,
        content=post_data.content,
        tags=post_data.tags,
        likes=0,
        replies_count=0,
        created_at=datetime.utcnow()
    )

@api_router.get("/forum/posts", response_model=List[ForumPostResponse])
async def get_forum_posts(
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    query = {}
    
    if tag:
        query["tags"] = tag
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    posts = await db.forum_posts.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for post in posts:
        author = await db.users.find_one({"_id": ObjectId(post["author_id"])})
        result.append(ForumPostResponse(
            id=str(post["_id"]),
            author_id=post["author_id"],
            author_name=author["full_name"] if author else "Unknown",
            title=post["title"],
            content=post["content"],
            tags=post["tags"],
            likes=post.get("likes", 0),
            replies_count=post.get("replies_count", 0),
            created_at=post["created_at"]
        ))
    
    return result

@api_router.get("/forum/posts/{post_id}")
async def get_forum_post(post_id: str):
    try:
        post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        author = await db.users.find_one({"_id": ObjectId(post["author_id"])})
        
        # Get replies
        replies = await db.forum_replies.find({"post_id": post_id}).sort("created_at", 1).to_list(100)
        
        replies_data = []
        for reply in replies:
            reply_author = await db.users.find_one({"_id": ObjectId(reply["author_id"])})
            replies_data.append({
                "id": str(reply["_id"]),
                "author_id": reply["author_id"],
                "author_name": reply_author["full_name"] if reply_author else "Unknown",
                "content": reply["content"],
                "likes": reply.get("likes", 0),
                "created_at": reply["created_at"]
            })
        
        return {
            "id": str(post["_id"]),
            "author_id": post["author_id"],
            "author_name": author["full_name"] if author else "Unknown",
            "title": post["title"],
            "content": post["content"],
            "tags": post["tags"],
            "likes": post.get("likes", 0),
            "replies_count": post.get("replies_count", 0),
            "created_at": post["created_at"],
            "replies": replies_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/forum/posts/{post_id}/replies", response_model=ForumReplyResponse)
async def create_forum_reply(
    post_id: str,
    reply_data: ForumReplyCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # Verify post exists
        post = await db.forum_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        reply_doc = {
            "post_id": post_id,
            "author_id": str(current_user["_id"]),
            "content": reply_data.content,
            "likes": 0,
            "created_at": datetime.utcnow()
        }
        
        result = await db.forum_replies.insert_one(reply_doc)
        
        # Update reply count
        await db.forum_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"replies_count": 1}}
        )
        
        return ForumReplyResponse(
            id=str(result.inserted_id),
            author_id=str(current_user["_id"]),
            author_name=current_user["full_name"],
            content=reply_data.content,
            likes=0,
            created_at=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/forum/posts/{post_id}/like")
async def like_forum_post(post_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.forum_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"likes": 1}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        return {"message": "Post liked successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Dashboard Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    role = current_user["role"]
    
    if role == UserRole.PATIENT:
        # Patient dashboard stats
        appointments_count = await db.appointments.count_documents({"patient_id": user_id})
        upcoming_appointments = await db.appointments.count_documents({
            "patient_id": user_id,
            "status": "pending",
            "scheduled_time": {"$gte": datetime.utcnow()}
        })
        
        return {
            "role": role,
            "total_appointments": appointments_count,
            "upcoming_appointments": upcoming_appointments,
            "completed_appointments": await db.appointments.count_documents({
                "patient_id": user_id,
                "status": "completed"
            })
        }
    
    elif role == UserRole.DOCTOR:
        # Doctor dashboard stats
        doctor = await db.doctors.find_one({"user_id": user_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        
        doctor_id = str(doctor["_id"])
        total_appointments = await db.appointments.count_documents({"doctor_id": doctor_id})
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_appointments = await db.appointments.count_documents({
            "doctor_id": doctor_id,
            "scheduled_time": {"$gte": today_start, "$lt": today_end}
        })
        
        pending_appointments = await db.appointments.count_documents({
            "doctor_id": doctor_id,
            "status": "pending"
        })
        
        # Calculate total earnings (mock for now)
        completed_appointments = await db.appointments.count_documents({
            "doctor_id": doctor_id,
            "status": "completed"
        })
        
        total_earnings = completed_appointments * doctor.get("consultation_fee", 0)
        
        return {
            "role": role,
            "total_appointments": total_appointments,
            "today_appointments": today_appointments,
            "pending_appointments": pending_appointments,
            "total_patients": total_appointments,  # Simplified
            "total_earnings": total_earnings,
            "rating": doctor.get("rating", 0),
            "total_reviews": doctor.get("total_reviews", 0)
        }
    
    elif role == UserRole.HOSPITAL:
        # Hospital dashboard stats
        hospital = await db.hospitals.find_one({"user_id": user_id})
        if not hospital:
            raise HTTPException(status_code=404, detail="Hospital profile not found")
        
        departments_count = len(hospital.get("departments", []))
        
        return {
            "role": role,
            "hospital_name": hospital.get("hospital_name", ""),
            "departments_count": departments_count,
            "services_count": len(hospital.get("services", [])),
            "total_staff": 0,  # Placeholder
            "total_patients": 0  # Placeholder
        }
    
    elif role == UserRole.PHARMACY:
        # Pharmacy dashboard stats
        pharmacy = await db.pharmacies.find_one({"user_id": user_id})
        if not pharmacy:
            raise HTTPException(status_code=404, detail="Pharmacy profile not found")
        
        inventory_count = len(pharmacy.get("inventory", []))
        
        return {
            "role": role,
            "pharmacy_name": pharmacy.get("pharmacy_name", ""),
            "inventory_count": inventory_count,
            "total_orders": 0,  # Placeholder
            "total_sales": 0,  # Placeholder
            "low_stock_items": 0  # Placeholder
        }
    
    elif role == UserRole.AMBULANCE:
        # Ambulance dashboard stats
        ambulance = await db.ambulances.find_one({"user_id": user_id})
        if not ambulance:
            raise HTTPException(status_code=404, detail="Ambulance profile not found")
        
        return {
            "role": role,
            "availability_status": ambulance.get("availability_status", "available"),
            "service_areas": ambulance.get("service_areas", []),
            "total_trips": 0,  # Placeholder
            "active_bookings": 0,  # Placeholder
            "completed_trips": 0  # Placeholder
        }
    
    elif role == UserRole.HERBALIST:
        # Herbalist dashboard stats
        herbalist = await db.herbalists.find_one({"user_id": user_id})
        if not herbalist:
            raise HTTPException(status_code=404, detail="Herbalist profile not found")
        
        return {
            "role": role,
            "practice_years": herbalist.get("practice_years", 0),
            "specializations": herbalist.get("specializations", []),
            "rating": herbalist.get("rating", 0),
            "total_reviews": herbalist.get("total_reviews", 0),
            "total_consultations": 0  # Placeholder
        }
    
    return {"role": role, "message": "Dashboard not configured for this role"}

# Medicine/Inventory Management for Pharmacy
class MedicineCreate(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category: str

@api_router.post("/pharmacies/medicines")
async def add_medicine(medicine: MedicineCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacies can add medicines")
    
    user_id = str(current_user["_id"])
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    medicine_doc = {
        "id": str(uuid.uuid4()),
        "name": medicine.name,
        "description": medicine.description,
        "price": medicine.price,
        "stock": medicine.stock,
        "category": medicine.category,
        "added_at": datetime.utcnow()
    }
    
    await db.pharmacies.update_one(
        {"user_id": user_id},
        {"$push": {"inventory": medicine_doc}}
    )
    
    return {"message": "Medicine added successfully", "medicine": medicine_doc}

@api_router.get("/pharmacies/inventory")
async def get_pharmacy_inventory(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacies can view inventory")
    
    user_id = str(current_user["_id"])
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    return {
        "pharmacy_name": pharmacy.get("pharmacy_name", ""),
        "inventory": pharmacy.get("inventory", [])
    }

# Department Management for Hospital
class DepartmentCreate(BaseModel):
    name: str
    head: str
    description: str

@api_router.post("/hospitals/departments")
async def add_department(department: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can add departments")
    
    user_id = str(current_user["_id"])
    hospital = await db.hospitals.find_one({"user_id": user_id})
    
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    department_doc = {
        "id": str(uuid.uuid4()),
        "name": department.name,
        "head": department.head,
        "description": department.description,
        "created_at": datetime.utcnow()
    }
    
    await db.hospitals.update_one(
        {"user_id": user_id},
        {"$push": {"departments": department_doc}}
    )
    
    return {"message": "Department added successfully", "department": department_doc}

@api_router.get("/hospitals/departments")
async def get_hospital_departments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can view departments")
    
    user_id = str(current_user["_id"])
    hospital = await db.hospitals.find_one({"user_id": user_id})
    
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    return {
        "hospital_name": hospital.get("hospital_name", ""),
        "departments": hospital.get("departments", [])
    }

# Availability Management for Ambulance
class AvailabilityUpdate(BaseModel):
    status: str  # available, busy, offline

@api_router.put("/ambulances/availability")
async def update_ambulance_availability(update: AvailabilityUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.AMBULANCE:
        raise HTTPException(status_code=403, detail="Only ambulance services can update availability")
    
    user_id = str(current_user["_id"])
    
    await db.ambulances.update_one(
        {"user_id": user_id},
        {"$set": {"availability_status": update.status}}
    )
    
    return {"message": "Availability updated successfully", "status": update.status}

# Enhanced Appointment Management
class AppointmentStatusUpdate(BaseModel):
    status: str  # confirmed, completed, cancelled
    notes: Optional[str] = None

class PrescriptionCreate(BaseModel):
    medications: List[dict]
    instructions: str
    diagnosis: str

@api_router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    update: AppointmentStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Check if user is the doctor for this appointment
        if current_user["role"] == UserRole.DOCTOR:
            doctor = await db.doctors.find_one({"user_id": str(current_user["_id"])})
            if not doctor or str(doctor["_id"]) != appointment["doctor_id"]:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {
                "status": update.status,
                "notes": update.notes,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Appointment updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/appointments/{appointment_id}/prescription")
async def add_prescription(
    appointment_id: str,
    prescription: PrescriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can add prescriptions")
    
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        prescription_doc = {
            "appointment_id": appointment_id,
            "patient_id": appointment["patient_id"],
            "doctor_id": appointment["doctor_id"],
            "medications": prescription.medications,
            "instructions": prescription.instructions,
            "diagnosis": prescription.diagnosis,
            "created_at": datetime.utcnow()
        }
        
        result = await db.prescriptions.insert_one(prescription_doc)
        
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"prescription": str(result.inserted_id)}}
        )
        
        return {"message": "Prescription added successfully", "prescription_id": str(result.inserted_id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/appointments/{appointment_id}/prescription")
async def get_prescription(appointment_id: str, current_user: dict = Depends(get_current_user)):
    try:
        prescription = await db.prescriptions.find_one({"appointment_id": appointment_id})
        if not prescription:
            raise HTTPException(status_code=404, detail="No prescription found")
        
        # Check authorization
        user_id = str(current_user["_id"])
        if prescription["patient_id"] != user_id:
            if current_user["role"] == UserRole.DOCTOR:
                doctor = await db.doctors.find_one({"user_id": user_id})
                if not doctor or str(doctor["_id"]) != prescription["doctor_id"]:
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")
        
        return {
            "id": str(prescription["_id"]),
            "medications": prescription["medications"],
            "instructions": prescription["instructions"],
            "diagnosis": prescription["diagnosis"],
            "created_at": prescription["created_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Rating and Reviews
class ReviewCreate(BaseModel):
    rating: int
    comment: str

@api_router.post("/doctors/{doctor_id}/review")
async def add_doctor_review(
    doctor_id: str,
    review: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can leave reviews")
    
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        
        # Check if patient has completed appointment with doctor
        appointment = await db.appointments.find_one({
            "patient_id": str(current_user["_id"]),
            "doctor_id": doctor_id,
            "status": "completed"
        })
        
        if not appointment:
            raise HTTPException(status_code=400, detail="You can only review doctors you've had appointments with")
        
        review_doc = {
            "doctor_id": doctor_id,
            "patient_id": str(current_user["_id"]),
            "patient_name": current_user["full_name"],
            "rating": review.rating,
            "comment": review.comment,
            "created_at": datetime.utcnow()
        }
        
        await db.reviews.insert_one(review_doc)
        
        # Update doctor rating
        all_reviews = await db.reviews.find({"doctor_id": doctor_id}).to_list(1000)
        avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
        
        await db.doctors.update_one(
            {"_id": ObjectId(doctor_id)},
            {"$set": {
                "rating": round(avg_rating, 1),
                "total_reviews": len(all_reviews)
            }}
        )
        
        return {"message": "Review added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/doctors/{doctor_id}/reviews")
async def get_doctor_reviews(doctor_id: str):
    reviews = await db.reviews.find({"doctor_id": doctor_id}).sort("created_at", -1).to_list(100)
    return [{
        "id": str(r["_id"]),
        "patient_name": r["patient_name"],
        "rating": r["rating"],
        "comment": r["comment"],
        "created_at": r["created_at"]
    } for r in reviews]

# Medical Records
class MedicalRecordCreate(BaseModel):
    title: str
    description: str
    record_type: str
    attachments: Optional[List[str]] = []

@api_router.post("/patients/medical-records")
async def add_medical_record(
    record: MedicalRecordCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can add medical records")
    
    user_id = str(current_user["_id"])
    patient = await db.patients.find_one({"user_id": user_id})
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    record_doc = {
        "title": record.title,
        "description": record.description,
        "record_type": record.record_type,
        "attachments": record.attachments,
        "created_at": datetime.utcnow()
    }
    
    await db.patients.update_one(
        {"user_id": user_id},
        {"$push": {"medical_history": record_doc}}
    )
    
    return {"message": "Medical record added successfully"}

class AccessCodeVerify(BaseModel):
    access_code: str

@api_router.post("/patients/{patient_id}/medical-records")
async def get_patient_medical_records(patient_id: str, access: AccessCodeVerify):
    patient = await db.patients.find_one({"user_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient["access_code"] != access.access_code:
        raise HTTPException(status_code=403, detail="Invalid access code")
    
    user = await db.users.find_one({"_id": ObjectId(patient_id)})
    
    return {
        "patient_name": user["full_name"],
        "blood_type": patient.get("blood_type"),
        "allergies": patient.get("allergies", []),
        "medical_history": patient.get("medical_history", [])
    }

# Pharmacy Orders
class PharmacyOrderCreate(BaseModel):
    pharmacy_id: str
    items: List[dict]
    delivery_address: str
    notes: Optional[str] = None

@api_router.post("/pharmacies/orders")
async def create_pharmacy_order(
    order: PharmacyOrderCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can place orders")
    
    # Calculate total
    total = sum(item.get("price", 0) * item.get("quantity", 1) for item in order.items)
    
    order_doc = {
        "pharmacy_id": order.pharmacy_id,
        "patient_id": str(current_user["_id"]),
        "patient_name": current_user["full_name"],
        "items": order.items,
        "total": total,
        "delivery_address": order.delivery_address,
        "notes": order.notes,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.pharmacy_orders.insert_one(order_doc)
    
    return {
        "message": "Order placed successfully",
        "order_id": str(result.inserted_id),
        "total": total
    }

@api_router.get("/pharmacies/my-orders")
async def get_pharmacy_orders(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacies can view orders")
    
    user_id = str(current_user["_id"])
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    
    if not pharmacy:
        return []
    
    orders = await db.pharmacy_orders.find({
        "pharmacy_id": str(pharmacy["_id"])
    }).sort("created_at", -1).to_list(100)
    
    return [{
        "id": str(o["_id"]),
        "patient_name": o["patient_name"],
        "items": o["items"],
        "total": o["total"],
        "status": o["status"],
        "delivery_address": o["delivery_address"],
        "created_at": o["created_at"]
    } for o in orders]

@api_router.get("/patients/my-orders")
async def get_patient_orders(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can view their orders")
    
    orders = await db.pharmacy_orders.find({
        "patient_id": str(current_user["_id"])
    }).sort("created_at", -1).to_list(100)
    
    result = []
    for o in orders:
        pharmacy = await db.pharmacies.find_one({"_id": ObjectId(o["pharmacy_id"])})
        result.append({
            "id": str(o["_id"]),
            "pharmacy_name": pharmacy.get("pharmacy_name", "Unknown") if pharmacy else "Unknown",
            "items": o["items"],
            "total": o["total"],
            "status": o["status"],
            "created_at": o["created_at"]
        })
    
    return result

@api_router.put("/pharmacies/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    update: dict,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacies can update order status")
    
    await db.pharmacy_orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": update["status"]}}
    )
    
    return {"message": "Order status updated"}

# Profile Management
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

@api_router.put("/users/profile")
async def update_profile(
    update: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}

class ProfilePictureUpdate(BaseModel):
    profile_picture: str  # base64

@api_router.put("/users/profile-picture")
async def update_profile_picture(
    update: ProfilePictureUpdate,
    current_user: dict = Depends(get_current_user)
):
    await db.users.update_one(
        {"_id": ObjectId(str(current_user["_id"]))},
        {"$set": {"profile_picture": update.profile_picture}}
    )
    
    return {"message": "Profile picture updated"}

# Pharmacies Listing
@api_router.get("/pharmacies/all")
async def get_all_pharmacies(location: Optional[str] = None):
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    pharmacies = await db.pharmacies.find(query).to_list(100)
    
    result = []
    for pharmacy in pharmacies:
        user = await db.users.find_one({"_id": ObjectId(pharmacy["user_id"])})
        if user:
            result.append({
                "id": str(pharmacy["_id"]),
                "pharmacy_name": pharmacy.get("pharmacy_name", user["full_name"]),
                "location": pharmacy.get("location", "Not specified"),
                "license_number": pharmacy.get("license_number", ""),
                "inventory_count": len(pharmacy.get("inventory", [])),
                "phone": user.get("phone", ""),
                "email": user.get("email", "")
            })
    
    return result

@api_router.get("/pharmacies/{pharmacy_id}/medicines")
async def get_pharmacy_medicines(pharmacy_id: str):
    try:
        pharmacy = await db.pharmacies.find_one({"_id": ObjectId(pharmacy_id)})
        if not pharmacy:
            raise HTTPException(status_code=404, detail="Pharmacy not found")
        
        user = await db.users.find_one({"_id": ObjectId(pharmacy["user_id"])})
        
        return {
            "pharmacy_name": pharmacy.get("pharmacy_name", user["full_name"] if user else "Unknown"),
            "location": pharmacy.get("location", "Not specified"),
            "phone": user.get("phone", "") if user else "",
            "inventory": pharmacy.get("inventory", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Ambulance Services Listing
@api_router.get("/ambulances/all")
async def get_all_ambulances(location: Optional[str] = None):
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    ambulances = await db.ambulances.find(query).to_list(100)
    
    result = []
    for ambulance in ambulances:
        user = await db.users.find_one({"_id": ObjectId(ambulance["user_id"])})
        if user:
            result.append({
                "id": str(ambulance["_id"]),
                "service_name": user["full_name"],
                "location": ambulance.get("location", "Not specified"),
                "vehicle_type": ambulance.get("vehicle_type", "Standard"),
                "service_areas": ambulance.get("service_areas", []),
                "availability_status": ambulance.get("availability_status", "available"),
                "phone": user.get("phone", ""),
                "email": user.get("email", "")
            })
    
    return result

# Pharmacies Listing
@api_router.get("/pharmacies/all")
async def get_all_pharmacies(location: Optional[str] = None):
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    pharmacies = await db.pharmacies.find(query).to_list(100)
    
    result = []
    for pharmacy in pharmacies:
        user = await db.users.find_one({"_id": ObjectId(pharmacy["user_id"])})
        if user:
            result.append({
                "id": str(pharmacy["_id"]),
                "pharmacy_name": pharmacy.get("pharmacy_name", user["full_name"]),
                "location": pharmacy.get("location", "Not specified"),
                "license_number": pharmacy.get("license_number", ""),
                "inventory_count": len(pharmacy.get("inventory", [])),
                "phone": user.get("phone", ""),
                "email": user.get("email", "")
            })
    
    return result

@api_router.get("/pharmacies/{pharmacy_id}/medicines")
async def get_pharmacy_medicines(pharmacy_id: str):
    try:
        pharmacy = await db.pharmacies.find_one({"_id": ObjectId(pharmacy_id)})
        if not pharmacy:
            raise HTTPException(status_code=404, detail="Pharmacy not found")
        
        user = await db.users.find_one({"_id": ObjectId(pharmacy["user_id"])})
        
        return {
            "pharmacy_name": pharmacy.get("pharmacy_name", user["full_name"] if user else "Unknown"),
            "location": pharmacy.get("location", "Not specified"),
            "phone": user.get("phone", "") if user else "",
            "inventory": pharmacy.get("inventory", [])
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Ambulance Services Listing
@api_router.get("/ambulances/all")
async def get_all_ambulances(location: Optional[str] = None):
    query = {}
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    ambulances = await db.ambulances.find(query).to_list(100)
    
    result = []
    for ambulance in ambulances:
        user = await db.users.find_one({"_id": ObjectId(ambulance["user_id"])})
        if user:
            result.append({
                "id": str(ambulance["_id"]),
                "service_name": user["full_name"],
                "location": ambulance.get("location", "Not specified"),
                "vehicle_type": ambulance.get("vehicle_type", "Standard"),
                "service_areas": ambulance.get("service_areas", []),
                "availability_status": ambulance.get("availability_status", "available"),
                "phone": user.get("phone", ""),
                "email": user.get("email", "")
            })
    
    return result

# Ambulance Bookings
class AmbulanceBookingCreate(BaseModel):
    ambulance_id: str
    pickup_location: str
    destination: str
    emergency_type: str
    patient_name: str
    patient_condition: str

@api_router.post("/ambulances/bookings")
async def create_ambulance_booking(
    booking: AmbulanceBookingCreate,
    current_user: dict = Depends(get_current_user)
):
    booking_doc = {
        "ambulance_id": booking.ambulance_id,
        "patient_user_id": str(current_user["_id"]),
        "pickup_location": booking.pickup_location,
        "destination": booking.destination,
        "emergency_type": booking.emergency_type,
        "patient_name": booking.patient_name,
        "patient_condition": booking.patient_condition,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.ambulance_bookings.insert_one(booking_doc)
    
    return {
        "message": "Ambulance booking created",
        "booking_id": str(result.inserted_id)
    }

@api_router.get("/ambulances/my-bookings")
async def get_ambulance_bookings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.AMBULANCE:
        raise HTTPException(status_code=403, detail="Only ambulance services can view bookings")
    
    user_id = str(current_user["_id"])
    ambulance = await db.ambulances.find_one({"user_id": user_id})
    
    if not ambulance:
        return []
    
    bookings = await db.ambulance_bookings.find({
        "ambulance_id": str(ambulance["_id"])
    }).sort("created_at", -1).to_list(100)
    
    return [{
        "id": str(b["_id"]),
        "pickup_location": b["pickup_location"],
        "destination": b["destination"],
        "emergency_type": b["emergency_type"],
        "patient_name": b["patient_name"],
        "patient_condition": b["patient_condition"],
        "status": b["status"],
        "created_at": b["created_at"]
    } for b in bookings]

# Enhanced Medical Records Management
@api_router.get("/patients/my-medical-records")
async def get_my_medical_records(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can view their medical records")
    
    user_id = str(current_user["_id"])
    patient = await db.patients.find_one({"user_id": user_id})
    
    if not patient:
        return {"medical_history": [], "allergies": [], "blood_type": None, "access_code": None}
    
    return {
        "medical_history": patient.get("medical_history", []),
        "allergies": patient.get("allergies", []),
        "blood_type": patient.get("blood_type"),
        "emergency_contact": patient.get("emergency_contact"),
        "access_code": patient.get("access_code")
    }

class AccessCodeUpdate(BaseModel):
    new_access_code: str

@api_router.put("/patients/access-code")
async def update_access_code(
    update: AccessCodeUpdate,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can update access code")
    
    user_id = str(current_user["_id"])
    await db.patients.update_one(
        {"user_id": user_id},
        {"$set": {"access_code": update.new_access_code}}
    )
    
    return {"message": "Access code updated successfully"}

# Payment System
class PaymentMethod(BaseModel):
    method_type: str  # mtn_momo, vodafone_cash, airteltigo
    phone_number: str
    account_name: str

class PaymentInitialize(BaseModel):
    amount: float
    payment_method: str
    phone_number: str
    purpose: str
    reference_id: str  # appointment_id or order_id

@api_router.post("/payments/initialize")
async def initialize_payment(
    payment: PaymentInitialize,
    current_user: dict = Depends(get_current_user)
):
    # Mock payment initialization
    payment_doc = {
        "user_id": str(current_user["_id"]),
        "amount": payment.amount,
        "payment_method": payment.payment_method,
        "phone_number": payment.phone_number,
        "purpose": payment.purpose,
        "reference_id": payment.reference_id,
        "status": "pending",
        "transaction_id": f"TXN{uuid.uuid4().hex[:12].upper()}",
        "created_at": datetime.utcnow()
    }
    
    result = await db.payments.insert_one(payment_doc)
    
    return {
        "message": "Payment initialized",
        "transaction_id": payment_doc["transaction_id"],
        "payment_id": str(result.inserted_id),
        "status": "pending"
    }

class PaymentVerify(BaseModel):
    transaction_id: str

@api_router.post("/payments/verify")
async def verify_payment(verify: PaymentVerify, current_user: dict = Depends(get_current_user)):
    payment = await db.payments.find_one({"transaction_id": verify.transaction_id})
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Mock verification - in production, call actual payment gateway
    await db.payments.update_one(
        {"transaction_id": verify.transaction_id},
        {"$set": {"status": "completed", "verified_at": datetime.utcnow()}}
    )
    
    return {
        "message": "Payment verified successfully",
        "status": "completed",
        "transaction_id": verify.transaction_id
    }

@api_router.get("/payments/history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({
        "user_id": str(current_user["_id"])
    }).sort("created_at", -1).to_list(100)
    
    return [{
        "id": str(p["_id"]),
        "amount": p["amount"],
        "payment_method": p["payment_method"],
        "purpose": p["purpose"],
        "status": p["status"],
        "transaction_id": p["transaction_id"],
        "created_at": p["created_at"]
    } for p in payments]

@api_router.post("/payments/methods")
async def add_payment_method(
    method: PaymentMethod,
    current_user: dict = Depends(get_current_user)
):
    method_doc = {
        "user_id": str(current_user["_id"]),
        "method_type": method.method_type,
        "phone_number": method.phone_number,
        "account_name": method.account_name,
        "is_default": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.payment_methods.insert_one(method_doc)
    
    return {
        "message": "Payment method added successfully",
        "method_id": str(result.inserted_id)
    }

@api_router.get("/payments/methods")
async def get_payment_methods(current_user: dict = Depends(get_current_user)):
    methods = await db.payment_methods.find({
        "user_id": str(current_user["_id"])
    }).to_list(100)
    
    return [{
        "id": str(m["_id"]),
        "method_type": m["method_type"],
        "phone_number": m["phone_number"],
        "account_name": m["account_name"],
        "is_default": m.get("is_default", False)
    } for m in methods]

# Notifications System
class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str  # appointment, payment, general
    user_id: str

@api_router.post("/notifications/send")
async def send_notification(notification: NotificationCreate):
    notification_doc = {
        "user_id": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "type": notification.type,
        "read": False,
        "created_at": datetime.utcnow()
    }
    
    result = await db.notifications.insert_one(notification_doc)
    
    return {
        "message": "Notification sent",
        "notification_id": str(result.inserted_id)
    }

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({
        "user_id": str(current_user["_id"])
    }).sort("created_at", -1).limit(50).to_list(50)
    
    unread_count = await db.notifications.count_documents({
        "user_id": str(current_user["_id"]),
        "read": False
    })
    
    return {
        "notifications": [{
            "id": str(n["_id"]),
            "title": n["title"],
            "message": n["message"],
            "type": n["type"],
            "read": n["read"],
            "created_at": n["created_at"]
        } for n in notifications],
        "unread_count": unread_count
    }

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])},
        {"$set": {"read": True}}
    )
    
    return {"message": "Notification marked as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.delete_one(
        {"_id": ObjectId(notification_id), "user_id": str(current_user["_id"])}
    )
    
    return {"message": "Notification deleted"}

# Help & Support System
class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    category: str  # technical, billing, medical, general

class SupportReply(BaseModel):
    message: str

@api_router.post("/support/tickets")
async def create_support_ticket(
    ticket: SupportTicketCreate,
    current_user: dict = Depends(get_current_user)
):
    ticket_doc = {
        "user_id": str(current_user["_id"]),
        "user_name": current_user["full_name"],
        "subject": ticket.subject,
        "category": ticket.category,
        "status": "open",
        "priority": "normal",
        "messages": [{
            "sender": "user",
            "message": ticket.message,
            "timestamp": datetime.utcnow()
        }],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.support_tickets.insert_one(ticket_doc)
    
    return {
        "message": "Support ticket created successfully",
        "ticket_id": str(result.inserted_id),
        "ticket_number": f"TICKET-{str(result.inserted_id)[-6:].upper()}"
    }

@api_router.get("/support/tickets")
async def get_support_tickets(current_user: dict = Depends(get_current_user)):
    tickets = await db.support_tickets.find({
        "user_id": str(current_user["_id"])
    }).sort("updated_at", -1).to_list(100)
    
    return [{
        "id": str(t["_id"]),
        "ticket_number": f"TICKET-{str(t['_id'])[-6:].upper()}",
        "subject": t["subject"],
        "category": t["category"],
        "status": t["status"],
        "priority": t.get("priority", "normal"),
        "created_at": t["created_at"],
        "updated_at": t["updated_at"],
        "message_count": len(t.get("messages", []))
    } for t in tickets]

@api_router.get("/support/tickets/{ticket_id}")
async def get_support_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    try:
        ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        if ticket["user_id"] != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return {
            "id": str(ticket["_id"]),
            "ticket_number": f"TICKET-{str(ticket['_id'])[-6:].upper()}",
            "subject": ticket["subject"],
            "category": ticket["category"],
            "status": ticket["status"],
            "priority": ticket.get("priority", "normal"),
            "messages": ticket.get("messages", []),
            "created_at": ticket["created_at"],
            "updated_at": ticket["updated_at"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/support/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    reply: SupportReply,
    current_user: dict = Depends(get_current_user)
):
    try:
        ticket = await db.support_tickets.find_one({"_id": ObjectId(ticket_id)})
        
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        if ticket["user_id"] != str(current_user["_id"]):
            raise HTTPException(status_code=403, detail="Not authorized")
        
        message_doc = {
            "sender": "user",
            "message": reply.message,
            "timestamp": datetime.utcnow()
        }
        
        await db.support_tickets.update_one(
            {"_id": ObjectId(ticket_id)},
            {
                "$push": {"messages": message_doc},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {"message": "Reply added successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/support/faq")
async def get_faqs():
    faqs = [
        {
            "id": "1",
            "category": "General",
            "question": "How do I book an appointment?",
            "answer": "Go to the Doctors tab, search for a doctor, select them, and click 'Book Appointment'. Choose your preferred date, time, and consultation type."
        },
        {
            "id": "2",
            "category": "Payments",
            "question": "What payment methods are accepted?",
            "answer": "We accept MTN Mobile Money, Vodafone Cash, and AirtelTigo Money for all payments including consultations and pharmacy orders."
        },
        {
            "id": "3",
            "category": "Medical Records",
            "question": "How do I access my medical records?",
            "answer": "Go to Profile > Medical Records. You'll need your access code to view sensitive information. You can share this code with healthcare providers."
        },
        {
            "id": "4",
            "category": "Consultations",
            "question": "How does video consultation work?",
            "answer": "After booking and payment, you'll receive a notification at your appointment time with a link to join the video call with your doctor."
        },
        {
            "id": "5",
            "category": "AI Diagnostics",
            "question": "Is AI diagnosis accurate?",
            "answer": "The AI symptom checker provides preliminary guidance only. It's not a replacement for professional medical diagnosis. Always consult with a licensed doctor."
        },
        {
            "id": "6",
            "category": "Pharmacy",
            "question": "How long does medicine delivery take?",
            "answer": "Delivery times vary by pharmacy and location, typically 1-3 business days. Check with your chosen pharmacy for exact delivery times."
        }
    ]
    
    return {"faqs": faqs}

# ====================================
# PHARMACY E-COMMERCE SYSTEM
# ====================================

# Pydantic Models for Pharmacy Products
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str  # e.g., "Antibiotics", "Pain Relief", "Vitamins"
    requires_prescription: bool = False
    stock_quantity: int
    image_base64: Optional[str] = None
    manufacturer: Optional[str] = None
    dosage_form: Optional[str] = None  # e.g., "Tablet", "Syrup", "Injection"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    requires_prescription: Optional[bool] = None
    stock_quantity: Optional[int] = None
    image_base64: Optional[str] = None
    manufacturer: Optional[str] = None
    dosage_form: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class AddToCart(BaseModel):
    product_id: str
    quantity: int = 1

class OrderCreate(BaseModel):
    pharmacy_id: str
    items: List[CartItem]
    delivery_address: str
    delivery_city: str
    delivery_phone: str
    prescription_image: Optional[str] = None  # base64 for prescription medicines
    payment_method: str  # "mtn", "vodafone", "airteltigo"
    payment_phone: str

# Product Management APIs (Pharmacy Owners)
@api_router.post("/products")
async def create_product(
    product: ProductCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can add products")
    
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy profile not found")
    
    product_doc = {
        "pharmacy_id": str(pharmacy["_id"]),
        "pharmacy_name": pharmacy.get("pharmacy_name", user["full_name"]),
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "requires_prescription": product.requires_prescription,
        "stock_quantity": product.stock_quantity,
        "image_base64": product.image_base64,
        "manufacturer": product.manufacturer,
        "dosage_form": product.dosage_form,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.products.insert_one(product_doc)
    return {"message": "Product created successfully", "product_id": str(result.inserted_id)}

@api_router.get("/products")
async def list_products(
    pharmacy_id: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    
    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"manufacturer": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query).to_list(100)
    
    result = []
    for product in products:
        result.append({
            "id": str(product["_id"]),
            "pharmacy_id": product["pharmacy_id"],
            "pharmacy_name": product.get("pharmacy_name", ""),
            "name": product["name"],
            "description": product["description"],
            "price": product["price"],
            "category": product["category"],
            "requires_prescription": product.get("requires_prescription", False),
            "stock_quantity": product["stock_quantity"],
            "image_base64": product.get("image_base64"),
            "manufacturer": product.get("manufacturer"),
            "dosage_form": product.get("dosage_form"),
            "in_stock": product["stock_quantity"] > 0
        })
    
    return result

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    try:
        product = await db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {
            "id": str(product["_id"]),
            "pharmacy_id": product["pharmacy_id"],
            "pharmacy_name": product.get("pharmacy_name", ""),
            "name": product["name"],
            "description": product["description"],
            "price": product["price"],
            "category": product["category"],
            "requires_prescription": product.get("requires_prescription", False),
            "stock_quantity": product["stock_quantity"],
            "image_base64": product.get("image_base64"),
            "manufacturer": product.get("manufacturer"),
            "dosage_form": product.get("dosage_form"),
            "in_stock": product["stock_quantity"] > 0
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product_update: ProductUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can update products")
    
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    
    if not product or product["pharmacy_id"] != str(pharmacy["_id"]):
        raise HTTPException(status_code=404, detail="Product not found or unauthorized")
    
    update_data = {k: v for k, v in product_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_data})
    return {"message": "Product updated successfully"}

@api_router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can delete products")
    
    pharmacy = await db.pharmacies.find_one({"user_id": user_id})
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    
    if not product or product["pharmacy_id"] != str(pharmacy["_id"]):
        raise HTTPException(status_code=404, detail="Product not found or unauthorized")
    
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"message": "Product deleted successfully"}

# Shopping Cart APIs
@api_router.post("/cart/add")
async def add_to_cart(
    item: AddToCart,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    # Verify product exists and has stock
    product = await db.products.find_one({"_id": ObjectId(item.product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["stock_quantity"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    # Check if cart exists for user
    cart = await db.carts.find_one({"user_id": user_id})
    
    if not cart:
        # Create new cart
        cart_doc = {
            "user_id": user_id,
            "items": [{
                "product_id": item.product_id,
                "quantity": item.quantity,
                "added_at": datetime.utcnow()
            }],
            "updated_at": datetime.utcnow()
        }
        await db.carts.insert_one(cart_doc)
    else:
        # Update existing cart
        item_exists = False
        for cart_item in cart["items"]:
            if cart_item["product_id"] == item.product_id:
                cart_item["quantity"] += item.quantity
                item_exists = True
                break
        
        if not item_exists:
            cart["items"].append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "added_at": datetime.utcnow()
            })
        
        await db.carts.update_one(
            {"user_id": user_id},
            {"$set": {"items": cart["items"], "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Item added to cart successfully"}

@api_router.get("/cart")
async def get_cart(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(credentials.credentials)
    
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        return {"items": [], "total": 0}
    
    # Populate cart with product details
    cart_items = []
    total = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"_id": ObjectId(item["product_id"])})
        if product:
            item_total = product["price"] * item["quantity"]
            total += item_total
            
            cart_items.append({
                "product_id": str(product["_id"]),
                "name": product["name"],
                "price": product["price"],
                "quantity": item["quantity"],
                "image_base64": product.get("image_base64"),
                "pharmacy_name": product.get("pharmacy_name", ""),
                "requires_prescription": product.get("requires_prescription", False),
                "in_stock": product["stock_quantity"] >= item["quantity"],
                "item_total": item_total
            })
    
    return {"items": cart_items, "total": total}

@api_router.delete("/cart/item/{product_id}")
async def remove_from_cart(
    product_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart["items"] = [item for item in cart["items"] if item["product_id"] != product_id]
    
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": cart["items"], "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.put("/cart/item/{product_id}")
async def update_cart_quantity(
    product_id: str,
    quantity: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    if quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")
    
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product or product["stock_quantity"] < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    for item in cart["items"]:
        if item["product_id"] == product_id:
            item["quantity"] = quantity
            break
    
    await db.carts.update_one(
        {"user_id": user_id},
        {"$set": {"items": cart["items"], "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Cart updated successfully"}

# Order Management APIs
@api_router.post("/orders")
async def create_order(
    order: OrderCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Verify stock availability
    total_amount = 0
    order_items = []
    
    for item in order.items:
        product = await db.products.find_one({"_id": ObjectId(item.product_id)})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if product["stock_quantity"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        item_total = product["price"] * item.quantity
        total_amount += item_total
        
        order_items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "requires_prescription": product.get("requires_prescription", False),
            "item_total": item_total
        })
    
    # Create order
    order_doc = {
        "user_id": user_id,
        "customer_name": user["full_name"],
        "customer_email": user["email"],
        "customer_phone": user["phone"],
        "pharmacy_id": order.pharmacy_id,
        "items": order_items,
        "total_amount": total_amount,
        "delivery_address": order.delivery_address,
        "delivery_city": order.delivery_city,
        "delivery_phone": order.delivery_phone,
        "prescription_image": order.prescription_image,
        "payment_method": order.payment_method,
        "payment_phone": order.payment_phone,
        "payment_status": "pending",
        "order_status": "pending",  # pending, confirmed, processing, shipped, delivered, cancelled
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)
    
    # Reduce stock quantities
    for item in order.items:
        await db.products.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock_quantity": -item.quantity}}
        )
    
    # Clear cart
    await db.carts.delete_one({"user_id": user_id})
    
    # Mock payment processing
    payment_reference = f"PAY-{order_id[:8]}-{datetime.utcnow().timestamp()}"
    
    await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {
            "payment_status": "completed",
            "payment_reference": payment_reference,
            "payment_completed_at": datetime.utcnow(),
            "order_status": "confirmed"
        }}
    )
    
    return {
        "message": "Order placed successfully",
        "order_id": order_id,
        "payment_reference": payment_reference,
        "total_amount": total_amount,
        "payment_status": "completed"
    }

@api_router.get("/orders/my-orders")
async def get_my_orders(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(credentials.credentials)
    
    orders = await db.orders.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "order_status": order["order_status"],
            "payment_status": order["payment_status"],
            "total_amount": order["total_amount"],
            "items_count": len(order["items"]),
            "delivery_address": order["delivery_address"],
            "payment_method": order["payment_method"],
            "payment_reference": order.get("payment_reference", ""),
            "created_at": order["created_at"].isoformat(),
            "items": order["items"]
        })
    
    return result

@api_router.get("/orders/{order_id}")
async def get_order_details(
    order_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        return {
            "id": str(order["_id"]),
            "order_status": order["order_status"],
            "payment_status": order["payment_status"],
            "total_amount": order["total_amount"],
            "delivery_address": order["delivery_address"],
            "delivery_city": order["delivery_city"],
            "delivery_phone": order["delivery_phone"],
            "payment_method": order["payment_method"],
            "payment_phone": order["payment_phone"],
            "payment_reference": order.get("payment_reference", ""),
            "created_at": order["created_at"].isoformat(),
            "items": order["items"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ====================================
# AMBULANCE BOOKING SYSTEM
# ====================================

class AmbulanceBooking(BaseModel):
    ambulance_id: str
    booking_type: str  # "immediate" or "scheduled"
    scheduled_datetime: Optional[str] = None  # ISO format for scheduled bookings
    pickup_address: str
    pickup_latitude: Optional[float] = None
    pickup_longitude: Optional[float] = None
    destination_address: str
    destination_latitude: Optional[float] = None
    destination_longitude: Optional[float] = None
    emergency_type: str  # e.g., "accident", "cardiac", "respiratory", "other"
    patient_condition: str
    patient_name: str
    patient_phone: str
    additional_notes: Optional[str] = None

@api_router.post("/ambulance/book")
async def book_ambulance(
    booking: AmbulanceBooking,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Verify ambulance exists
    ambulance = await db.ambulances.find_one({"_id": ObjectId(booking.ambulance_id)})
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance service not found")
    
    ambulance_user = await db.users.find_one({"_id": ObjectId(ambulance["user_id"])})
    
    # Calculate distance-based pricing (mock calculation: GH₵5 per km + base fare GH₵50)
    # In real implementation, use Google Maps Distance Matrix API
    base_fare = 50.0
    estimated_distance_km = 10.0  # Mock distance
    price_per_km = 5.0
    total_price = base_fare + (estimated_distance_km * price_per_km)
    
    # Create booking
    booking_doc = {
        "user_id": user_id,
        "patient_name": booking.patient_name,
        "patient_phone": booking.patient_phone,
        "ambulance_id": booking.ambulance_id,
        "service_name": ambulance_user["full_name"],
        "service_phone": ambulance_user["phone"],
        "booking_type": booking.booking_type,
        "scheduled_datetime": booking.scheduled_datetime,
        "pickup_address": booking.pickup_address,
        "pickup_latitude": booking.pickup_latitude,
        "pickup_longitude": booking.pickup_longitude,
        "destination_address": booking.destination_address,
        "destination_latitude": booking.destination_latitude,
        "destination_longitude": booking.destination_longitude,
        "emergency_type": booking.emergency_type,
        "patient_condition": booking.patient_condition,
        "additional_notes": booking.additional_notes,
        "estimated_distance_km": estimated_distance_km,
        "base_fare": base_fare,
        "price_per_km": price_per_km,
        "total_price": total_price,
        "booking_status": "confirmed",  # confirmed, en_route, arrived, completed, cancelled
        "payment_status": "pending",
        "driver_name": "Mock Driver",  # In real implementation, assign actual driver
        "driver_phone": "+233501234567",
        "vehicle_number": "GH-123-ABC",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.ambulance_bookings.insert_one(booking_doc)
    booking_id = str(result.inserted_id)
    
    return {
        "message": "Ambulance booked successfully",
        "booking_id": booking_id,
        "service_name": ambulance_user["full_name"],
        "service_phone": ambulance_user["phone"],
        "driver_name": "Mock Driver",
        "driver_phone": "+233501234567",
        "vehicle_number": "GH-123-ABC",
        "estimated_distance_km": estimated_distance_km,
        "total_price": total_price,
        "booking_status": "confirmed"
    }

@api_router.get("/ambulance/bookings")
async def get_my_ambulance_bookings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(credentials.credentials)
    
    bookings = await db.ambulance_bookings.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    
    result = []
    for booking in bookings:
        result.append({
            "id": str(booking["_id"]),
            "service_name": booking["service_name"],
            "booking_type": booking["booking_type"],
            "booking_status": booking["booking_status"],
            "pickup_address": booking["pickup_address"],
            "destination_address": booking["destination_address"],
            "emergency_type": booking["emergency_type"],
            "total_price": booking["total_price"],
            "driver_name": booking.get("driver_name", ""),
            "driver_phone": booking.get("driver_phone", ""),
            "vehicle_number": booking.get("vehicle_number", ""),
            "created_at": booking["created_at"].isoformat()
        })
    
    return result

@api_router.get("/ambulance/bookings/{booking_id}")
async def get_ambulance_booking_details(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        booking = await db.ambulance_bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        return {
            "id": str(booking["_id"]),
            "service_name": booking["service_name"],
            "service_phone": booking["service_phone"],
            "booking_type": booking["booking_type"],
            "scheduled_datetime": booking.get("scheduled_datetime"),
            "booking_status": booking["booking_status"],
            "payment_status": booking["payment_status"],
            "pickup_address": booking["pickup_address"],
            "pickup_latitude": booking.get("pickup_latitude"),
            "pickup_longitude": booking.get("pickup_longitude"),
            "destination_address": booking["destination_address"],
            "destination_latitude": booking.get("destination_latitude"),
            "destination_longitude": booking.get("destination_longitude"),
            "emergency_type": booking["emergency_type"],
            "patient_condition": booking["patient_condition"],
            "patient_name": booking["patient_name"],
            "patient_phone": booking["patient_phone"],
            "additional_notes": booking.get("additional_notes"),
            "estimated_distance_km": booking["estimated_distance_km"],
            "base_fare": booking["base_fare"],
            "price_per_km": booking["price_per_km"],
            "total_price": booking["total_price"],
            "driver_name": booking.get("driver_name", ""),
            "driver_phone": booking.get("driver_phone", ""),
            "vehicle_number": booking.get("vehicle_number", ""),
            "created_at": booking["created_at"].isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/ambulance/track/{booking_id}")
async def track_ambulance(
    booking_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        booking = await db.ambulance_bookings.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        if booking["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Mock live tracking data
        # In real implementation, use GPS tracking from driver's device
        mock_current_location = {
            "latitude": 5.6037 + (0.01 if booking.get("pickup_latitude") else 0),
            "longitude": -0.1870 + (0.01 if booking.get("pickup_longitude") else 0)
        }
        
        return {
            "booking_id": str(booking["_id"]),
            "booking_status": booking["booking_status"],
            "driver_name": booking.get("driver_name", ""),
            "driver_phone": booking.get("driver_phone", ""),
            "vehicle_number": booking.get("vehicle_number", ""),
            "current_location": mock_current_location,
            "estimated_arrival_minutes": 15,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ====================================
# VIDEO CONSULTATION SYSTEM
# ====================================

class ConsultationSchedule(BaseModel):
    doctor_id: str
    scheduled_datetime: str  # ISO format
    consultation_type: str  # "video" or "audio"
    reason: str
    symptoms: Optional[str] = None

@api_router.post("/consultations/schedule")
async def schedule_consultation(
    schedule: ConsultationSchedule,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Verify doctor exists
    doctor = await db.doctors.find_one({"_id": ObjectId(schedule.doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor_user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
    
    # Create consultation appointment
    consultation_doc = {
        "patient_id": user_id,
        "patient_name": user["full_name"],
        "patient_email": user["email"],
        "patient_phone": user["phone"],
        "doctor_id": schedule.doctor_id,
        "doctor_name": doctor_user["full_name"],
        "doctor_specialty": doctor["specialty"],
        "scheduled_datetime": schedule.scheduled_datetime,
        "consultation_type": schedule.consultation_type,
        "reason": schedule.reason,
        "symptoms": schedule.symptoms,
        "status": "scheduled",  # scheduled, in_progress, completed, cancelled
        "consultation_fee": doctor.get("consultation_fee", 100.0),
        "payment_status": "pending",
        "room_id": f"room-{uuid.uuid4().hex[:12]}",  # Mock room ID for Agora
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.consultations.insert_one(consultation_doc)
    consultation_id = str(result.inserted_id)
    
    return {
        "message": "Consultation scheduled successfully",
        "consultation_id": consultation_id,
        "doctor_name": doctor_user["full_name"],
        "scheduled_datetime": schedule.scheduled_datetime,
        "consultation_fee": doctor.get("consultation_fee", 100.0),
        "room_id": consultation_doc["room_id"]
    }

@api_router.get("/consultations/my-consultations")
async def get_my_consultations(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user_id = verify_token(credentials.credentials)
    
    consultations = await db.consultations.find({"patient_id": user_id}).sort("scheduled_datetime", -1).to_list(100)
    
    result = []
    for consultation in consultations:
        result.append({
            "id": str(consultation["_id"]),
            "doctor_name": consultation["doctor_name"],
            "doctor_specialty": consultation["doctor_specialty"],
            "scheduled_datetime": consultation["scheduled_datetime"],
            "consultation_type": consultation["consultation_type"],
            "status": consultation["status"],
            "reason": consultation["reason"],
            "consultation_fee": consultation["consultation_fee"],
            "payment_status": consultation["payment_status"],
            "room_id": consultation["room_id"]
        })
    
    return result

@api_router.get("/consultations/{consultation_id}")
async def get_consultation_details(
    consultation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        if consultation["patient_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        return {
            "id": str(consultation["_id"]),
            "patient_name": consultation["patient_name"],
            "doctor_name": consultation["doctor_name"],
            "doctor_specialty": consultation["doctor_specialty"],
            "scheduled_datetime": consultation["scheduled_datetime"],
            "consultation_type": consultation["consultation_type"],
            "status": consultation["status"],
            "reason": consultation["reason"],
            "symptoms": consultation.get("symptoms"),
            "consultation_fee": consultation["consultation_fee"],
            "payment_status": consultation["payment_status"],
            "room_id": consultation["room_id"],
            "created_at": consultation["created_at"].isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/consultations/{consultation_id}/join")
async def join_consultation(
    consultation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        if consultation["patient_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Update status to in_progress
        await db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {"$set": {"status": "in_progress", "updated_at": datetime.utcnow()}}
        )
        
        # Mock Agora token generation
        # In real implementation, generate actual Agora token using App ID and Certificate
        mock_agora_token = f"mock-token-{uuid.uuid4().hex[:16]}"
        
        return {
            "room_id": consultation["room_id"],
            "agora_token": mock_agora_token,
            "agora_app_id": "mock-app-id",  # In real implementation, use actual Agora App ID
            "doctor_name": consultation["doctor_name"],
            "consultation_type": consultation["consultation_type"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/consultations/{consultation_id}/end")
async def end_consultation(
    consultation_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    try:
        consultation = await db.consultations.find_one({"_id": ObjectId(consultation_id)})
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        if consultation["patient_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")
        
        # Update status to completed
        await db.consultations.update_one(
            {"_id": ObjectId(consultation_id)},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {"message": "Consultation ended successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ====================================
# ADMIN DASHBOARD APIS
# ====================================

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

def verify_admin(credentials: HTTPAuthorizationCredentials):
    """Verify that the user is an admin"""
    user_id = verify_token(credentials.credentials)
    return user_id

# Admin Authentication
@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    user = await db.users.find_one({"email": request.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied. Admin only.")
    
    token = create_access_token({"sub": str(user["_id"])})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

# Dashboard Statistics
@api_router.get("/admin/dashboard/stats")
async def get_dashboard_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get counts
    total_users = await db.users.count_documents({})
    total_patients = await db.users.count_documents({"role": UserRole.PATIENT})
    total_doctors = await db.users.count_documents({"role": UserRole.DOCTOR})
    total_pharmacies = await db.users.count_documents({"role": UserRole.PHARMACY})
    total_ambulances = await db.users.count_documents({"role": UserRole.AMBULANCE})
    
    total_orders = await db.orders.count_documents({})
    total_bookings = await db.ambulance_bookings.count_documents({})
    total_consultations = await db.consultations.count_documents({})
    total_appointments = await db.appointments.count_documents({})
    
    # Revenue calculations
    orders_revenue = 0
    async for order in db.orders.find({"payment_status": "completed"}):
        orders_revenue += order.get("total_amount", 0)
    
    bookings_revenue = 0
    async for booking in db.ambulance_bookings.find({}):
        bookings_revenue += booking.get("total_price", 0)
    
    consultations_revenue = 0
    async for consultation in db.consultations.find({"payment_status": "completed"}):
        consultations_revenue += consultation.get("consultation_fee", 0)
    
    total_revenue = orders_revenue + bookings_revenue + consultations_revenue
    
    # Recent activities
    recent_users = await db.users.find({}).sort("created_at", -1).limit(5).to_list(5)
    recent_orders = await db.orders.find({}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "users": {
            "total": total_users,
            "patients": total_patients,
            "doctors": total_doctors,
            "pharmacies": total_pharmacies,
            "ambulances": total_ambulances
        },
        "transactions": {
            "orders": total_orders,
            "bookings": total_bookings,
            "consultations": total_consultations,
            "appointments": total_appointments
        },
        "revenue": {
            "total": total_revenue,
            "orders": orders_revenue,
            "bookings": bookings_revenue,
            "consultations": consultations_revenue
        },
        "recent_users": [
            {
                "id": str(u["_id"]),
                "full_name": u["full_name"],
                "email": u["email"],
                "role": u["role"],
                "created_at": u["created_at"].isoformat()
            } for u in recent_users
        ],
        "recent_orders": [
            {
                "id": str(o["_id"]),
                "customer_name": o.get("customer_name", ""),
                "total_amount": o.get("total_amount", 0),
                "order_status": o.get("order_status", ""),
                "created_at": o["created_at"].isoformat()
            } for o in recent_orders
        ]
    }

# User Management
@api_router.get("/admin/users")
async def get_all_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    
    users = await db.users.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for user in users:
        result.append({
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "phone": user["phone"],
            "role": user["role"],
            "status": user.get("status", "active"),
            "created_at": user["created_at"].isoformat()
        })
    
    return result

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if status not in ["active", "disabled", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User status updated to {status}"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Orders Management
@api_router.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["order_status"] = status
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for order in orders:
        result.append({
            "id": str(order["_id"]),
            "customer_name": order.get("customer_name", ""),
            "customer_email": order.get("customer_email", ""),
            "total_amount": order.get("total_amount", 0),
            "order_status": order.get("order_status", ""),
            "payment_status": order.get("payment_status", ""),
            "payment_method": order.get("payment_method", ""),
            "items_count": len(order.get("items", [])),
            "created_at": order["created_at"].isoformat()
        })
    
    return result

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    order_status: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if order_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"order_status": order_status, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": f"Order status updated to {order_status}"}

# Bookings Management
@api_router.get("/admin/bookings")
async def get_all_bookings(
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["booking_status"] = status
    
    bookings = await db.ambulance_bookings.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for booking in bookings:
        result.append({
            "id": str(booking["_id"]),
            "patient_name": booking.get("patient_name", ""),
            "service_name": booking.get("service_name", ""),
            "booking_type": booking.get("booking_type", ""),
            "booking_status": booking.get("booking_status", ""),
            "emergency_type": booking.get("emergency_type", ""),
            "total_price": booking.get("total_price", 0),
            "pickup_address": booking.get("pickup_address", ""),
            "destination_address": booking.get("destination_address", ""),
            "created_at": booking["created_at"].isoformat()
        })
    
    return result

# Consultations Management
@api_router.get("/admin/consultations")
async def get_all_consultations(
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    consultations = await db.consultations.find(query).sort("scheduled_datetime", -1).to_list(200)
    
    result = []
    for consultation in consultations:
        result.append({
            "id": str(consultation["_id"]),
            "patient_name": consultation.get("patient_name", ""),
            "doctor_name": consultation.get("doctor_name", ""),
            "scheduled_datetime": consultation.get("scheduled_datetime", ""),
            "consultation_type": consultation.get("consultation_type", ""),
            "status": consultation.get("status", ""),
            "consultation_fee": consultation.get("consultation_fee", 0),
            "payment_status": consultation.get("payment_status", ""),
            "created_at": consultation["created_at"].isoformat()
        })
    
    return result

# System Settings
@api_router.get("/admin/settings")
async def get_settings(credentials: HTTPAuthorizationCredentials = Depends(security)):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.settings.find_one({"type": "system"})
    
    if not settings:
        # Create default settings
        default_settings = {
            "type": "system",
            "ambulance_base_fare": 50.0,
            "ambulance_price_per_km": 5.0,
            "enable_pharmacy": True,
            "enable_ambulance": True,
            "enable_consultations": True,
            "enable_ai_diagnostics": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await db.settings.insert_one(default_settings)
        settings = await db.settings.find_one({"_id": result.inserted_id})
    
    return {
        "ambulance_base_fare": settings.get("ambulance_base_fare", 50.0),
        "ambulance_price_per_km": settings.get("ambulance_price_per_km", 5.0),
        "enable_pharmacy": settings.get("enable_pharmacy", True),
        "enable_ambulance": settings.get("enable_ambulance", True),
        "enable_consultations": settings.get("enable_consultations", True),
        "enable_ai_diagnostics": settings.get("enable_ai_diagnostics", True)
    }

@api_router.put("/admin/settings")
async def update_settings(
    settings_update: dict,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    admin_id = verify_admin(credentials)
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    
    if admin.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings_update["updated_at"] = datetime.utcnow()
    
    await db.settings.update_one(
        {"type": "system"},
        {"$set": settings_update},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

# Create Default Admin Account
@api_router.post("/admin/create-default")
async def create_default_admin():
    # Check if admin already exists
    existing_admin = await db.users.find_one({"role": UserRole.ADMIN})
    if existing_admin:
        return {"message": "Admin account already exists"}
    
    # Create default admin
    hashed_password = get_password_hash("Admin@123")
    admin_doc = {
        "email": "admin@glenxmedhub.com",
        "phone": "+233200000000",
        "national_id": "ADMIN001",
        "hashed_password": hashed_password,
        "full_name": "System Administrator",
        "role": UserRole.ADMIN,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(admin_doc)
    
    return {
        "message": "Default admin account created",
        "email": "admin@glenxmedhub.com",
        "password": "Admin@123",
        "admin_id": str(result.inserted_id)
    }

# ====================================
# PROMOTIONAL DEALS & ADVERTISEMENTS
# ====================================

class PromotionCreate(BaseModel):
    title: str
    description: str
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    promotional_text: str
    image_base64: Optional[str] = None
    terms_conditions: Optional[str] = None
    start_date: str  # ISO format
    end_date: str  # ISO format
    category: str  # "pharmacy", "hospital", "ambulance", "consultation", "general"
    is_featured: bool = False

class PromotionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    promotional_text: Optional[str] = None
    image_base64: Optional[str] = None
    terms_conditions: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None

# Create Promotion (Service Providers Only)
@api_router.post("/promotions")
async def create_promotion(
    promotion: PromotionCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    # Only service providers can create promotions
    allowed_roles = [UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.AMBULANCE, UserRole.HERBALIST, UserRole.DOCTOR]
    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Only service providers can create promotions")
    
    promotion_doc = {
        "provider_id": user_id,
        "provider_name": user["full_name"],
        "provider_role": user["role"],
        "title": promotion.title,
        "description": promotion.description,
        "discount_percentage": promotion.discount_percentage,
        "discount_amount": promotion.discount_amount,
        "promotional_text": promotion.promotional_text,
        "image_base64": promotion.image_base64,
        "terms_conditions": promotion.terms_conditions,
        "start_date": promotion.start_date,
        "end_date": promotion.end_date,
        "category": promotion.category,
        "is_active": True,
        "is_featured": promotion.is_featured,
        "views_count": 0,
        "clicks_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.promotions.insert_one(promotion_doc)
    
    return {
        "message": "Promotion created successfully",
        "promotion_id": str(result.inserted_id)
    }

# Get Active Promotions (Public - for Patient Dashboard)
@api_router.get("/promotions/active")
async def get_active_promotions(
    category: Optional[str] = None,
    featured_only: bool = False
):
    now = datetime.utcnow()
    
    query = {
        "is_active": True,
        "start_date": {"$lte": now.isoformat()},
        "end_date": {"$gte": now.isoformat()}
    }
    
    if category:
        query["category"] = category
    
    if featured_only:
        query["is_featured"] = True
    
    promotions = await db.promotions.find(query).sort("created_at", -1).to_list(50)
    
    result = []
    for promo in promotions:
        result.append({
            "id": str(promo["_id"]),
            "provider_id": promo["provider_id"],
            "provider_name": promo["provider_name"],
            "provider_role": promo["provider_role"],
            "title": promo["title"],
            "description": promo["description"],
            "discount_percentage": promo.get("discount_percentage"),
            "discount_amount": promo.get("discount_amount"),
            "promotional_text": promo["promotional_text"],
            "image_base64": promo.get("image_base64"),
            "category": promo["category"],
            "is_featured": promo.get("is_featured", False),
            "views_count": promo.get("views_count", 0),
            "start_date": promo["start_date"],
            "end_date": promo["end_date"]
        })
    
    return result

# Get My Promotions (Service Provider)
@api_router.get("/promotions/my-promotions")
async def get_my_promotions(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    promotions = await db.promotions.find({"provider_id": user_id}).sort("created_at", -1).to_list(100)
    
    result = []
    for promo in promotions:
        result.append({
            "id": str(promo["_id"]),
            "title": promo["title"],
            "description": promo["description"],
            "discount_percentage": promo.get("discount_percentage"),
            "discount_amount": promo.get("discount_amount"),
            "promotional_text": promo["promotional_text"],
            "category": promo["category"],
            "is_active": promo["is_active"],
            "is_featured": promo.get("is_featured", False),
            "views_count": promo.get("views_count", 0),
            "clicks_count": promo.get("clicks_count", 0),
            "start_date": promo["start_date"],
            "end_date": promo["end_date"],
            "created_at": promo["created_at"].isoformat()
        })
    
    return result

# Get Promotion Details
@api_router.get("/promotions/{promotion_id}")
async def get_promotion_details(promotion_id: str):
    try:
        promo = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
        if not promo:
            raise HTTPException(status_code=404, detail="Promotion not found")
        
        # Increment views count
        await db.promotions.update_one(
            {"_id": ObjectId(promotion_id)},
            {"$inc": {"views_count": 1}}
        )
        
        return {
            "id": str(promo["_id"]),
            "provider_id": promo["provider_id"],
            "provider_name": promo["provider_name"],
            "provider_role": promo["provider_role"],
            "title": promo["title"],
            "description": promo["description"],
            "discount_percentage": promo.get("discount_percentage"),
            "discount_amount": promo.get("discount_amount"),
            "promotional_text": promo["promotional_text"],
            "image_base64": promo.get("image_base64"),
            "terms_conditions": promo.get("terms_conditions"),
            "category": promo["category"],
            "is_featured": promo.get("is_featured", False),
            "views_count": promo.get("views_count", 0),
            "clicks_count": promo.get("clicks_count", 0),
            "start_date": promo["start_date"],
            "end_date": promo["end_date"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Update Promotion
@api_router.put("/promotions/{promotion_id}")
async def update_promotion(
    promotion_id: str,
    promotion_update: PromotionUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    promo = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    if promo["provider_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    update_data = {k: v for k, v in promotion_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.promotions.update_one(
        {"_id": ObjectId(promotion_id)},
        {"$set": update_data}
    )
    
    return {"message": "Promotion updated successfully"}

# Delete Promotion
@api_router.delete("/promotions/{promotion_id}")
async def delete_promotion(
    promotion_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    
    promo = await db.promotions.find_one({"_id": ObjectId(promotion_id)})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    if promo["provider_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.promotions.delete_one({"_id": ObjectId(promotion_id)})
    
    return {"message": "Promotion deleted successfully"}

# Track Promotion Click
@api_router.post("/promotions/{promotion_id}/click")
async def track_promotion_click(promotion_id: str):
    try:
        await db.promotions.update_one(
            {"_id": ObjectId(promotion_id)},
            {"$inc": {"clicks_count": 1}}
        )
        return {"message": "Click tracked"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ====================================
# HOSPITAL MANAGEMENT SYSTEM
# ====================================

# Pydantic Models for Hospital Management
class DepartmentCreate(BaseModel):
    name: str
    description: str
    head_doctor: Optional[str] = None
    contact_phone: str
    services: List[str]

class BedCreate(BaseModel):
    room_number: str
    bed_number: str
    department: str
    bed_type: str  # "general", "icu", "private", "vip"
    price_per_day: float

class PatientAdmission(BaseModel):
    patient_id: str
    admission_type: str  # "emergency", "scheduled", "transfer"
    department: str
    assigned_doctor: str
    diagnosis: str
    symptoms: str
    bed_id: Optional[str] = None
    emergency_contact_name: str
    emergency_contact_phone: str

class PatientDischarge(BaseModel):
    discharge_summary: str
    follow_up_instructions: str
    prescribed_medications: List[dict]
    next_appointment_date: Optional[str] = None

class HospitalServiceCreate(BaseModel):
    service_name: str
    department: str
    description: str
    price: float
    duration_minutes: int

# Hospital Dashboard Statistics
@api_router.get("/hospital/dashboard/stats")
async def get_hospital_dashboard_stats(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can access this")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital profile not found")
    
    hospital_id = str(hospital["_id"])
    
    # Get statistics
    total_departments = await db.hospital_departments.count_documents({"hospital_id": hospital_id})
    total_staff = await db.hospital_staff.count_documents({"hospital_id": hospital_id})
    total_beds = await db.hospital_beds.count_documents({"hospital_id": hospital_id})
    occupied_beds = await db.hospital_beds.count_documents({"hospital_id": hospital_id, "status": "occupied"})
    available_beds = total_beds - occupied_beds
    
    active_admissions = await db.patient_admissions.count_documents({
        "hospital_id": hospital_id,
        "status": "active"
    })
    
    today_admissions = await db.patient_admissions.count_documents({
        "hospital_id": hospital_id,
        "created_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0)}
    })
    
    # Revenue calculation
    total_revenue = 0
    async for bill in db.hospital_bills.find({"hospital_id": hospital_id, "payment_status": "paid"}):
        total_revenue += bill.get("total_amount", 0)
    
    return {
        "hospital_name": hospital.get("hospital_name", user["full_name"]),
        "departments": total_departments,
        "staff": total_staff,
        "beds": {
            "total": total_beds,
            "occupied": occupied_beds,
            "available": available_beds,
            "occupancy_rate": (occupied_beds / total_beds * 100) if total_beds > 0 else 0
        },
        "patients": {
            "active_admissions": active_admissions,
            "today_admissions": today_admissions
        },
        "revenue": {
            "total": total_revenue
        }
    }

# Department Management
@api_router.post("/hospital/departments")
async def create_department(
    department: DepartmentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can create departments")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    dept_doc = {
        "hospital_id": hospital_id,
        "name": department.name,
        "description": department.description,
        "head_doctor": department.head_doctor,
        "contact_phone": department.contact_phone,
        "services": department.services,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    result = await db.hospital_departments.insert_one(dept_doc)
    return {"message": "Department created successfully", "department_id": str(result.inserted_id)}

@api_router.get("/hospital/departments")
async def get_hospital_departments(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can access this")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    departments = await db.hospital_departments.find({"hospital_id": hospital_id}).to_list(100)
    
    result = []
    for dept in departments:
        # Count staff in this department
        staff_count = await db.hospital_staff.count_documents({
            "hospital_id": hospital_id,
            "department": dept["name"]
        })
        
        result.append({
            "id": str(dept["_id"]),
            "name": dept["name"],
            "description": dept["description"],
            "head_doctor": dept.get("head_doctor"),
            "contact_phone": dept["contact_phone"],
            "services": dept["services"],
            "staff_count": staff_count,
            "status": dept.get("status", "active")
        })
    
    return result

# Bed Management
@api_router.post("/hospital/beds")
async def create_bed(
    bed: BedCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can create beds")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    bed_doc = {
        "hospital_id": hospital_id,
        "room_number": bed.room_number,
        "bed_number": bed.bed_number,
        "department": bed.department,
        "bed_type": bed.bed_type,
        "price_per_day": bed.price_per_day,
        "status": "available",  # available, occupied, maintenance
        "current_patient_id": None,
        "created_at": datetime.utcnow()
    }
    
    result = await db.hospital_beds.insert_one(bed_doc)
    return {"message": "Bed created successfully", "bed_id": str(result.inserted_id)}

@api_router.get("/hospital/beds")
async def get_hospital_beds(
    status: Optional[str] = None,
    department: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can access this")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    query = {"hospital_id": hospital_id}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    
    beds = await db.hospital_beds.find(query).to_list(500)
    
    result = []
    for bed in beds:
        result.append({
            "id": str(bed["_id"]),
            "room_number": bed["room_number"],
            "bed_number": bed["bed_number"],
            "department": bed["department"],
            "bed_type": bed["bed_type"],
            "price_per_day": bed["price_per_day"],
            "status": bed["status"],
            "current_patient_id": bed.get("current_patient_id")
        })
    
    return result

# Patient Admission Management
@api_router.post("/hospital/admissions")
async def admit_patient(
    admission: PatientAdmission,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can admit patients")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    # Get patient info
    patient = await db.users.find_one({"_id": ObjectId(admission.patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Assign bed if provided
    if admission.bed_id:
        bed = await db.hospital_beds.find_one({"_id": ObjectId(admission.bed_id)})
        if bed["status"] != "available":
            raise HTTPException(status_code=400, detail="Bed not available")
        
        await db.hospital_beds.update_one(
            {"_id": ObjectId(admission.bed_id)},
            {"$set": {"status": "occupied", "current_patient_id": admission.patient_id}}
        )
    
    admission_doc = {
        "hospital_id": hospital_id,
        "hospital_name": hospital.get("hospital_name", user["full_name"]),
        "patient_id": admission.patient_id,
        "patient_name": patient["full_name"],
        "patient_phone": patient["phone"],
        "admission_type": admission.admission_type,
        "department": admission.department,
        "assigned_doctor": admission.assigned_doctor,
        "diagnosis": admission.diagnosis,
        "symptoms": admission.symptoms,
        "bed_id": admission.bed_id,
        "emergency_contact_name": admission.emergency_contact_name,
        "emergency_contact_phone": admission.emergency_contact_phone,
        "admission_date": datetime.utcnow(),
        "status": "active",  # active, discharged
        "created_at": datetime.utcnow()
    }
    
    result = await db.patient_admissions.insert_one(admission_doc)
    
    return {
        "message": "Patient admitted successfully",
        "admission_id": str(result.inserted_id),
        "admission_number": f"ADM-{str(result.inserted_id)[:8].upper()}"
    }

@api_router.get("/hospital/admissions")
async def get_admissions(
    status: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can access this")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    query = {"hospital_id": hospital_id}
    if status:
        query["status"] = status
    
    admissions = await db.patient_admissions.find(query).sort("created_at", -1).to_list(200)
    
    result = []
    for adm in admissions:
        result.append({
            "id": str(adm["_id"]),
            "admission_number": f"ADM-{str(adm['_id'])[:8].upper()}",
            "patient_name": adm["patient_name"],
            "patient_phone": adm["patient_phone"],
            "admission_type": adm["admission_type"],
            "department": adm["department"],
            "assigned_doctor": adm["assigned_doctor"],
            "diagnosis": adm["diagnosis"],
            "admission_date": adm["admission_date"].isoformat(),
            "status": adm["status"],
            "bed_id": adm.get("bed_id")
        })
    
    return result

@api_router.post("/hospital/admissions/{admission_id}/discharge")
async def discharge_patient(
    admission_id: str,
    discharge: PatientDischarge,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can discharge patients")
    
    admission = await db.patient_admissions.find_one({"_id": ObjectId(admission_id)})
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    
    # Free up the bed
    if admission.get("bed_id"):
        await db.hospital_beds.update_one(
            {"_id": ObjectId(admission["bed_id"])},
            {"$set": {"status": "available", "current_patient_id": None}}
        )
    
    # Update admission status
    await db.patient_admissions.update_one(
        {"_id": ObjectId(admission_id)},
        {"$set": {
            "status": "discharged",
            "discharge_date": datetime.utcnow(),
            "discharge_summary": discharge.discharge_summary,
            "follow_up_instructions": discharge.follow_up_instructions,
            "prescribed_medications": discharge.prescribed_medications,
            "next_appointment_date": discharge.next_appointment_date
        }}
    )
    
    return {"message": "Patient discharged successfully"}

# Hospital Services Management
@api_router.post("/hospital/services")
async def create_service(
    service: HospitalServiceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can create services")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    service_doc = {
        "hospital_id": hospital_id,
        "service_name": service.service_name,
        "department": service.department,
        "description": service.description,
        "price": service.price,
        "duration_minutes": service.duration_minutes,
        "status": "active",
        "created_at": datetime.utcnow()
    }
    
    result = await db.hospital_services.insert_one(service_doc)
    return {"message": "Service created successfully", "service_id": str(result.inserted_id)}

@api_router.get("/hospital/services")
async def get_hospital_services(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user_id = verify_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if user["role"] != UserRole.HOSPITAL:
        raise HTTPException(status_code=403, detail="Only hospitals can access this")
    
    hospital = await db.hospitals.find_one({"user_id": user_id})
    hospital_id = str(hospital["_id"])
    
    services = await db.hospital_services.find({"hospital_id": hospital_id}).to_list(200)
    
    result = []
    for svc in services:
        result.append({
            "id": str(svc["_id"]),
            "service_name": svc["service_name"],
            "department": svc["department"],
            "description": svc["description"],
            "price": svc["price"],
            "duration_minutes": svc["duration_minutes"],
            "status": svc.get("status", "active")
        })
    
    return result

# Public: Get Hospital Services (for patients)
@api_router.get("/hospitals/{hospital_id}/services")
async def get_public_hospital_services(hospital_id: str):
    services = await db.hospital_services.find({
        "hospital_id": hospital_id,
        "status": "active"
    }).to_list(200)
    
    result = []
    for svc in services:
        result.append({
            "id": str(svc["_id"]),
            "service_name": svc["service_name"],
            "department": svc["department"],
            "description": svc["description"],
            "price": svc["price"],
            "duration_minutes": svc["duration_minutes"]
        })
    
    return result

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
