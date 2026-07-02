# 🚀 Quick Setup Guide for Team Members

## For Team Members Joining the Project

### Step 1: Clone the Forked Repository

```bash
# Clone the team's forked repository
git clone https://github.com/YOUR_TEAM_LEAD_USERNAME/HTF25-Team-111.git
cd HTF25-Team-111
```

### Step 2: Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

#### NLP Service Dependencies
```bash
cd nlp-service
pip3 install -r requirements.txt
cd ..
```

### Step 3: Get Environment Variables

Ask your team lead for the `.env` file and place it in the `backend/` directory, or create it with these variables:

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_serpapi_key
JWT_SECRET=your_random_secret_key
```

### Step 4: Update Firebase Config

Ask your team lead for Firebase credentials and update `frontend/firebase-config.js`

### Step 5: Run the Application

#### Mac/Linux:
```bash
chmod +x start.sh stop.sh
./start.sh
```

#### Windows:
```cmd
start.bat
```

### Step 6: Access the App

Open your browser and go to:
- http://localhost:8000/frontend/index.html

---

## Git Workflow for Team Collaboration

### Before Starting Work

```bash
# Always pull latest changes first
git pull origin main
```

### Making Changes

```bash
# Create a new branch for your feature
git checkout -b feature/your-feature-name

# Make your changes
# ... edit files ...

# Check what files you changed
git status

# Add your changes
git add .

# Commit with a meaningful message
git commit -m "feat: add hospital map markers"

# Push to the repository
git push origin feature/your-feature-name
```

### Commit Message Format

Use these prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add dark mode toggle
fix: resolve hospital search error
docs: update README with new features
style: format chat interface code
```

### Merging to Main

1. Push your feature branch
2. Create a Pull Request on GitHub
3. Wait for team review
4. Merge after approval

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

```bash
# Find process using the port
lsof -ti :3001

# Kill the process
kill -9 $(lsof -ti :3001)
```

### Issue 2: MongoDB Connection Failed

- Check if your IP is whitelisted in MongoDB Atlas
- Verify the connection string in `.env`
- Ensure network connectivity

### Issue 3: Firebase Authentication Error

- Verify Firebase config in `firebase-config.js`
- Check if Email/Password auth is enabled in Firebase Console
- Clear browser cache and cookies

### Issue 4: NLP Service Not Starting

```bash
# Make sure Python 3 is installed
python3 --version

# Reinstall dependencies
pip3 install -r nlp-service/requirements.txt
```

---

## Project Structure - Where to Work

### Frontend Developers
- `frontend/index.html` - Main page structure
- `frontend/styles.css` - Styling
- `frontend/script.js` - Main functionality
- `frontend/dashboard.js` - Dashboard logic

### Backend Developers
- `backend/controllers/` - Request handlers
- `backend/routes/` - API endpoints
- `backend/services/` - Business logic
- `backend/models/` - Database schemas

### AI/ML Developers
- `nlp-service/` - Python NLP service
- `backend/services/aiService.js` - AI integration

---

## Testing Your Changes

### Test Backend API
```bash
curl http://localhost:3001/api/health
```

### Test Chat Functionality
1. Open browser console (F12)
2. Go to AI Doctor
3. Send a test message
4. Check for errors in console

### Test Database Connection
1. Login to MongoDB Atlas
2. Check if data is being saved
3. Verify collections: users, conversations, searchhistories

---

## Getting Help

1. **Check Documentation**: Read README.md first
2. **Team Communication**: Ask in your team chat
3. **GitHub Issues**: Create an issue for bugs
4. **Contact Lead**: Reach out to team lead

---

## Before Submitting

### Checklist
- [ ] All features working correctly
- [ ] No console errors
- [ ] Code is formatted and clean
- [ ] Comments added for complex logic
- [ ] README.md is updated
- [ ] .env file is NOT committed
- [ ] All team members' names in README
- [ ] Tested on different browsers
- [ ] Mobile responsive checked

### Final Steps
```bash
# Pull latest changes
git pull origin main

# Run the application one last time
./start.sh

# Test all features
# - Sign up / Login
# - Chat with AI Doctor
# - Hospital Search
# - Dashboard

# Commit final changes
git add .
git commit -m "chore: final submission ready"
git push origin main
```

---

Good luck with the hackathon! 🚀
