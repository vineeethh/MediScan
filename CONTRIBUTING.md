# Contributing to MediScan - Team 111

Thank you for contributing to MediScan! This document provides guidelines for team collaboration.

## 🤝 Team Collaboration Rules

### 1. Communication
- Keep team members informed about your work
- Ask for help when stuck
- Share knowledge and help others
- Discuss major changes before implementing

### 2. Code Quality
- Write clean, readable code
- Add comments for complex logic
- Follow existing code style
- Test your changes before committing

### 3. Git Workflow
- Always pull before starting work
- Create feature branches for new work
- Write meaningful commit messages
- Don't commit sensitive data (.env files)

## 📝 Commit Message Guidelines

### Format
```
<type>: <subject>

<optional body>
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Formatting, missing semicolons, etc.
- **refactor**: Code restructuring
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples
```bash
feat: add hospital distance calculation
fix: resolve login authentication error
docs: update API endpoint documentation
style: format chat interface CSS
refactor: simplify symptom extraction logic
```

## 🌿 Branch Naming

### Format
```
<type>/<short-description>
```

### Examples
```bash
feature/hospital-map
fix/auth-error
docs/setup-guide
style/dark-mode
```

## 🔄 Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make Changes & Commit**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. **Push to Repository**
   ```bash
   git push origin feature/your-feature
   ```

4. **Create Pull Request on GitHub**
   - Go to repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Add description of changes
   - Request review from team member

5. **Code Review**
   - Wait for team member review
   - Address feedback if any
   - Get approval

6. **Merge**
   - Merge to main branch
   - Delete feature branch

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment details

### Example
```markdown
**Bug**: Chat messages not displaying

**Steps to Reproduce**:
1. Go to AI Doctor chat
2. Send a message
3. Message doesn't appear

**Expected**: Message should appear in chat
**Actual**: Chat remains empty

**Browser**: Chrome 120.0
**OS**: macOS 14.0
```

## 📂 File Organization

### Where to Add New Files

#### Frontend
```
frontend/
├── components/     # Reusable UI components
├── utils/          # Helper functions
├── assets/         # Images, icons
└── styles/         # Additional stylesheets
```

#### Backend
```
backend/
├── controllers/    # Request handlers
├── models/         # Database schemas
├── routes/         # API routes
├── services/       # Business logic
├── middleware/     # Custom middleware
└── utils/          # Helper functions
```

## ✅ Code Review Checklist

Before requesting review:
- [ ] Code follows project style
- [ ] All functions have comments
- [ ] No console.log() in production code
- [ ] Error handling is implemented
- [ ] Code is tested and working
- [ ] No sensitive data in code
- [ ] README updated if needed

## 🚫 What NOT to Commit

- `.env` files
- `node_modules/`
- API keys or secrets
- Personal configuration files
- Large binary files
- Temporary files (`.tmp`, `.log`)
- Database dumps

## 🧪 Testing Your Changes

### Before Committing
1. Run the application
2. Test your feature thoroughly
3. Check browser console for errors
4. Test on different screen sizes
5. Verify no existing features broke

### Testing Checklist
- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works in different browsers
- [ ] Database operations successful
- [ ] API calls working

## 💡 Best Practices

### JavaScript
```javascript
// Good
const getUserData = async (userId) => {
    try {
        const response = await fetch(`/api/user/${userId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// Bad
function getData(id) {
    fetch('/api/user/' + id).then(r => r.json()).then(d => console.log(d));
}
```

### CSS
```css
/* Good - Use CSS variables */
.button {
    background: var(--primary-color);
    color: var(--text-color);
}

/* Bad - Hardcoded colors */
.button {
    background: #667eea;
    color: #374151;
}
```

### MongoDB Queries
```javascript
// Good - Use lean() for read-only queries
const users = await User.find({ active: true }).lean();

// Good - Select only needed fields
const user = await User.findById(id).select('name email');
```

## 🎯 Priority Areas

### High Priority
- Core chat functionality
- Hospital search accuracy
- User authentication
- Data persistence

### Medium Priority
- UI/UX improvements
- Dashboard features
- Analytics

### Low Priority
- Additional features
- Optimizations
- Nice-to-have features

## 📞 Getting Help

### Stuck on Something?
1. Check documentation first
2. Search for similar issues
3. Ask in team chat
4. Reach out to team lead

### Resources
- [Express.js Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Firebase Docs](https://firebase.google.com/docs)
- [MDN Web Docs](https://developer.mozilla.org/)

## 🏆 Recognition

All contributors will be recognized in:
- README.md contributors section
- Project presentation
- Final submission

---

**Remember**: We're a team! Help each other, communicate often, and let's build something amazing! 🚀

**Questions?** Contact the team lead or ask in the team chat.
