# 🛡️ API Sentinel — API Health Monitoring & Incident Management Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%26%20Express-339933.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%26%20Mongoose-47A248.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Containerization-Docker%20Compose-2496ED.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Orchestration-Kubernetes%20%28Minikube%29-326CE5.svg)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**API Sentinel** is a full-stack, enterprise-grade API health monitoring, automated telemetry tracking, and incident command platform. Designed for Site Reliability Engineers (SREs), DevOps teams, and platform developers, Sentinel performs high-frequency health probes, visualizes real-time latency sparklines, automatically detects failures, and orchestrates end-to-end incident resolution workflows.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Presentation Layer (React 18 + Vite)"]
        Dashboard["Cyberpunk Glassmorphism Dashboard"]
        FleetMgmt["API Fleet CRUD & Manual Probes"]
        IncidentCommand["Incident Lifecycle Command & Audit Logs"]
        TelemetrySpark["Latency Sparklines & SLO Analytics"]
        OutageSim["Interactive Outage Simulator Switch"]
    end

    subgraph Server ["Backend Core Engine (Node.js & Express)"]
        AuthMiddleware["JWT Authentication & RBAC Middleware"]
        SSRFShield["SSRF Security Shield (RFC1918 / Metadata Filter)"]
        Router["RESTful API Route Handlers (/api/*)"]
        SchedulerEngine["Automated Health Monitoring Scheduler"]
        ProbeService["High-Precision Latency HTTP Probe Service"]
        IncidentEngine["Automated Incident Creation Engine"]
        MockCluster["Mock Target Microservices Cluster (/api/mock/*)"]
    end

    subgraph DataLayer ["Database Persistence Layer (MongoDB)"]
        Mongoose["Mongoose ODM"]
        UsersCol[("Users Collection")]
        ApisCol[("APIs Collection")]
        ChecksCol[("HealthChecks Collection (TTL Indexed)")]
        IncidentsCol[("Incidents Collection")]
    end

    Client -->|HTTP / REST + JWT| AuthMiddleware
    AuthMiddleware --> SSRFShield
    SSRFShield --> Router
    Router --> Mongoose
    SchedulerEngine -->|Periodic Probes| ProbeService
    ProbeService -->|HTTP Probes| MockCluster
    ProbeService -->|HTTP/HTTPS Probes| ExternalAPIs["External Target APIs"]
    ProbeService -->|Persist Telemetry| ChecksCol
    ProbeService -->|Consecutive Failures| IncidentEngine
    IncidentEngine -->|Create/Deduplicate Incident| IncidentsCol
    Mongoose --> UsersCol
    Mongoose --> ApisCol
    OutageSim -->|Toggle Failure (503/500)| MockCluster
```

---

## 📂 Project Structure

```
d:/Mini Project Micro/
├── backend/                             # Backend Service (Node.js, Express, Mongoose)
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # MongoDB connection with in-memory fallback
│   │   ├── models/
│   │   │   ├── User.js                  # User model with bcrypt hashing & roles
│   │   │   ├── Api.js                   # API model with interval, timeout, telemetry
│   │   │   ├── HealthCheck.js           # Health check log model with TTL index
│   │   │   ├── Incident.js              # Incident model with timeline & lifecycle
│   │   │   └── index.js                 # Unified models export
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT verification & RBAC authorization
│   │   │   ├── validate.js              # express-validator request schemas
│   │   │   └── ssrfProtection.js        # Anti-SSRF DNS and RFC1918 filter
│   │   ├── routes/
│   │   │   ├── auth.routes.js           # Register, login, profile
│   │   │   ├── api.routes.js            # Fleet CRUD, manual probe, history
│   │   │   ├── incident.routes.js       # Incidents list, lifecycle update, triage
│   │   │   ├── dashboard.routes.js      # Aggregated KPIs and telemetry summary
│   │   │   └── mock.routes.js           # Built-in target mock services & outage toggle
│   │   ├── services/
│   │   │   ├── ping.service.js          # HTTP probe, latency timer, auto-incidents
│   │   │   └── scheduler.service.js     # Background monitoring interval manager
│   │   ├── seed/
│   │   │   └── seeder.js                # Sample users, APIs, and telemetry seeder
│   │   ├── app.js                       # Express app configuration & middleware
│   │   └── server.js                    # Server startup and graceful shutdown
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile                       # Production Node 20-alpine container
│   └── package.json
│
├── frontend/                            # Frontend Web Application (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Brand, nav tabs, user badge, outage switch
│   │   │   ├── StatCard.jsx             # Glowing KPI metric cards
│   │   │   ├── ApiModal.jsx             # Add & Edit API modal with presets
│   │   │   ├── IncidentModal.jsx        # Incident triage & timeline audit modal
│   │   │   └── HistoryModal.jsx         # Historical sparkline graph & logs
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # JWT state, login, register, logout
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx        # Real-time KPIs, fleet status, live probe feed
│   │   │   ├── ApisPage.jsx             # Search, filter, CRUD fleet management
│   │   │   ├── IncidentsPage.jsx        # Filterable incident triage command
│   │   │   ├── AnalyticsPage.jsx        # Latency benchmarking & rolling SLO uptime
│   │   │   ├── LoginPage.jsx            # Sign in with 1-click examiner demo accounts
│   │   │   └── RegisterPage.jsx         # User registration with RBAC selection
│   │   ├── services/
│   │   │   └── api.js                   # Axios client with JWT request interceptors
│   │   ├── App.jsx                      # App root router and navigation
│   │   ├── index.css                    # Modern Cyberpunk Dark Glassmorphism CSS
│   │   └── main.jsx                     # React DOM root entry
│   ├── .dockerignore
│   ├── Dockerfile                       # Multi-stage build + Nginx Alpine runner
│   ├── index.html                       # HTML5 shell with JetBrains Mono & Outfit fonts
│   ├── nginx.conf                       # Nginx SPA router and API reverse proxy
│   ├── package.json
│   └── vite.config.js
│
├── k8s/                                 # Kubernetes Manifests (Minikube Deployment)
│   ├── mongo-pvc.yaml                   # Persistent storage claim for MongoDB
│   ├── mongo-deployment.yaml            # MongoDB pod deployment & ClusterIP service
│   ├── backend-configmap.yaml           # ConfigMap for runtime variables
│   ├── backend-secret.yaml              # Secret for JWT and database credentials
│   ├── backend-deployment.yaml          # Backend deployment with liveness/readiness probes
│   ├── frontend-deployment.yaml         # Frontend deployment & NodePort service (30080)
│   └── deploy-minikube.ps1              # 1-click Minikube automation PowerShell script
│
├── docker-compose.yml                   # Turnkey multi-container Docker Compose file
├── .env.example                         # Master environment variables template
├── .gitignore                           # Excludes node_modules, dist, secrets, logs
├── API_Sentinel.postman_collection.json # Automated Postman test collection
├── API_Sentinel.postman_environment.json# Postman environment configuration
├── package.json                         # Root project scripts runner
└── README.md                            # Comprehensive project documentation
```

---

## ⚡ Quick Start Guide

### Option 1: Docker Compose (Recommended for Turnkey Evaluation)

Ensure Docker Desktop is running, then execute in Windows PowerShell:

```powershell
docker compose up --build
```

- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Health Probe:** [http://localhost:5000/healthz](http://localhost:5000/healthz)
- **MongoDB Database:** `mongodb://localhost:27017/apisentinel` (Persistent volume: `sentinel_mongo_data`)

To stop all services:
```powershell
docker compose down
```

---

### Option 2: Local Standalone Development (Node.js & MongoDB)

Prerequisites: Node.js v18+ installed.

#### 1. Start the Backend:
```powershell
cd backend
npm install
npm run seed       # Seeds default Admin, Analyst, and sample monitored APIs
npm run dev        # Starts Express server on http://localhost:5000
```
> **Note:** If external MongoDB is not running locally, API Sentinel automatically spins up a lightweight embedded in-memory MongoDB server for testing!

#### 2. Start the Frontend:
In a new PowerShell terminal:
```powershell
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Pre-Seeded Demonstration Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@sentinel.dev` | `admin123` | Full CRUD on APIs, incidents, and system settings |
| **Analyst** | `analyst@sentinel.dev` | `analyst123` | Triage incidents, execute probes, view telemetry |

> 💡 **College Evaluation Tip:** On the Login page, click the **"⚡ 1-Click Examiner Demo Logins"** buttons to instantly log in without typing!

---

## 🎮 Live Outage Demonstration (How to Wow Evaluators)

API Sentinel includes an **Interactive Outage Simulator**:

1. Click the **"Simulate Outage"** button in the top navigation bar.
2. The mock payment microservice begins responding with `503 Service Unavailable`.
3. Within seconds, API Sentinel's automated background probe detects the failure:
   - The API status turns **red (Unhealthy)** with a pulsing glow.
   - An active **Critical Incident** is automatically generated.
   - A red **Outage Alert Banner** appears on the Dashboard.
4. Click **"Triage & Logs"** to advance the incident through its lifecycle:
   - `Investigating` ➔ `Identified` ➔ `Monitoring` ➔ `Resolved`.
5. Click **"Outage Active"** again to restore normal operations (`200 OK`).

---

## ☸️ Kubernetes (Minikube) Deployment

To deploy API Sentinel on a local Kubernetes cluster using Minikube:

1. Open Windows PowerShell as Administrator.
2. Run the deployment script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File ./k8s/deploy-minikube.ps1
   ```
3. Once pods are ready, launch the service:
   ```powershell
   minikube service frontend-service
   ```

Verify deployment resources:
```powershell
kubectl get pods -l app=sentinel
kubectl get services -l app=sentinel
kubectl get pvc
```

---

## 📮 Postman API Testing Suite

1. Open **Postman**.
2. Click **Import** and select:
   - `API_Sentinel.postman_collection.json`
   - `API_Sentinel.postman_environment.json`
3. Execute the collection in order:
   - `0. System Health Probe` ➔ Verifies `/healthz`
   - `1. Login as Admin` ➔ Automatically extracts and saves the JWT token into the environment
   - `2. Fleet Management` ➔ Tests CRUD operations and manual probes
   - `3. Dashboard & Incident Command` ➔ Verifies KPI calculations and status updates
   - `4. Outage Simulator` ➔ Tests mock failure triggers

---

## 🔒 Security & Reliability Features

- **SSRF Protection:** Resolves hostnames via DNS and blocks loopback (`127.0.0.1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS/GCP/Azure cloud metadata endpoints (`169.254.169.254`).
- **Overlapping Check Prevention:** Background scheduler uses an in-flight probe lock map to ensure high-frequency schedules never overwhelm target servers or crash the engine.
- **Deduplication:** Automatic failure triggers only open one active incident per endpoint, preventing alert fatigue and database spam.
- **TTL Indexing:** Historical probe telemetry automatically expires after 30 days to guarantee bounded database growth.
- **Secure Password Hashing:** Salted `bcryptjs` rounds with strict JWT Bearer token expiry.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
