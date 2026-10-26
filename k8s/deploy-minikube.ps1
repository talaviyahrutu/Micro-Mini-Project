# ========================================================
# API Sentinel — Minikube Deployment Script (PowerShell)
# ========================================================

Write-Host "🛡️ Starting API Sentinel Kubernetes Cluster Deployment on Minikube..." -ForegroundColor Cyan

# 1. Verify Minikube status
$minikubeStatus = minikube status --format='{{.Host}}' 2>$null
if ($minikubeStatus -ne "Running") {
    Write-Host "▶️ Starting Minikube cluster..." -ForegroundColor Yellow
    minikube start --driver=docker
}

# 2. Point local Docker CLI to Minikube's internal Docker daemon
Write-Host "🔄 Configuring Docker environment for Minikube..." -ForegroundColor Yellow
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

# 3. Build Docker container images directly into Minikube
Write-Host "🐳 Building sentinel-backend image inside Minikube..." -ForegroundColor Yellow
docker build -t sentinel-backend:latest ./backend

Write-Host "🐳 Building sentinel-frontend image inside Minikube..." -ForegroundColor Yellow
docker build -t sentinel-frontend:latest ./frontend

# 4. Apply Kubernetes Manifests in order
Write-Host "📦 Applying Persistent Volume Claim for MongoDB..." -ForegroundColor Green
kubectl apply -f ./k8s/mongo-pvc.yaml

Write-Host "📦 Deploying MongoDB and Service..." -ForegroundColor Green
kubectl apply -f ./k8s/mongo-deployment.yaml

Write-Host "📦 Applying ConfigMaps and Secrets..." -ForegroundColor Green
kubectl apply -f ./k8s/backend-configmap.yaml

Write-Host "📦 Deploying Backend Service..." -ForegroundColor Green
kubectl apply -f ./k8s/backend-deployment.yaml

Write-Host "📦 Deploying Frontend Service..." -ForegroundColor Green
kubectl apply -f ./k8s/frontend-deployment.yaml

# 5. Display Cluster Status
Write-Host "`n✅ Kubernetes Deployment Complete!" -ForegroundColor Green
Write-Host "Listing Pods:" -ForegroundColor Cyan
kubectl get pods -l app=sentinel

Write-Host "`nListing Services:" -ForegroundColor Cyan
kubectl get services -l app=sentinel

Write-Host "`n🌐 To access the API Sentinel frontend dashboard in browser, execute:" -ForegroundColor Magenta
Write-Host "minikube service frontend-service" -ForegroundColor White
