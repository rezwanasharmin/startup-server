# StartupForge — Backend Server API

StartupForge is a backend service for the co-founder matching platform. It handles MongoDB Atlas database connections, user sessions (JWT cookies), Stripe Checkout flows, image upload endpoints, and administrative user controls.

This repository holds the server-side codebase built using **Node.js**, **Express.js**, and **Mongoose**.

## Key Features

- **JWT Authentication Cookie:** Generation and secure storage of JWTs inside HTTPOnly cookies, with custom route verification middleware.
- **Role-Based Access Control (RBAC):** Restricts admin panels, founder startup profiles, and collaborator job applications based on user roles.
- **Search & Filtering:** MongoDB regex-matching (`$regex`) for role queries and set membership matching (`$in`) for work types and industries.
- **Server-Side Pagination:** Performs paginated DB queries using Mongoose `.skip()` and `.limit()` on browse listings.
- **Premium Limit Check:** Restricts free founders to 3 opportunity listings. Verifies Stripe transaction history before allowing additional posts.
- **Stripe Integrations:** Exposes session generation endpoints and validates payments locally or via webhooks.
- **Admin Utilities:** Endpoints to lock/unlock user accounts, review and approve registered startups, and calculate platform stats.

## Database Models

- `User`: `name`, `email`, `password`, `image`, `role`, `isBlocked`, `skills`, `bio`
- `Startup`: `startup_name`, `logo`, `industry`, `description`, `funding_stage`, `founder_email`, `status`
- `Opportunity`: `startup_id`, `role_title`, `required_skills`, `work_type`, `commitment_level`, `deadline`
- `Application`: `Opportunity_id`, `Applicant_email`, `Portfolio_link`, `Motivation`, `Status`, `applied_at`
- `Payment`: `user_email`, `amount`, `transaction_id`, `payment_status`, `paid_at`

## Local Installation & Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the server root:
   ```env
   PORT=5000
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-signing-secret
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   IMGBB_API_KEY=your-imgbb-api-key
   ```
4. Run the database seed script to populate test data:
   ```bash
   node seed.js
   ```
5. Start the API server:
   ```bash
   npm start
   ```
