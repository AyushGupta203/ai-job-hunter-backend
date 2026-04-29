# 🚀 AI Job Hunter — Backend API

A production-ready, role-based job platform with **AI-powered resume analysis and candidate matching**, built with scalable backend architecture and modern cloud practices.

---

## 🧭 Overview

AI Job Hunter enables **job seekers** to apply with resumes and **recruiters** to efficiently discover, evaluate, and shortlist candidates using AI-driven insights.

The system combines:

* **Cloud storage (AWS S3)** for resume files
* **Text extraction (unpdf)** for structured analysis
* **AI evaluation (Mistral AI)** for intelligent matching
* **MongoDB** for fast querying and indexing

---

## ✨ Core Features

### 🔐 Authentication & Authorization

* JWT-based authentication
* Role-based access control (Seeker / Recruiter)
* Secure route protection via middleware

### 📄 Resume Processing Pipeline

* Direct upload to **AWS S3 (via multer-s3)**
* Secure retrieval using **AWS SDK (v3)**
* PDF parsing using **unpdf (ESM-compatible)**
* Extracted text stored in MongoDB for indexing & AI

### 🤖 AI-Powered Matching

* Resume vs Job Description analysis (Mistral AI)
* Match score generation
* Skill gap detection
* Candidate strengths & weaknesses evaluation

### 💼 Job & Application System

* Recruiter job posting & management
* Seeker job application flow
* Duplicate application prevention (compound indexing)
* Applicant tracking & status updates

---

## 🧠 System Architecture

```text
User Upload → API → S3 Storage
                  ↓
            S3 Fetch (SDK)
                  ↓
            Stream → Buffer
                  ↓
            Text Extraction (unpdf)
                  ↓
            MongoDB Storage
                  ↓
Recruiter Search → DB Query → Resume URL (S3)
```

---

## 🏗 Design Decisions (Why this approach?)

| Problem                  | Solution                              |
| ------------------------ | ------------------------------------- |
| Large file storage       | AWS S3 (scalable, cost-efficient)     |
| Fast search              | Store extracted text in MongoDB       |
| Secure file access       | Private buckets + signed URLs         |
| ESM compatibility issues | Replaced `pdf-parse` with `unpdf`     |
| Duplicate applications   | MongoDB compound index                |
| AI integration           | Mistral API for structured evaluation |

---

## 🛠 Tech Stack

**Backend**

* Node.js · Express.js
* MongoDB Atlas · Mongoose
* JWT Authentication

**Cloud & Storage**

* AWS S3 (multer-s3, AWS SDK v3)

**AI & Processing**

* Mistral AI
* unpdf (PDF parsing)

**Architecture**

* RESTful API
* Middleware-driven design
* Role-based access control (RBAC)

---

## 📡 API Endpoints

### 🔐 Auth

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### 💼 Jobs

```
GET    /api/jobs              (public)
GET    /api/jobs/:id          (public)
POST   /api/jobs              (recruiter only)
GET    /api/jobs/mine         (recruiter only)
PUT    /api/jobs/status       (recruiter only)
```

### 📄 Applications

```
POST   /api/applications                (seeker only)
GET    /api/applications                (seeker only)
GET    /api/applications/job/:jobId     (recruiter only)
PUT    /api/applications/status         (recruiter only)
PUT    /api/applications/hire           (recruiter only)
```

### 📎 Resume

```
POST   /api/resume/upload     (seeker only)
```

### 🤖 AI

```
POST   /api/ai/match
POST   /api/ai/evaluate
POST   /api/ai/analyze-applicant
```

---

## 🤖 AI Response Example

```json
{
  "matchScore": 75,
  "missingSkills": ["React", "TypeScript"],
  "strengths": ["Node.js", "MongoDB", "REST APIs"],
  "weaknesses": ["No frontend project evidence"],
  "summary": "Strong backend profile with solid API experience..."
}
```

---

## ⚙️ Local Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env` file:

```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret

AWS_REGION=your_region
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BUCKET_NAME=your_bucket

MISTRAL_API_KEY=your_key
```

### 4. Run Server

```bash
npm run dev
```

---

## 🔐 Security Considerations

* S3 buckets are **private by default**
* File access via **signed URLs (recommended for production)**
* Passwords hashed using bcrypt
* JWT tokens used for secure session handling

---

## ⚡ Performance Considerations

* Avoid repeated S3 fetch by caching parsed text in DB
* File size limited (5MB) for controlled processing
* Indexed queries for fast candidate search
* Stream-based file handling (memory efficient)

---

## 📌 Project Status

✔ Backend complete and production-ready
🔧 Frontend integration in progress

---

## 🚀 Future Improvements

* Resume skill extraction pipeline (NLP-based)
* Advanced AI ranking system
* ElasticSearch integration for better search
* Resume versioning support
* Real-time notifications (WebSockets)

---

## 🧾 Summary

This backend demonstrates:

* Real-world **cloud integration (AWS S3)**
* **AI-powered decision systems**
* Clean **REST architecture**
* Secure and scalable **file + data handling**

---
