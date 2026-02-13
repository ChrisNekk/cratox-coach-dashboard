# Cratox AI - Coach Dashboard

A comprehensive web-based admin platform for fitness coaches to manage their clients, nutrition tracking, bookings, and more.

## Features

- **Client Management**: View and manage client profiles with detailed health data
- **License Management**: Invite clients with 12-month app licenses
- **Team Organization**: Group clients into teams for easier management
- **Booking System**: Schedule 1:1 and online coaching sessions
- **Packages**: Create and sell coaching packages
- **Content Library**: Workouts, recipes, and meal plans
- **Messaging**: Real-time chat with clients
- **Notifications**: Manual and automated notification system
- **AI Assistant**: AI-powered insights and automation
- **Client Feedback**: Request and collect feedback from clients with customizable rating questions and AI-powered analysis that generates a Client Feedback Score
- **Weekly Goals Tracking**: Dashboard widget showing all clients' daily goal achievements with week navigation and detailed tooltips
- **Reports**: Generate and schedule reports
- **Branding**: Custom logo and colors

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Backend**: tRPC API routes with Prisma ORM
- **Database**: PostgreSQL
- **Auth**: NextAuth.js
- **UI**: shadcn/ui + Tailwind CSS v4
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) or a PostgreSQL instance
- npm or yarn

### Setup

1. **Clone and install dependencies**:
   ```bash
   cd coach-dashboard
   npm install
   ```

2. **Set up the database**:
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up -d
   
   # Or connect to an existing PostgreSQL instance
   # Update DATABASE_URL in .env
   ```

3. **Configure environment variables**:
   ```bash
   # Copy and edit .env file
   cp .env.example .env
   
   # Update the following variables:
   # - DATABASE_URL
   # - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
   ```

4. **Set up the database schema**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed with demo data
   npm run db:seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open the app**:
   Navigate to [http://localhost:4000](http://localhost:4000)

### Demo Credentials

After seeding, you can log in with:
- **Email**: demo@cratox.ai
- **Password**: demo123

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages (protected)
│   └── api/               # API routes (NextAuth, tRPC)
├── components/
│   ├── layout/            # Layout components (sidebar, header)
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── auth/              # NextAuth configuration
│   └── trpc/              # tRPC client
├── providers/             # React context providers
├── server/
│   ├── db/                # Prisma client
│   └── trpc/              # tRPC routers
└── types/                 # TypeScript types
```

## Available Scripts

- `npm run dev` - Start development server on port 4000
- `npm run dev:clean` - Clean .next cache and start dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build cache
- `npm run clean:full` - Full clean reinstall (fixes most issues)
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed demo data
- `npm run db:studio` - Open Prisma Studio

## Troubleshooting

### Dev server shows blank page or hangs

This is usually caused by corrupted node_modules. Run:

```bash
npm run clean:full
```

This will:
1. Remove `.next` build cache
2. Remove `node_modules`
3. Remove `package-lock.json`
4. Reinstall all dependencies
5. Regenerate Prisma client

### Port already in use

Kill processes on the port:

```bash
lsof -ti:4000 | xargs kill -9
```

Or use a different port:

```bash
npm run dev -- -p 4001
```

### Database connection issues

1. Make sure Docker is running: `docker ps`
2. Start the database: `docker-compose up -d`
3. Check connection: `npm run db:studio`

## Future Integrations

The following integrations are mocked and ready for real implementation:

- **Stripe**: Payment processing for bookings and packages
- **OpenAI**: AI assistant for client insights
- **Email Service**: Resend/SendGrid for notifications
- **Consumer App**: Client data sync from Cratox AI mobile app

## License

Proprietary - Cratox AI
