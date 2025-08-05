# CFDI Automation - Zeabur Deployment Guide

## 🚀 **Complete Deployment Roadmap**

This guide provides step-by-step instructions for deploying your CFDI Automation application on Zeabur using GitHub as the code source.

## 📋 **Prerequisites**

1. **GitHub Repository**: Your code must be pushed to GitHub
2. **Zeabur Account**: Sign up at [zeabur.com](https://zeabur.com)
3. **Environment Variables**: Prepare all required API keys and configuration

## 🏗️ **Architecture for Zeabur**

Since Zeabur doesn't support Docker Compose, we'll deploy each service separately:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │ Python Browser  │
│   (Next.js)     │    │   (Express)     │    │   (Playwright)  │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 9000    │
│   Zeabur URL    │    │   Zeabur URL    │    │   Zeabur URL    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 **Step-by-Step Deployment**

### **Step 1: Prepare Your Repository**

1. **Ensure all files are committed and pushed to GitHub**
2. **Verify Dockerfiles are correct** (we've fixed the empty frontend/Dockerfile)
3. **Check that your repository structure is correct**

### **Step 2: Deploy Frontend Service**

1. **Go to Zeabur Dashboard**
   - Visit [zeabur.com](https://zeabur.com)
   - Sign in to your account

2. **Create New Project**
   - Click "New Project"
   - Select "GitHub" as source
   - Choose your repository: `Gaman-AI/Facturas_agent`

3. **Configure Frontend Service**
   - **Service Name**: `frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Start Command**: `node server.js`
   - **Port**: `3000`

4. **Set Environment Variables**
   ```
   NODE_ENV=production
   NEXT_TELEMETRY_DISABLED=1
   NEXT_PUBLIC_SUPABASE_URL=https://pffuarlnpdpfjrvewrqo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-service.zeabur.app
   NEXT_PUBLIC_WS_BASE_URL=wss://your-backend-service.zeabur.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### **Step 3: Deploy Backend API Service**

1. **Create Another Service**
   - In the same project, click "Add Service"
   - Select your GitHub repository again

2. **Configure Backend Service**
   - **Service Name**: `backend-api`
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Start Command**: `node dist/index.js`
   - **Port**: `8000`

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   SUPABASE_URL=https://pffuarlnpdpfjrvewrqo.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret
   PYTHON_SERVICE_URL=https://your-python-service.zeabur.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### **Step 4: Deploy Python Browser Service**

1. **Create Python Service**
   - In the same project, click "Add Service"
   - Select your GitHub repository again

2. **Configure Python Service**
   - **Service Name**: `python-browser`
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty (uses Dockerfile)
   - **Start Command**: `python api_server.py`
   - **Port**: `9000`

3. **Set Environment Variables**
   ```
   PYTHON_ENV=production
   BROWSERBASE_API_KEY=your_browserbase_api_key
   BROWSERBASE_PROJECT_ID=your_browserbase_project_id
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## 🔗 **Service Communication**

### **Update Frontend Environment Variables**

After deploying backend services, update the frontend environment variables with the actual Zeabur URLs:

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-service.zeabur.app
NEXT_PUBLIC_WS_BASE_URL=wss://your-backend-service.zeabur.app
```

### **Update Backend Environment Variables**

Update the backend service with the Python service URL:

```
PYTHON_SERVICE_URL=https://your-python-service.zeabur.app
```

## 🌐 **Domain Configuration**

### **Custom Domains (Optional)**

1. **Frontend Domain**
   - Go to your frontend service settings
   - Click "Custom Domain"
   - Add your domain (e.g., `app.yourdomain.com`)

2. **API Domain**
   - Go to your backend service settings
   - Click "Custom Domain"
   - Add your API domain (e.g., `api.yourdomain.com`)

## 🔍 **Troubleshooting**

### **Common Issues and Solutions**

#### **1. Build Failures**
- **Issue**: Docker build fails
- **Solution**: Check Dockerfile syntax and dependencies

#### **2. Environment Variables**
- **Issue**: Services can't connect to each other
- **Solution**: Verify all URLs are correct and services are deployed

#### **3. Port Configuration**
- **Issue**: Services not accessible
- **Solution**: Ensure correct ports are configured in Zeabur

#### **4. Health Checks**
- **Issue**: Services showing as unhealthy
- **Solution**: Verify health check endpoints are working

## 📊 **Monitoring and Logs**

### **View Logs**
1. Go to your service in Zeabur dashboard
2. Click "Logs" tab
3. Monitor real-time logs for debugging

### **Health Monitoring**
1. Go to your service in Zeabur dashboard
2. Click "Metrics" tab
3. Monitor performance and uptime

## 🔐 **Security Considerations**

### **Environment Variables**
- Never commit sensitive data to GitHub
- Use Zeabur's environment variable management
- Rotate API keys regularly

### **Service Communication**
- Use HTTPS for all service communication
- Implement proper authentication
- Monitor for unauthorized access

## 📈 **Scaling**

### **Automatic Scaling**
- Zeabur provides automatic scaling based on traffic
- Monitor usage in the dashboard
- Upgrade plans as needed

### **Manual Scaling**
- Go to service settings
- Adjust resources as required
- Monitor performance impact

## 🎯 **Deployment Checklist**

### **Pre-Deployment**
- [ ] All code committed to GitHub
- [ ] Dockerfiles are correct and tested
- [ ] Environment variables prepared
- [ ] API keys and secrets ready

### **Deployment**
- [ ] Frontend service deployed
- [ ] Backend API service deployed
- [ ] Python browser service deployed
- [ ] Environment variables configured
- [ ] Service URLs updated

### **Post-Deployment**
- [ ] Health checks passing
- [ ] Services communicating correctly
- [ ] Application functionality tested
- [ ] Monitoring configured
- [ ] Documentation updated

## 🚀 **Quick Start Commands**

### **Local Testing (Before Deployment)**
```bash
# Test frontend build
cd frontend
docker build -t frontend-test .

# Test backend build
cd backend
docker build -f Dockerfile.nodejs -t backend-test .

# Test python service build
docker build -f Dockerfile.python -t python-test .
```

### **Zeabur CLI (Optional)**
```bash
# Install Zeabur CLI
npm install -g @zeabur/cli

# Login to Zeabur
zeabur login

# Deploy from CLI
zeabur deploy
```

## 📞 **Support**

### **Zeabur Support**
- Documentation: [docs.zeabur.com](https://docs.zeabur.com)
- Community: [discord.gg/zeabur](https://discord.gg/zeabur)
- Email: support@zeabur.com

### **Project Support**
- GitHub Issues: [github.com/Gaman-AI/Facturas_agent/issues](https://github.com/Gaman-AI/Facturas_agent/issues)
- Documentation: Check project README and docs

---

**Deployment Guide Created**: January 31, 2025  
**Last Updated**: January 31, 2025  
**Status**: Ready for Deployment 