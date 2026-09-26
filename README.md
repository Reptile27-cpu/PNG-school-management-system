# PNG School Management System (PNG-SMS)

A cloud-based, multi-tenant school management system designed for primary and secondary schools across Papua New Guinea.

## 🚀 Features

- **Student Management** - Digital enrollment, profiles, ID generation, transfers
- **Attendance Tracking** - Real-time attendance with parent notifications
- **Academic Records** - Grade management, report cards, GPA calculation
- **Parent Portal** - Monitor children's progress across multiple schools
- **Teacher Portal** - Mark attendance, enter grades, manage classes
- **Admin Dashboard** - Analytics, reports, school management
- **Multi-Tenant** - Row-level tenant isolation with school_id
- **Cloud-Based** - Access from anywhere, automatic backups

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS |
| **UI Components** | shadcn/ui, Radix UI, Framer Motion |
| **State Management** | Zustand, TanStack Query |
| **Backend** | Node.js, Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL |
| **Auth** | JWT + Refresh Tokens |
| **Caching** | Redis (optional) |

## 📁 Project Structure

```
png-school-management-system/
├── apps/
│   └── web/                    # Next.js Frontend
│       └── src/
│           ├── app/            # Next.js App Router
│           ├── components/     # Reusable components
│           ├── lib/            # Utilities & API client
│           ├── stores/         # Zustand stores
│           └── hooks/          # Custom hooks
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── config/            # Configuration
│   │   ├── middleware/         # Express middleware
│   │   ├── modules/           # Feature modules
│   │   ├── services/          # Shared services
│   │   └── utils/             # Utilities
│   └── prisma/                # Database schema & migrations
├── packages/                   # Shared packages
└── docs/                      # Documentation
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/png-school-management-system.git
cd png-school-management-system
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../apps/web
npm install
```

3. **Set up environment variables**
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Frontend
cd ../apps/web
cp .env.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL if needed
```

4. **Run database migrations**
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

5. **Start development servers**
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from apps/web directory)
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@png-sms.com | Admin123! |
| School Admin | principal@pomdemo.edu.pg | School123! |
| Teacher | sarah.teaching@pomdemo.edu.pg | Teacher123! |

## Temporary Google Sheets Student Mode

The student list supports two reversible data sources:

- `database` uses the existing backend student API.
- `google_sheets` reads the `Students` sheet through a Google Apps Script web app.

### Configure Google Sheets mode

1. Create a Google Sheet with a tab named `Students`. Use a header row containing `student_id`, `name`, `program`, `year`, `email`, `phone`, and `status`.
2. Open **Extensions > Apps Script**, paste the code from [docs/google-sheets-students.gs](docs/google-sheets-students.gs), and deploy it as a web app. Set **Execute as** to yourself and **Who has access** to the audience that will use the demo.
3. In `apps/web/.env.local`, set:

```env
NEXT_PUBLIC_DATA_SOURCE=google_sheets
NEXT_PUBLIC_GOOGLE_SHEETS_API_URL=YOUR_GOOGLE_APPS_SCRIPT_URL
```

`NEXT_PUBLIC_` is required because the existing Next.js student page loads this data in the browser. The URL is an endpoint, not a database credential. Restart the web app after changing environment variables.

4. The existing student login remains the authentication mechanism. In Google Sheets mode, use a Student ID and password from the sheet. The dashboard requests only the matching student row. Add or edit that row in the sheet, then select **Refresh** to retrieve the latest record. The admin Students page continues to load the full list.

The Apps Script endpoint is a public demo endpoint. Its optional `email` and `student_id` filters reduce normal student requests, but they are not an authorization boundary. Do not place passwords, tokens, database credentials, or other secrets in the sheet. Production use should proxy this request through an authenticated backend endpoint.

### Switch back to the database

Set `NEXT_PUBLIC_DATA_SOURCE=database` and restart or redeploy the web app. No database schema, records, authentication, or backend routes are changed by this demo mode.

## 📚 API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Auth
- `POST /auth/login` - Sign in
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Sign out
- `POST /auth/forgot-password` - Request password reset

### Schools
- `GET /schools` - List schools (super admin)
- `POST /schools` - Create school
- `GET /schools/:id` - Get school details
- `PATCH /schools/:id` - Update school

### Students
- `GET /students` - List students
- `POST /students` - Register student
- `GET /students/:id` - Get student profile
- `PATCH /students/:id` - Update student
- `DELETE /students/:id` - Soft-delete student

### Attendance
- `GET /attendance` - Get attendance records
- `POST /attendance/batch` - Batch mark attendance
- `GET /attendance/student/:id` - Student attendance history

## 🔒 Security

- JWT with short-lived access tokens (15min) and refresh tokens (7 days)
- Passwords hashed with bcrypt (12 salt rounds)
- Row-level tenant isolation via school_id
- Role-based access control (RBAC)
- Rate limiting on auth endpoints
- Audit logging for all CRUD operations

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support, email info@png-sms.com or visit our documentation.
