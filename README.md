# INCAS Automation Dashboard

Real-time monitoring dashboard for WISE 4050 datalogger.

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js MQTT Bridge
- **Database**: Supabase (PostgreSQL + Real-time)
- **MQTT Broker**: HiveMQ Cloud
- **Deployment**: Vercel (frontend) + Railway (backend)

## Project Structure


---

## Step 3: Set up Frontend (Vite + React)
```bash
cd frontend

# Create Vite project (this will populate the frontend folder)
npm create vite@latest . -- --template react

# Install dependencies
npm install

# Install additional packages
npm install @supabase/supabase-js
npm install recharts
npm install lucide-react

# Still in frontend/
New-Item src\components -ItemType Directory
New-Item src\services -ItemType Directory
New-Item src\hooks -ItemType Directory
New-Item src\pages -ItemType Directory
New-Item src\utils -ItemType Directory

# Create environment file
New-Item .env.local -ItemType File