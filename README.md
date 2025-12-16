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

3. **Create a `.env` file** in the root directory and add your API keys:
   ```
   VITE_GOOGLE_API_KEY=your_api_key_here
   ```
   You'll need to get API keys from Google and other services the app uses.

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

## Features

- 🎤 Voice commands with "Hey Buddy" wake word
- 🤖 AI-powered study assistance
- 📱 Phone detection to help you stay focused
- 🎨 Choose between neutral and sarcastic personality modes
- 🖥️ Screen capture for analyzing your work
- 🔊 Text-to-speech responses

## Troubleshooting

- **Dependencies not installing?** Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- **Port already in use?** The dev server will try to use a different port automatically
- **Backend not connecting?** Make sure the Python server is running on the expected port

That's it! You're ready to hack your homework. Good luck! 💪