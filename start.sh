#!/bin/bash

echo "============================================"
echo "  AI Book Publishing Pipeline - Startup"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}[OK]${NC} Environment variables loaded"
else
  echo -e "${RED}[ERROR]${NC} .env file not found!"
  exit 1
fi

BACKEND_PORT=${BACKEND_PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill processes on used ports
echo -e "${YELLOW}[CLEANUP]${NC} Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1
echo -e "${GREEN}[OK]${NC} Ports cleaned"

# Check PostgreSQL
echo -e "${BLUE}[CHECK]${NC} Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}[WARN]${NC} PostgreSQL not running, attempting to start..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  sleep 3
fi

if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}[OK]${NC} PostgreSQL is running"
else
  echo -e "${RED}[ERROR]${NC} PostgreSQL is not running. Please start it manually."
  exit 1
fi

# Create database if not exists
echo -e "${BLUE}[DB]${NC} Setting up database..."
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'bookpublishing'" 2>/dev/null | grep -q 1 || psql -U postgres -c "CREATE DATABASE bookpublishing" 2>/dev/null
if [ $? -ne 0 ]; then
  createdb bookpublishing 2>/dev/null
fi
echo -e "${GREEN}[OK]${NC} Database ready"

# Install backend dependencies
echo -e "${BLUE}[INSTALL]${NC} Installing backend dependencies..."
cd backend
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}[OK]${NC} Backend dependencies installed"

# Run seed
echo -e "${BLUE}[SEED]${NC} Seeding database with sample data..."
node seed.js
echo -e "${GREEN}[OK]${NC} Database seeded"

# Start backend with nodemon (auto-reload)
echo -e "${BLUE}[START]${NC} Starting backend on port $BACKEND_PORT with auto-reload..."
npx nodemon server.js &
BACKEND_PID=$!
cd ..

# Install frontend dependencies
echo -e "${BLUE}[INSTALL]${NC} Installing frontend dependencies..."
cd frontend
npm install --silent 2>&1 | tail -1
echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"

# Start frontend (React auto-reloads by default)
echo -e "${BLUE}[START]${NC} Starting frontend on port $FRONTEND_PORT with hot-reload..."
PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo -e "  ${GREEN}AI Book Publishing Pipeline Started!${NC}"
echo "============================================"
echo ""
echo -e "  Frontend:  ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:   ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "  Login:     ${YELLOW}admin@bookpublishing.com${NC}"
echo -e "  Password:  ${YELLOW}password123${NC}"
echo ""
echo -e "  ${GREEN}Both servers auto-reload on code changes${NC}"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "============================================"

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${YELLOW}[SHUTDOWN]${NC} Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
  lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
  echo -e "${GREEN}[OK]${NC} All services stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
