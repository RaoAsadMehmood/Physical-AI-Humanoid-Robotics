#!/bin/bash

# Deployment script for Physical AI & Humanoid Robotics Platform
# This script deploys the backend API, Docusaurus frontend, and all integrated features

set -e  # Exit on any error

echo "🚀 Starting deployment of Physical AI & Humanoid Robotics Platform..."

# Configuration
ENVIRONMENT=${1:-production}
BACKEND_DIR="backend"
FRONTEND_DIR="docusaurus-book"
CONFIG_FILE=".env.${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (not recommended for production)
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

# Load environment variables
if [ -f "$CONFIG_FILE" ]; then
    print_status "Loading configuration from $CONFIG_FILE"
    export $(cat $CONFIG_FILE | xargs)
else
    print_warning "Configuration file $CONFIG_FILE not found. Using defaults."
fi

# Build and deploy backend
print_status "Building and deploying backend services..."

cd $BACKEND_DIR

# Build backend Docker image
print_status "Building backend Docker image..."
docker build -t physical-ai-backend:latest .

# Deploy backend services
print_status "Starting backend services..."
docker-compose -f docker-compose.yml up -d --build

cd ..

# Build and deploy frontend
print_status "Building and deploying frontend..."

cd $FRONTEND_DIR

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Build static site
print_status "Building Docusaurus site..."
npm run build

# Build frontend Docker image
print_status "Building frontend Docker image..."
docker build -t physical-ai-frontend:latest .

# Deploy frontend services
print_status "Starting frontend services..."
docker-compose -f docker-compose.yml up -d --build

cd ..

# Run database migrations
print_status "Running database migrations..."
docker-compose -f backend/docker-compose.yml exec -T backend python -m alembic upgrade head

# Index documentation for RAG search
print_status "Indexing documentation for RAG search..."
docker-compose -f backend/docker-compose.yml exec -T backend python -m src.scripts.index_docusaurus_content

# Run health checks
print_status "Running health checks..."

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    print_status "Backend is healthy (HTTP $BACKEND_HEALTH)"
else
    print_error "Backend is not healthy (HTTP $BACKEND_HEALTH)"
fi

# Check frontend health
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    print_status "Frontend is healthy (HTTP $FRONTEND_HEALTH)"
else
    print_error "Frontend is not healthy (HTTP $FRONTEND_HEALTH)"
fi

# Wait for services to be fully ready
print_status "Waiting for services to be fully ready..."
sleep 10

# Run basic integration tests
print_status "Running basic integration tests..."
python -m pytest tests/integration_tests.py --tb=short

# Backup current deployment
print_status "Creating backup of current deployment..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/deployment_${TIMESTAMP}"
mkdir -p $BACKUP_DIR

# Copy important configuration files
cp -r backend/config $BACKUP_DIR/ 2>/dev/null || true
cp -r docusaurus-book/docusaurus.config.js $BACKUP_DIR/ 2>/dev/null || true
cp -r docusaurus-book/sidebars.js $BACKUP_DIR/ 2>/dev/null || true

print_status "Backup created at $BACKUP_DIR"

# Update DNS/load balancer configuration (placeholder)
print_status "Updating DNS/load balancer configuration..."
# This would typically involve updating your DNS provider or load balancer
# For now, we'll just log this step
echo "$(date): Deployment completed" >> deployment.log

# Restart services to ensure clean state
print_status "Restarting services to ensure clean state..."
docker-compose -f backend/docker-compose.yml restart
docker-compose -f docusaurus-book/docker-compose.yml restart

# Wait for restart
sleep 15

# Final health check
print_status "Running final health checks..."

FINAL_BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health || echo "000")
FINAL_FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$FINAL_BACKEND_HEALTH" = "200" ] && [ "$FINAL_FRONTEND_HEALTH" = "200" ]; then
    print_status "🎉 Deployment completed successfully!"
    print_status "Backend: http://localhost:8000 (Health: $FINAL_BACKEND_HEALTH)"
    print_status "Frontend: http://localhost:3000 (Health: $FINAL_FRONTEND_HEALTH)"

    # Display deployment summary
    echo ""
    echo "=================================================="
    echo "DEPLOYMENT SUMMARY"
    echo "=================================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo "Backend Health: $FINAL_BACKEND_HEALTH"
    echo "Frontend Health: $FINAL_FRONTEND_HEALTH"
    echo "Backup Location: $BACKUP_DIR"
    echo "=================================================="

    exit 0
else
    print_error "❌ Deployment failed! Services are not healthy."
    print_error "Backend: $FINAL_BACKEND_HEALTH, Frontend: $FINAL_FRONTEND_HEALTH"
    exit 1
fi

print_status "Deployment process completed!"