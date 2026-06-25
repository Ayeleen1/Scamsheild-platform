# ScamShield Platform

A comprehensive AI-powered scam detection and prevention platform with real-time analysis, community reporting, and browser extension integration.

## 🎯 Overview

ScamShield Platform is an intelligent system designed to detect, analyze, and prevent various types of scams including phishing attacks, malicious URLs, fraudulent images, and malware. It combines AI/ML capabilities with a community-driven approach to keep users safe from online threats.

## ✨ Features

### Core Capabilities
- **URL Scanner**: Analyze URLs for phishing, malware, and scam indicators
- **Image Verification**: Verify authenticity of images using computer vision
- **File Scanner**: Detect malware and suspicious files
- **AI-Powered Chat Assistant**: Real-time threat analysis through conversational AI
- **Profile Checker**: Verify authenticity of social media and online profiles
- **Community Reporting**: Crowdsourced threat intelligence and reporting

### Security Features
- Advanced AI/ML-based scam detection
- Real-time threat analysis and classification
- OpenAI integration for intelligent analysis
- Rate limiting and security headers
- JWT-based authentication with 2FA support
- Secure password management with bcrypt
- CORS and middleware security layers

### User Features
- Multi-page SPA (Single Page Application)
- Fast mode for quick scans
- Admin dashboard for threat management
- User account management
- Email verification
- Password reset functionality
- Multi-language support (i18n)
- Responsive design with Tailwind CSS

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Database**: MongoDB / SQLite (configurable)
- **Authentication**: JWT + Python-Jose
- **ORM**: Motor (async MongoDB driver)
- **Validation**: Pydantic
- **AI Integration**: OpenAI API
- **Email**: Email validation support
- **Authentication**: TOTP (Two-Factor Authentication)

### Frontend
- **Framework**: Next.js 16.2.6
- **UI**: React 18.3.1
- **Styling**: Tailwind CSS 3.4.4
- **Language**: TypeScript 5.5.2
- **Build Tool**: Next.js with autoprefixer and PostCSS

### Browser Extension
- Vanilla JavaScript implementation
- Content scripts for page analysis
- Background service workers
- Manifest v3 compatible

## 📁 Project Structure

```
scamshield-platform/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI application entry point
│   │   ├── api/               # API route handlers
│   │   │   └── v1/            # Version 1 API routes
│   │   ├── core/              # Core configuration and utilities
│   │   ├── db/                # Database clients and repositories
│   │   ├── middleware/        # Custom middleware (rate limiting, security)
│   │   ├── routers/           # API endpoint routers
│   │   ├── schemas/           # Pydantic models for validation
│   │   └── services/          # Business logic (AI, scanning, etc.)
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app directory
│   │   ├── components/        # Reusable React components
│   │   └── lib/               # Utility functions and helpers
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.mjs
│
├── browser-extension/         # Chrome/Brave extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── README.md
│
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+** (for backend)
- **Node.js 18+** (for frontend)
- **MongoDB** (or SQLite for development)
- **OpenAI API key** (for AI features)
- **Git**

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Create virtual environment**:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment variables** - Create `.env` file:
```env
# Database
DATABASE_BACKEND=sqlite  # or mongo
DATABASE_URL=sqlite:///./scamshield.db
MONGODB_URL=mongodb://localhost:27017/scamshield

# API Configuration
API_TITLE=ScamShield AI
API_VERSION=1.0.0
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-app-password
```

5. **Run the backend**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs` (Swagger UI)
- Alternative Docs: `http://localhost:8000/redoc` (ReDoc)

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment** - Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=ScamShield
```

4. **Run the development server**:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

5. **Build for production**:
```bash
npm run build
npm start
```

### Browser Extension Setup

1. **Open your browser** (Chrome, Brave, Edge):
   - Chrome/Edge: `chrome://extensions/`
   - Brave: `brave://extensions/`

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Load unpacked extension**:
   - Click "Load unpacked"
   - Navigate to and select the `browser-extension/` folder

4. **Extension is now active** and ready to scan URLs and content

## 📚 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /verify-email` - Verify email address
- `POST /forgot-password` - Reset password
- `POST /change-password` - Change user password

### Scanning (`/api/v1/scan`)
- `POST /url` - Scan URL for threats
- `POST /file` - Scan file for malware
- `POST /image` - Verify image authenticity
- `POST /profile` - Check profile authenticity

### Chat (`/api/v1/chat`)
- `POST /message` - Send message to AI assistant
- `GET /history` - Get conversation history

### Community (`/api/v1/community`)
- `POST /report` - Submit threat report
- `GET /threats` - Get recent threats
- `GET /statistics` - Get threat statistics

## 🔐 Security Features

- **Authentication**: JWT tokens with configurable expiration
- **Password Security**: bcrypt hashing with salt
- **Rate Limiting**: Request throttling to prevent abuse (100 requests/minute)
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Custom security headers middleware
- **Input Validation**: Pydantic schema validation
- **2FA Support**: TOTP implementation for enhanced security
- **Environment Variables**: Sensitive data management via `.env`

## 🧪 Testing

Run tests from the backend directory:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py
```

## 📖 Documentation

- **API Docs**: Available at `/docs` (Swagger UI) when backend is running
- **Frontend Components**: See `frontend/src/components/` for component documentation
- **Browser Extension**: See `browser-extension/README.md`

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style
- Backend: Follow PEP 8 guidelines
- Frontend: Use ESLint configuration from Next.js
- Use meaningful commit messages

## 🐛 Troubleshooting

### Backend Won't Start
- Check Python version: `python --version`
- Verify virtual environment is activated
- Check `.env` file configuration
- Review logs for specific error messages

### Frontend Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version`

### Database Connection Issues
- Verify MongoDB is running (if using MongoDB)
- Check connection string in `.env`
- Ensure database credentials are correct

### Extension Not Loading
- Verify manifest.json is valid
- Enable Developer Mode in browser extensions page
- Check browser console for error messages

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Support

For support, issues, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check existing documentation and FAQs

## 🙏 Acknowledgments

- FastAPI documentation and community
- Next.js and Vercel for frontend framework
- OpenAI for AI/ML capabilities
- MongoDB for database solutions
- All contributors and users

---

**Last Updated**: 2026-06-25
**Status**: Active Development
