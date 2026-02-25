<div align="center">

![TrackIt Logo](client/public/trackit.svg)

**A modern, full-stack personal finance management application**

[Features](#features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [API Documentation](#api-documentation)

</div>

---

## Overview

TrackIt is a comprehensive personal finance management platform that helps users track income, expenses, investments, and savings. With an intuitive interface, powerful AI assistant, and robust budget management tools, TrackIt empowers users to take control of their financial health.

## Features

### 💰 Financial Management

- **Entry Management**: Track income, expenses, investments, and savings with detailed categorization
- **Budget Management**: Create and manage budgets with flexible time periods (monthly, quarterly, yearly)
- **Category Management**: Organize transactions with custom categories
- **Real-time Analytics**: Visualize financial data with interactive charts and progress indicators

### 🤖 AI-Powered Assistant

- **Natural Language Queries**: Ask questions about your finances in plain English
- **Smart Insights**: Get intelligent analysis of spending patterns and budget performance
- **Function-Based Architecture**: Secure, controlled access to financial data through a catalog system

### 🔐 Security & Authentication

- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: Quick sign-in with Google accounts
- **Email Verification**: Secure account activation via email
- **Password Reset**: Self-service password recovery
- **Role-Based Access**: Admin panel with user management capabilities

### 📊 Data Visualization

- **Interactive Charts**: Visualize income, expenses, investments, and savings trends
- **Progress Tracking**: Monitor budget utilization with real-time progress bars
- **Time-based Filtering**: Filter data by month, quarter, year, or custom date ranges

### 🎨 User Experience

- **Responsive Design**: Seamless experience across desktop, tablet, and mobile devices
- **Dark Mode**: Eye-friendly dark theme support
- **Modern UI**: Built with Radix UI components for accessibility and performance
- **Real-time Updates**: Instant synchronization across all views

## Tech Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Zustand** - State management
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **date-fns** - Date manipulation
- **Lucide React** - Icon library

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Token-based authentication
- **Winston** - Logging
- **Helmet** - Security headers
- **Express Rate Limit** - Rate limiting
- **Bcrypt** - Password hashing

### AI & Integrations

- **OpenAI gpt-4o** - AI assistant backend
- **SendGrid** - Email delivery

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **API Keys** (optional but recommended):
  - OpenAI API key (for AI assistant)
  - SendGrid API key (for email)
  - Google OAuth credentials (for Google sign-in)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd trackit
   ```

2. **Install frontend dependencies**

   ```bash
   cd client
   npm install
   ```

3. **Install backend dependencies**

   ```bash
   cd ../server
   npm install
   ```

4. **Configure environment variables**

   Create a `.env` file in the `server` directory:

   ```env
   # Required
   MONGOURI=mongodb://localhost:27017/trackit
   JWT_SECRET=your-secret-key-here
   CLIENT_URL=http://localhost:5173
   SENDGRID_API_KEY=your-sendgrid-api-key

   # Optional
   OPENAI_API_KEY=your-openai-api-key
   EMAIL_FROM=noreply@trackit.com
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NODE_ENV=development
   PORT=5000
   ```

   Create a `.env` file in the `client` directory (if needed):

   ```env
   VITE_API_URL=http://localhost:5000
   ```

5. **Start the development servers**

   **Terminal 1 - Backend:**

   ```bash
   cd server
   npm run dev
   ```

   Server will run on `http://localhost:5000`

   **Terminal 2 - Frontend:**

   ```bash
   cd client
   npm run dev
   ```

   Client will run on `http://localhost:5173`

6. **Open your browser**
   Navigate to `http://localhost:5173`

### Creating an Admin User

To create an admin user, run:

```bash
cd server
node scripts/createAdmin.js
```

## Project Structure

```
trackit/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── api/           # API service functions
│   │   ├── components/    # React components
│   │   │   ├── ui/        # Reusable UI components
│   │   │   ├── charts/    # Chart components
│   │   │   └── budget/    # Budget-related components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── constants/     # Constants and configurations
│   ├── public/            # Static assets
│   └── package.json
│
├── server/                # Node.js backend application
│   ├── config/            # Configuration files
│   │   ├── db.js          # Database connection
│   │   └── passport.js    # Passport configuration
│   ├── controllers/       # Route controllers
│   ├── models/            # Mongoose models
│   ├── routes/            # Express routes
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utility functions
│   ├── scripts/           # Utility scripts
│   ├── docs/              # Documentation
│   └── server.js          # Entry point
│
└── README.md
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/google` - Google OAuth authentication

### Entry Endpoints

- `GET /api/entries` - Get all entries (with filters)
- `POST /api/entries` - Create a new entry
- `PUT /api/entries/:id` - Update an entry
- `DELETE /api/entries/:id` - Delete an entry

### Budget Endpoints

- `GET /api/budgets` - Get all budgets
- `POST /api/budgets` - Create a new budget
- `PUT /api/budgets/:id` - Update a budget
- `DELETE /api/budgets/:id` - Delete a budget

### Category Endpoints

- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create a new category
- `PUT /api/categories/:id` - Update a category
- `DELETE /api/categories/:id` - Delete a category

### Assistant Endpoints

- `POST /api/assistant` - Chat with AI assistant
- `GET /api/assistant/functions` - Get available function catalog

### Admin Endpoints

- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

### Feedback Endpoints

- `POST /api/feedback` - Submit feedback

## Available Scripts

### Client Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server Scripts

```bash
npm start        # Start production server
npm run dev      # Start development server with nodemon
npm run seed:entries  # Seed sample entries
```

## Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Prevent abuse
- **JWT Tokens** - Secure authentication
- **Password Hashing** - Bcrypt encryption
- **Input Validation** - Request validation
- **CORS** - Cross-origin resource sharing configuration
- **Error Handling** - Centralized error management

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint for code quality
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@trackit.com or open an issue in the repository.

## Acknowledgments

- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Recharts](https://recharts.org/) for data visualization
- [OpenAI](https://openai.com/) for AI capabilities

<!-- <div align="center">

Made with ❤️ by the TrackIt team

</div> -->
