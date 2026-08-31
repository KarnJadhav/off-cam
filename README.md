# Off-Cam

Off-Cam is a full-stack MERN SaaS platform that helps students discover off-campus job opportunities with premium subscriptions, Razorpay payments, optional Redis caching, JWT authentication, and an admin dashboard for managing jobs, users, subscriptions, payments, notifications, reports, and settings.

The frontend and backend are separate projects:

- `client/`: React + Vite dashboard
- `server/`: Express + MongoDB + Redis + Razorpay API

## Backend

```bash
cd server
npm install
copy .env.example .env
npm run seed:admin
npm run dev
```

Server: `http://localhost:5000`

## Frontend

Open a new terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Client: `http://localhost:5173`

Set `VITE_RAZORPAY_KEY_ID` in `client/.env` to the same Razorpay test key id used by the backend.

## Main API Surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/jobs`
- `GET /api/premium/jobs`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`
- `GET /api/payment/history`
- `POST /api/payment/webhook`
- `GET /api/admin/overview`
- `GET /api/admin/jobs`
- `POST /api/admin/jobs`
- `PATCH /api/admin/jobs/:id`
- `DELETE /api/admin/jobs/:id`
- `POST /api/admin/jobs/:id/duplicate`
- `GET /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `GET /api/admin/premium-users`
- `GET /api/admin/payments`
- `POST /api/admin/notifications`
- `GET /api/admin/settings`

## Admin Job Workflow

Jobs are added manually in v1. The admin dashboard saves jobs through the shared job service, which handles validation, duplicate apply-link checks, MongoDB save/update, Redis cache clearing, and background premium-user notification triggers.

Published jobs can use both:

- `deadline`: application deadline shown to students
- `expiryDate`: date after which the job should be hidden

A midnight cron task automatically marks published jobs as expired when `expiryDate` is in the past.