# Connected Auto Dashboard

A full-stack IoT vehicle telematics platform with a Django backend and React + Vite frontend.

## Project Structure

```
.
├── backend/          # Django REST API + WebSocket (Channels/Daphne)
└── frontend/         # React 18 + TypeScript + Vite dashboard
```

---

## Backend Setup

**Requirements:** Python 3.10+, Redis, PostgreSQL (or SQLite for dev)

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### Environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

### Run Migrations

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Start Development Server

```bash
python -m uvicorn DjangoProject.asgi:application --host 0.0.0.0 --port 8000 --reload
```

### Start Celery Worker (in a separate terminal)

```bash
celery -A DjangoProject worker -l info -Q mqtt,default
```

---

## Frontend Setup

**Requirements:** Node.js 18+

```bash
cd frontend
npm install
```

### Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `VITE_API_BASE_URL` to point to your backend (default: `http://localhost:8000`).

### Start Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Django 4.2, DRF, Django Channels, Celery, Daphne |
| Database   | PostgreSQL (TimescaleDB) / SQLite (dev)         |
| Cache/Queue| Redis                                           |
| Messaging  | MQTT (paho-mqtt)                                |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS        |
| Auth       | JWT (djangorestframework-simplejwt)             |

---

## API Endpoints

Base URL: `http://localhost:8000/api/`

| Method | Endpoint           | Description           |
|--------|--------------------|-----------------------|
| POST   | `/api/token/`      | Obtain JWT tokens     |
| POST   | `/api/token/refresh/` | Refresh access token |
| GET    | `/api/vehicles/`   | List vehicles         |
| GET    | `/api/users/`      | List users            |

Full API documentation available at `/api/schema/` (if enabled).
