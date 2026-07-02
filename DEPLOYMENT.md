# 🚀 Deployment Guide

This guide covers deploying MediScan to production environments.

## 📋 Pre-Deployment Checklist

- [ ] All features tested and working
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] API keys are valid and active
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated
- [ ] Team review completed

## 🌐 Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend)

#### Frontend Deployment on Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure:
     - Framework: Other
     - Root Directory: `frontend`
     - Build Command: (leave empty)
     - Output Directory: `.`

3. **Add Environment Variables**
   - Add Firebase configuration as environment variables

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-app.vercel.app`

#### Backend Deployment on Render

1. **Create New Web Service**
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect GitHub repository

2. **Configure Service**
   - Name: `mediscan-api`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`

3. **Add Environment Variables**
   ```
   PORT=3001
   NODE_ENV=production
   MONGODB_URI=your_connection_string
   GEMINI_API_KEY=your_key
   GOOGLE_MAPS_API_KEY=your_key
   JWT_SECRET=your_secret
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment

### Option 2: Heroku (Full Stack)

#### Prerequisites
```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku  # Mac
# Or download from https://devcenter.heroku.com/articles/heroku-cli
```

#### Deploy Backend

```bash
cd backend
heroku login
heroku create mediscan-api

# Set environment variables
heroku config:set MONGODB_URI=your_connection_string
heroku config:set GEMINI_API_KEY=your_key
heroku config:set GOOGLE_MAPS_API_KEY=your_key
heroku config:set JWT_SECRET=your_secret

# Create Procfile
echo "web: node server.js" > Procfile

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a mediscan-api
git push heroku main
```

#### Deploy Frontend

```bash
cd frontend
heroku create mediscan-app

# Create static.json for serving
cat > static.json << EOF
{
  "root": ".",
  "clean_urls": true,
  "routes": {
    "/**": "index.html"
  }
}
EOF

# Deploy
git init
git add .
git commit -m "Deploy frontend"
heroku git:remote -a mediscan-app
git push heroku main
```

### Option 3: AWS (Production Grade)

#### Backend on AWS Elastic Beanstalk

1. **Install AWS CLI**
   ```bash
   pip install awscli awsebcli
   aws configure
   ```

2. **Initialize EB**
   ```bash
   cd backend
   eb init -p node.js mediscan-api
   ```

3. **Create Environment**
   ```bash
   eb create production
   eb setenv MONGODB_URI=xxx GEMINI_API_KEY=xxx
   ```

4. **Deploy**
   ```bash
   eb deploy
   ```

#### Frontend on AWS S3 + CloudFront

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://mediscan-app
   ```

2. **Upload Files**
   ```bash
   cd frontend
   aws s3 sync . s3://mediscan-app --acl public-read
   ```

3. **Enable Static Website**
   ```bash
   aws s3 website s3://mediscan-app --index-document index.html
   ```

4. **Configure CloudFront** (optional for HTTPS/CDN)

### Option 4: DigitalOcean Droplet

#### Setup Droplet

1. **Create Droplet**
   - OS: Ubuntu 22.04
   - Size: Basic ($6/month)
   - Datacenter: Nearest to users

2. **SSH into Droplet**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Dependencies**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
   apt install -y nodejs
   
   # Install Python
   apt install -y python3 python3-pip
   
   # Install Nginx
   apt install -y nginx
   
   # Install PM2
   npm install -g pm2
   ```

4. **Clone Repository**
   ```bash
   cd /var/www
   git clone https://github.com/YOUR_USERNAME/HTF25-Team-111.git
   cd HTF25-Team-111
   ```

5. **Setup Backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   nano .env
   # Add your environment variables
   
   # Start with PM2
   pm2 start server.js --name mediscan-api
   pm2 save
   pm2 startup
   ```

6. **Setup NLP Service**
   ```bash
   cd ../nlp-service
   pip3 install -r requirements.txt
   pm2 start medical_nlp_service.py --name mediscan-nlp --interpreter python3
   ```

7. **Configure Nginx**
   ```bash
   nano /etc/nginx/sites-available/mediscan
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name your_domain.com;
       
       # Frontend
       location / {
           root /var/www/HTF25-Team-111/frontend;
           index index.html;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable site:
   ```bash
   ln -s /etc/nginx/sites-available/mediscan /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d your_domain.com
   ```

## 🔒 Security Checklist

### Production Security

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up CORS properly
- [ ] Hide API keys in environment variables
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Configure firewall
- [ ] Regular security updates
- [ ] Backup database regularly

### Environment Variables in Production

```javascript
// backend/server.js
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : 'http://localhost:8000',
    credentials: true
};
```

## 📊 Monitoring & Logging

### Setup Logging

```javascript
// backend/server.js
const morgan = require('morgan');
const winston = require('winston');

// Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
```

### Monitoring Tools

- **Uptime Monitoring**: [UptimeRobot](https://uptimerobot.com/)
- **Error Tracking**: [Sentry](https://sentry.io/)
- **Performance**: [New Relic](https://newrelic.com/)
- **Logs**: [Loggly](https://www.loggly.com/)

## 🔄 CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend
        npm install
    
    - name: Run tests
      run: |
        cd backend
        npm test
    
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "mediscan-api"
        heroku_email: "your-email@example.com"
```

## 📈 Performance Optimization

### Backend Optimization

```javascript
// Enable compression
const compression = require('compression');
app.use(compression());

// Cache static assets
app.use(express.static('public', {
    maxAge: '1d',
    etag: true
}));

// Database indexing
userSchema.index({ email: 1 });
userSchema.index({ firebaseUid: 1 });
```

### Frontend Optimization

```html
<!-- Defer non-critical JavaScript -->
<script src="script.js" defer></script>

<!-- Preload critical resources -->
<link rel="preload" href="styles.css" as="style">
```

## 🗄️ Database Backup

### MongoDB Atlas Backup

1. Go to MongoDB Atlas Dashboard
2. Click "Backup" tab
3. Enable automated backups
4. Set retention period (7 days recommended)

### Manual Backup

```bash
# Backup
mongodump --uri="your_connection_string" --out=./backup

# Restore
mongorestore --uri="your_connection_string" ./backup
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Change PORT in .env
   PORT=3002
   ```

2. **Memory Issues**
   ```bash
   # Increase Node memory
   node --max-old-space-size=4096 server.js
   ```

3. **CORS Errors**
   ```javascript
   // Update CORS settings
   const corsOptions = {
       origin: ['https://yourdomain.com', 'http://localhost:8000']
   };
   ```

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs`
- Monitor: `pm2 monit`
- Restart: `pm2 restart all`

---

**Need Help?** Contact the DevOps lead or check the troubleshooting section.
