# Startup Instructions

This document provides instructions for setting up and running both the backend and frontend components of the application.

## Prerequisites

- Python 3.9+ for the backend
- Node.js 16+ for the frontend
- Git

## Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```
     source venv/bin/activate
     ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Create a `.env` file:
   ```
   copy .env.example .env
   ```

6. Edit the `.env` file and add your API keys and configuration.

7. Start the backend server:
   ```
   python main.py
   ```

The backend server will start on http://localhost:8000 by default.

## Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```
   or if you use yarn:
   ```
   yarn install
   ```

3. Create environment files:
   ```
   copy .env.example .env
   copy .env.example .env.local
   ```

4. Start the development server:
   ```
   npm run dev
   ```
   or with yarn:
   ```
   yarn dev
   ```

The frontend will be available at http://localhost:3000 by default.

## Using the Application

1. Make sure both backend and frontend servers are running.
2. Open your browser and navigate to http://localhost:3000.
3. You should now be able to use the application with the CFDI agent functionality.

## Troubleshooting

- If you encounter connection issues, ensure the backend server is running and the frontend environment variables are correctly pointing to the backend URL.
- Check the console logs for both frontend and backend for any error messages.
- Ensure all required API keys are properly set in the backend `.env` file.