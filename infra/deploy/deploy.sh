#!/bin/bash
# Mock script to deploy DeepTrace to cloud (e.g. AWS ECS or GCP Cloud Run)

set -e

PROJECT_ID=${GCP_PROJECT_ID:-"my-deeptrace-project"}
REGION=${GCP_REGION:-"us-central1"}
FRONTEND_IMAGE="gcr.io/$PROJECT_ID/deeptrace-frontend:latest"
BACKEND_IMAGE="gcr.io/$PROJECT_ID/deeptrace-backend:latest"

echo "============================================="
echo " Deploying DeepTrace MVP to Cloud Run "
echo "============================================="

# 1. Build and push backend
echo "Building Backend Image..."
# docker build -t $BACKEND_IMAGE -f src/backend/Dockerfile .
# docker push $BACKEND_IMAGE

# 2. Build and push frontend
echo "Building Frontend Image..."
# docker build -t $FRONTEND_IMAGE -f src/frontend/Dockerfile src/frontend/
# docker push $FRONTEND_IMAGE

# 3. Deploy Backend
echo "Deploying Backend service..."
# gcloud run deploy deeptrace-backend --image $BACKEND_IMAGE \
#   --region $REGION --platform managed --allow-unauthenticated \
#   --memory 2Gi --cpu 2

# BACKEND_URL=$(gcloud run services describe deeptrace-backend --region $REGION --format 'value(status.url)')

# 4. Deploy Frontend (update with backend URL)
echo "Deploying Frontend service..."
# gcloud run deploy deeptrace-frontend --image $FRONTEND_IMAGE \
#   --region $REGION --platform managed --allow-unauthenticated \
#   --set-env-vars VITE_API_URL=$BACKEND_URL

echo "Deployment successful! Example URLs:"
echo "Backend: https://deeptrace-backend-xxx.a.run.app"
echo "Frontend: https://deeptrace-frontend-xxx.a.run.app"
