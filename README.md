# Coinsend - Fintech Service Desk Platform

A fintech platform that facilitates:
- **Crypto to KES payouts** - Sell crypto for Kenyan Shillings
- **KES to Crypto on-ramp** - Buy crypto with KES
- **Cross-border payments** - Kenya to South Africa, Uganda, Tanzania, Nigeria, China, UAE
- **OTC desk** - Large crypto & FX trades

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (7-day user, 24-hour admin)

## Project Structure

```
coinsend/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── api/       # API client (Axios)
│   │   ├── components/ # UI, layout, forms
│   │   ├── pages/     # public/, user/, admin/
│   │   ├── store/     # Zustand stores
│   │   └── types/     # TypeScript types
│   └── public/
│
├── backend/           # Express API
│   ├── prisma/        # Schema & migrations
│   └── src/
│       ├── config/    # Environment config
│       ├── middleware/ # Auth, error, rate limit
│       ├── routes/    # API routes
│       ├── services/  # Business logic
│       └── types/     # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (or Neon cloud database)
- npm

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd Coinsend
```

2. **Set up the backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL and secrets
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

3. **Set up the frontend** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

### Access the application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **Admin Panel**: http://localhost:5173/admin/login
  - Default: `admin@coinsend.com` / `admin123`

## Features

### User Features
- User registration & login
- Create orders (Crypto→KES, KES→Crypto, Cross-border, OTC)
- Submit payment proofs
- Track order status
- View order history

### Admin Features
- Dashboard with order statistics
- Process orders and update status
- Manage exchange rates
- Manage liquidity balances
- Manage deposit wallets
- View all users

## Order Flow

```
User creates order → Receives payment instructions
→ Makes payment → Submits proof → Admin processes
→ Admin completes payout → Order completed
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"
JWT_ADMIN_SECRET="your-admin-jwt-secret"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:4000/api
```

## API Endpoints

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Order details
- `POST /api/orders/:id/proof` - Submit payment proof

### Rates
- `GET /api/rates` - All exchange rates
- `POST /api/rates/calculate` - Calculate conversion

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/dashboard` - Statistics
- `GET /api/admin/orders` - All orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/users` - All users
- `GET /api/admin/rates` - Exchange rates
- `PUT /api/admin/rates/:id` - Update rate
- `GET /api/admin/liquidity` - Liquidity balances
- `PUT /api/admin/liquidity/:currency` - Update balance
- `GET /api/admin/wallets` - Deposit wallets
- `POST /api/admin/wallets` - Add wallet

## Security

- JWT authentication
- bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Helmet security headers
- Input validation on all endpoints

## License

Proprietary - All rights reserved
