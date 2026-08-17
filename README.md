# 💬 Chat & Call App

A full-stack real-time **Chat & Call Application** that allows users to create accounts, authenticate securely, communicate with other users through real-time messaging, and make voice/video calls.

The project is built with a modern frontend and backend architecture. The backend provides REST APIs for authentication, users, and application data, while real-time communication is handled through technologies such as WebSockets/WebRTC.

---

## 📌 Table of Contents

* [About the Project](#-about-the-project)
* [Features](#-features)
* [Tech Stack](#-tech-stack)
* [Project Architecture](#-project-architecture)
* [Project Structure](#-project-structure)
* [How the Application Works](#-how-the-application-works)
* [Authentication Flow](#-authentication-flow)
* [Database](#-database)
* [API Endpoints](#-api-endpoints)
* [Getting Started](#-getting-started)
* [Environment Variables](#-environment-variables)
* [Running the Project](#-running-the-project)
* [API Documentation](#-api-documentation)
* [Future Improvements](#-future-improvements)
* [Author](#-author)

---

# 🚀 About the Project

**Chat & Call App** is a full-stack communication platform designed to provide users with a secure and real-time way to communicate.

Users can:

1. Create an account.
2. Log in securely.
3. Receive a JWT access token.
4. Access protected resources.
5. View their authenticated user information.
6. Communicate with other users.
7. Send and receive messages in real time.
8. Make voice/video calls.

The backend is responsible for authentication, authorization, database communication, and API functionality.

The frontend communicates with the backend through HTTP APIs and real-time communication channels.

---

# ✨ Features

## 🔐 Authentication

* User registration
* User login
* Secure password hashing using bcrypt
* JWT access-token authentication
* JWT token validation
* Protected API routes
* Authenticated-user dependency
* Current-user endpoint

## 👤 User Management

* Create users
* Store user information securely
* Retrieve users
* Retrieve currently authenticated user
* User authentication and authorization

## 💬 Messaging

* Real-time messaging
* One-to-one conversations
* Message history
* Message timestamps
* Online/offline status

## 📞 Calling

* Voice calling
* Video calling
* Real-time call signaling
* WebRTC-based communication

## 🗄️ Database

* PostgreSQL database
* SQLAlchemy ORM
* Alembic migrations
* Structured relational data

## 🌐 Backend

* FastAPI REST API
* Automatic API documentation
* CORS configuration
* Dependency injection
* JWT authentication
* Protected routes

---

# 🛠️ Tech Stack

## Frontend

| Technology      | Purpose                 |
| --------------- | ----------------------- |
| React / Next.js | User interface          |
| TypeScript      | Type safety             |
| Tailwind CSS    | Styling                 |
| Axios           | API communication       |
| WebSocket       | Real-time communication |
| WebRTC          | Voice/video calls       |

## Backend

| Technology       | Purpose                      |
| ---------------- | ---------------------------- |
| Python           | Backend programming language |
| FastAPI          | REST API framework           |
| SQLAlchemy       | ORM                          |
| PostgreSQL       | Database                     |
| Alembic          | Database migrations          |
| Pydantic         | Data validation              |
| JWT              | Authentication               |
| Passlib / bcrypt | Password hashing             |
| Uvicorn          | ASGI server                  |

---

# 🏗️ Project Architecture

The application follows a client-server architecture.

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │                     │
                    │ React / Next.js     │
                    │ TypeScript          │
                    │ Tailwind CSS        │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
              HTTP                        WebSocket
                │                             │
                ▼                             ▼
        ┌───────────────┐            ┌───────────────┐
        │    FastAPI    │            │ Real-time     │
        │      API      │            │ Communication │
        └───────┬───────┘            └───────────────┘
                │
        ┌───────┴────────┐
        │                │
        ▼                ▼
   Authentication    Application
      / Users          Logic
        │                │
        └────────┬───────┘
                 │
                 ▼
        ┌─────────────────┐
        │   SQLAlchemy    │
        │      ORM        │
        └────────┬────────┘
                 │
                 ▼
        ┌─────────────────┐
        │   PostgreSQL    │
        │    Database     │
        └─────────────────┘
```

For calls, the application can use **WebRTC** for peer-to-peer audio/video communication.

---

# 📁 Project Structure

```text
Chat-and-Call-App/
│
├── backend/
│   │
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   │
│   │   ├── db/
│   │   │   └── database.py
│   │   │
│   │   ├── models/
│   │   │   └── user.py
│   │   │
│   │   ├── schemas/
│   │   │   └── user.py
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   └── users.py
│   │   │
│   │   └── main.py
│   │
│   ├── alembic/
│   │   ├── versions/
│   │   └── env.py
│   │
│   ├── .env
│   ├── .gitignore
│   ├── alembic.ini
│   ├── requirements.txt
│   └── README.md
│
└── frontend/
    │
    ├── src/
    ├── components/
    ├── pages/
    ├── services/
    └── ...
```

> The exact structure may change as new features are added.

---

# 🔄 How the Application Works

## 1. User Registration

A new user submits their information through the frontend.

```text
Frontend
   │
   │ POST /auth/register
   ▼
FastAPI
   │
   ├── Validate request
   │
   ├── Hash password
   │
   ├── Create User object
   │
   └── Save user
          │
          ▼
      PostgreSQL
```

The password is **never stored as plain text**.

Instead:

```text
password
   ↓
bcrypt
   ↓
hashed password
   ↓
PostgreSQL
```

---

# 🔑 Authentication Flow

After registration, the user can log in.

```text
User
 │
 │ Email + Password
 ▼
POST /auth/login
 │
 ▼
FastAPI
 │
 ├── Find user
 │
 ├── Verify password
 │
 └── Generate JWT
       │
       ▼
    Access Token
       │
       ▼
    Frontend
```

For protected requests:

```text
Frontend
   │
   │ Authorization: Bearer <JWT>
   ▼
FastAPI
   │
   ▼
get_current_user()
   │
   ├── Extract token
   ├── Decode JWT
   ├── Validate token
   └── Identify user
          │
          ▼
   Protected Endpoint
```

---

# 🛡️ Protected Routes

Some API endpoints require authentication.

For example:

```http
GET /users/me
```

The request must contain:

```http
Authorization: Bearer <access_token>
```

FastAPI uses the `get_current_user` dependency to verify the token before allowing access to the protected route.

---

# 🗄️ Database

The project uses **PostgreSQL** as its relational database.

SQLAlchemy is used as the ORM layer.

The architecture is:

```text
FastAPI
   ↓
SQLAlchemy
   ↓
PostgreSQL
```

Instead of writing raw SQL everywhere, SQLAlchemy allows the application to work with Python models and database sessions.

For example:

```text
User Model
    ↓
SQLAlchemy
    ↓
users table
    ↓
PostgreSQL
```

---

# 🔄 Database Migrations

**Alembic** is used to manage database schema changes.

When a model changes, a migration can be generated:

```bash
alembic revision --autogenerate -m "create users table"
```

Then the migration is applied:

```bash
alembic upgrade head
```

This allows the database schema to evolve together with the application.

---

# 📡 API Endpoints

## Authentication

| Method | Endpoint         | Authentication | Description           |
| ------ | ---------------- | -------------- | --------------------- |
| POST   | `/auth/register` | ❌              | Register a new user   |
| POST   | `/auth/login`    | ❌              | Login and receive JWT |

## Users

| Method | Endpoint    | Authentication      | Description                 |
| ------ | ----------- | ------------------- | --------------------------- |
| GET    | `/users/`   | Optional/Configured | Retrieve users              |
| GET    | `/users/me` | ✅ Required          | Retrieve authenticated user |

> Additional chat and call endpoints will be added as the application develops.

---

# 📋 Example Authentication Requests

## Register

```http
POST /auth/register
```

Example:

```json
{
  "username": "nabin",
  "email": "nabin@example.com",
  "password": "password123"
}
```

---

## Login

```http
POST /auth/login
```

Example:

```json
{
  "email": "nabin@example.com",
  "password": "password123"
}
```

Successful authentication returns an access token:

```json
{
  "access_token": "JWT_TOKEN",
  "token_type": "bearer"
}
```

---

## Get Current User

```http
GET /users/me
```

Request:

```http
Authorization: Bearer JWT_TOKEN
```

Response:

```json
{
  "id": 1,
  "username": "nabin",
  "email": "nabin@example.com"
}
```

---

# ⚙️ Getting Started

## Prerequisites

Make sure the following are installed:

* Python 3.10+
* PostgreSQL
* Node.js
* npm
* Git

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Chat-and-Call-App
```

---

# 🐍 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate it:

### macOS / Linux

```bash
source venv/bin/activate
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

# 🗄️ PostgreSQL Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE chat_and_call;
```

Configure your database connection inside `.env`.

Example:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/chat_and_call
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

# 🔄 Run Database Migrations

Run:

```bash
alembic upgrade head
```

This creates/updates the database schema according to the Alembic migrations.

---

# ▶️ Start the Backend

Run:

```bash
uvicorn app.main:app --reload
```

The backend will start at:

```text
http://127.0.0.1:8000
```

---

# 📖 API Documentation

FastAPI automatically generates interactive documentation.

### Swagger UI

```text
http://127.0.0.1:8000/docs
```

Swagger allows you to:

* View available endpoints
* See request/response schemas
* Send API requests
* Test authentication
* Test protected routes

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

---

# 🌐 Frontend Setup

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will run on the development port configured by the project.

---

# 🔐 Environment Variables

The following environment variables should be configured:

```env
DATABASE_URL=
SECRET_KEY=
ALGORITHM=
ACCESS_TOKEN_EXPIRE_MINUTES=
```

Do not commit `.env` to Git.

Add it to `.gitignore`:

```text
.env
venv/
__pycache__/
node_modules/
```

---

# 🔗 Frontend ↔ Backend Communication

The frontend communicates with the FastAPI backend through HTTP requests.

For example:

```text
Frontend
   │
   │ Axios / Fetch
   ▼
FastAPI
   │
   ▼
PostgreSQL
```

Authentication is handled using JWT.

After login:

```text
Frontend
   │
   ├── Stores access token
   │
   └── Sends token with protected requests
              │
              ▼
          FastAPI
              │
              ▼
       Token validation
              │
              ▼
        Protected data
```

---

# 📞 Real-Time Communication

The application is designed to support real-time communication.

### Chat

WebSockets can be used for:

* Sending messages
* Receiving messages instantly
* Online status
* Typing indicators
* Message delivery updates

### Voice & Video Calls

WebRTC can be used for:

* Audio calls
* Video calls
* Peer-to-peer media communication

A signaling mechanism is required to exchange connection information between users before establishing a WebRTC connection.

---

# 🧩 Current Backend Implementation

The backend currently includes:

* User model
* PostgreSQL integration
* SQLAlchemy database session
* Alembic migration
* User registration
* User login
* bcrypt password hashing
* JWT access-token generation
* JWT token validation
* `get_current_user` dependency
* Protected routes
* `/users/me` endpoint
* CORS configuration

The chat and calling functionality can then be built on top of this authentication foundation.

---

# 🚧 Future Improvements

The project is actively being developed.

Planned functionality includes:

### 👤 User Features

* User profiles
* Profile pictures
* Search users
* Friend/contact system
* Online/offline presence

### 💬 Chat

* One-to-one messaging
* Group conversations
* Message history
* Typing indicators
* Message delivery status
* Read receipts
* Message deletion
* Image/file sharing

### 📞 Calls

* Voice calls
* Video calls
* Incoming call notifications
* Call history
* Mute/unmute
* Camera on/off
* Screen sharing

### 🔐 Security

* Refresh tokens
* Token expiration handling
* Logout
* Rate limiting
* Email verification
* Password reset
* Improved authorization

### ⚡ Performance

* Redis
* WebSocket connection management
* Background tasks
* Caching
* Database optimization

---

# 🎯 Project Goal

The main goal of this project is to build a **complete real-time communication platform** while implementing modern full-stack development concepts.

The project demonstrates:

* REST API development
* Authentication and authorization
* Database design
* ORM usage
* Database migrations
* Secure password storage
* JWT authentication
* Protected API routes
* Real-time communication
* WebSockets
* WebRTC
* Frontend/backend integration

---

# 👨‍💻 Author

**Nabin Karki**

Computer Engineering Graduate | Full-Stack Developer

---

# 📄 License

This project is developed for learning, experimentation, and portfolio purposes.
