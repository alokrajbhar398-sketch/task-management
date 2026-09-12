# TaskFlow

TaskFlow is a collaborative task-management application with a React frontend and a TypeScript/Express backend. It supports user registration, authentication, task creation and editing, due-date reminders, task priorities, team assignment, file attachments, search/filter/sort controls, task status updates, role-based task deletion, and report endpoints.

## Technology stack

- Frontend: React 19, TypeScript, Vite, Recharts
- Backend: Node.js, Express 5, TypeScript
- Database: MySQL 8+
- Authentication: bcrypt password hashing and JSON Web Tokens

## Project structure

```text
backend/     Express API, authentication, task management, and MySQL models
frontend/    React/Vite client application
reports/     Generated report output
scripts/     Project utility scripts
```

## Prerequisites

- Node.js 20 or newer
- npm
- MySQL 8 or newer

## Setup

Install dependencies:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Create `backend/.env` using the following values for a local MySQL installation:

```env
PORT=5000
JWT_SECRET=replace_with_a_long_random_secret
DB_HOST=localhost
DB_USER=taskflow_app
DB_PASSWORD=replace_with_database_password
DB_NAME=task_management_db
```

Create the database and application user from a MySQL administrator account:

```sql
CREATE DATABASE IF NOT EXISTS task_management_db;
CREATE USER IF NOT EXISTS 'taskflow_app'@'localhost'
  IDENTIFIED BY 'replace_with_database_password';
GRANT ALL PRIVILEGES ON task_management_db.* TO 'taskflow_app'@'localhost';
FLUSH PRIVILEGES;
```

The backend creates the `users` and `tasks` tables automatically when it starts.

## Run locally

Start the backend:

```powershell
cd backend
npm run dev
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The backend health endpoint is available at [http://localhost:5000/api/health](http://localhost:5000/api/health).

## Available commands

### Backend

```powershell
npm run dev      # Start the development server with nodemon
npm run build    # Compile TypeScript to dist/
npm start        # Start the compiled server
```

### Frontend

```powershell
npm run dev      # Start the Vite development server
npm run build    # Type-check and create a production build
npm run lint     # Run Oxlint
npm run preview  # Preview the production build
```

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Authenticate and return a JWT |
| `GET` | `/api/auth/users` | List team members for task assignment |
| `POST` | `/api/auth/refresh` | Refresh a JWT |
| `GET` | `/api/tasks` | List tasks for the authenticated user |
| `POST` | `/api/tasks` | Create a task with optional due date and priority |
| `PATCH` | `/api/tasks/:id` | Update a task status |
| `PUT` | `/api/tasks/:id` | Edit a task title, description, due date, and priority |
| `DELETE` | `/api/tasks/:id` | Delete a task as an administrator |
| `GET` | `/api/attachments/task/:taskId` | List task attachments |
| `POST` | `/api/attachments/task/:taskId` | Upload an attachment up to 10 MB |
| `GET` | `/api/attachments/:id/download` | Download an attachment |
| `DELETE` | `/api/attachments/:id` | Delete an attachment |
| `GET` | `/api/health` | Check API availability |

Authenticated task requests must include:

```http
Authorization: Bearer <jwt>
```

## Security notes

- Never commit `backend/.env` or production credentials.
- Use a strong, unique `JWT_SECRET` outside local development.
- Use a dedicated MySQL application user rather than the MySQL `root` account.
- Passwords are hashed with bcrypt before storage.
