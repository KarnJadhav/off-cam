<<<<<<< HEAD
# Off-Cam

MVP for an off-campus jobs platform. The frontend and backend are separate projects:

- `client/`: React + Vite dashboard
- `server/`: Express + MongoDB + Redis + Razorpay API

## Setup

### Backend

```bash
cd server
npm install
copy .env.example .env
```

Fill MongoDB, Redis, JWT, Razorpay, email, Telegram, and admin values in `server/.env`.

Create the first admin:

```bash
npm run seed:admin
```

Run the API:

```bash
npm run dev
```

Server: `http://localhost:5000`

### Frontend

Open a new terminal:

```bash
cd client
npm install
copy .env.example .env
npm run dev
```

Set `VITE_RAZORPAY_KEY_ID` in `client/.env` to the same Razorpay test key id used by the backend. The backend still returns the key id with the order response, but the frontend env value is preferred for checkout.

Client: `http://localhost:5173`

## Default API Surface

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/verify-otp`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `GET /api/jobs/search`
- `GET /api/premium/jobs`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`
- `GET /api/payment/history`
- `POST /api/payment/webhook`
- `POST /api/admin/job`
- `PUT /api/admin/job/:id`
- `DELETE /api/admin/job/:id`
- `GET /api/admin/users`
=======
# off-cam
Off-Cam is a full-stack MERN SaaS platform that helps students discover off-campus job opportunities with premium subscriptions, Razorpay payments, Redis caching, JWT authentication, and an admin dashboard for managing job postings.
>>>>>>> ccb8e16f93e751eab805078185f3664aced245a3
