# Homework Hacker

Your AI-powered study companion that helps you focus and crush your assignments.

## Getting Started

Follow these steps to get the app running on your computer.

### Prerequisites

Make sure you have:
- **Node.js** installed (download from [nodejs.org](https://nodejs.org))
- **npm** (comes with Node.js, so you should be good)

### Setup Instructions

1. **Clone or download the project** to your computer

2. **Open a terminal** in the project directory and install dependencies:
   ```bash
   npm install
   ```
   This downloads all the packages the app needs to run.

3. **Download the `.env` file from the gc** and paste it in the root directory

4. **Install Python dependencies** for the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```
   This installs the packages needed for the AI features.

5. **Start the development server** (both frontend and backend):
   ```bash
   npm run dev
   ```
   This starts everything at once - the React frontend at `http://localhost:5173` and the Python backend at `http://localhost:8000`. Open the frontend URL in your browser and you're good to go!

### Build for Production

When you're ready to deploy:
```bash
npm run build
```
This creates an optimized version of the app in the `dist` folder.

## Technologies Used

### Frontend
- React 18 - UI library for building interactive components
- TypeScript - Superset of JavaScript with static typing
- Vite - Fast build tool and development server
- Tailwind CSS - Utility-first CSS framework for styling
- shadcn/ui - Accessible React components built on Radix UI primitives
- Radix UI - Headless UI component library for accessibility
- React Hook Form - Efficient form state management
- React Query - Server state management and data fetching
- React Router - Client-side routing
- Zod - TypeScript-first schema validation
- Lucide React - Icon library
- Recharts - Data visualization library
- Sonner - Toast notification system
- Google Generative AI SDK - Integration with Gemini API
- Web Speech API - Native browser speech recognition and synthesis

### Backend
- Python - Core programming language
- FastAPI - Modern web framework for building APIs
- Uvicorn - ASGI server for running FastAPI
- PyTorch - Deep learning framework
- YOLOv5 - Object detection model for phone detection
- Pillow - Image processing library
- Python-multipart - Multipart request parsing
- OpenCV - Computer vision library
- python-dotenv - Environment variable management
- Requests - HTTP client library

### Development Tools
- Node.js - JavaScript runtime
- npm - Package manager
- ESLint - Code linting
- TypeScript ESLint - TypeScript linting
- Concurrently - Run multiple processes in parallel
- PostCSS - CSS processing tool
- Autoprefixer - Vendor prefix automation
- SWC - Fast JavaScript/TypeScript compiler

## Troubleshooting

- **Dependencies not installing?** Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- **Port already in use?** The dev server will try to use a different port automatically
- **Backend not connecting?** Make sure the Python server is running on the expected port

Done! You're ready to hack your homework. Good luck!