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
- React 18 - Component-based UI framework
- TypeScript - Type safety and developer experience
- Vite - Instant server start and fast HMR
- Tailwind CSS - Rapid styling with utility classes
- shadcn/ui - Pre-built accessible components
- Radix UI - Accessible component primitives
- React Router - Multi-page app routing
- React Query - Server state and caching
- Lucide React - Consistent icon system
- Sonner - Modern toast notifications
- Google Generative AI SDK - AI responses via Gemini
- Web Speech API - Voice input/output functionality
- class-variance-authority - Type-safe component variants
- next-themes - Light/dark mode switching
- cmdk - Command palette interface
- embla-carousel-react - Carousel component
- vaul - Drawer/modal component
- input-otp - OTP input field
- react-resizable-panels - Resizable UI layouts
- clsx - Conditional class management
- tailwind-merge - Smart class conflict resolution

### Backend
- Python - Rapid development and ML libraries
- FastAPI - High-performance API framework
- Uvicorn - ASGI server for async support
- PyTorch - Deep learning model inference
- YOLOv5 - Real-time phone detection
- Pillow - Image processing and conversion
- Python-multipart - File upload handling
- OpenCV - Computer vision operations
- python-dotenv - Secure credential management
- Requests - HTTP communication

### Development Tools
- Node.js - JavaScript runtime environment
- npm - Dependency management
- Vite - Build tool with React plugin support
- Tailwind CSS - Styling with PostCSS integration

## Troubleshooting

- **Dependencies not installing?** Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- **Port already in use?** The dev server will try to use a different port automatically
- **Backend not connecting?** Make sure the Python server is running on the expected port

Done! You're ready to hack your homework. Good luck!