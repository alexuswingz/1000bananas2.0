@echo off
echo Installing backend dependencies for SP-API...
npm install express cors axios dotenv concurrently --save
echo.
echo ✅ Backend dependencies installed!
echo.
echo To start both frontend and backend:
echo   npm run dev
echo.
echo Or start them separately:
echo   npm start           (frontend only)
echo   npm run server      (backend only)
pause


