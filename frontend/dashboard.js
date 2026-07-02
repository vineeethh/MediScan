import { initializeFirebase, getFirebaseAuth } from './firebase-config.js';

const API_URL = 'http://localhost:3001/api';
let currentUser = null;
let dashboardData = null;

// Initialize Firebase and check auth
async function initializeDashboard() {
    try {
        await initializeFirebase();
        const auth = await getFirebaseAuth();
        
        // Import onAuthStateChanged from Firebase
        const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Check authentication
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // Redirect to login if not authenticated
                window.location.href = 'auth.html';
                return;
            }

            currentUser = user;
            
            // Sync user with backend
            await syncUser(user);
            
            // Load dashboard data
            await loadDashboard();
        });
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError(`Failed to initialize dashboard: ${error.message}`);
    }
}

// Sync Firebase user with MongoDB
async function syncUser(user) {
    try {
        const response = await fetch(`${API_URL}/user/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                firebaseUid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                authProvider: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Sync error response:', errorData);
            throw new Error(`Failed to sync user: ${response.status}`);
        }

        const data = await response.json();
        console.log('User synced:', data);
    } catch (error) {
        console.error('User sync error:', error);
        throw error; // Re-throw to be caught by initializeDashboard
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        console.log('Loading dashboard for user:', currentUser.uid);
        const response = await fetch(`${API_URL}/user/dashboard/${currentUser.uid}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Dashboard API error:', errorText);
            
            if (response.status === 503 || response.status === 500) {
                throw new Error('Database connection error. Please check if MongoDB Atlas IP whitelist is configured.');
            }
            if (response.status === 404) {
                throw new Error('User not found. Please try logging in again.');
            }
            throw new Error(`Failed to load dashboard data: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dashboard data loaded:', data);
        dashboardData = data.data;

        // Hide loading state
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';

        // Populate dashboard
        populateUserInfo();
        populateStatistics();
        populateRecentActivity();
        populateSearchHistory();

    } catch (error) {
        console.error('Dashboard load error:', error);
        showError(error.message);
    }
}

// Populate user information
function populateUserInfo() {
    const userName = currentUser.displayName || dashboardData.user.name || currentUser.email?.split('@')[0] || 'User';
    const userPhoto = currentUser.photoURL || dashboardData.user.photoURL;

    document.getElementById('userName').textContent = userName;
    document.getElementById('welcomeName').textContent = userName;
    
    // Set user photo with fallback to default avatar
    const photoElement = document.getElementById('userPhoto');
    if (userPhoto && userPhoto !== 'null' && userPhoto !== 'undefined') {
        photoElement.src = userPhoto;
        photoElement.onerror = function() {
            // If image fails to load, use default avatar with user initials
            this.src = generateDefaultAvatar(userName);
        };
    } else {
        // Use default avatar with user initials
        photoElement.src = generateDefaultAvatar(userName);
    }

    if (dashboardData.user.lastLogin) {
        const lastLogin = new Date(dashboardData.user.lastLogin);
        document.getElementById('lastLogin').textContent = formatDate(lastLogin);
    }
}

// Populate statistics cards
function populateStatistics() {
    const stats = dashboardData.statistics;

    document.getElementById('totalSearches').textContent = stats.totalSearches || 0;
    document.getElementById('totalConversations').textContent = stats.totalConversations || 0;
    document.getElementById('uniqueSymptoms').textContent = stats.uniqueSymptoms || 0;

    // Find most used doctor type
    if (stats.doctorTypeUsage && stats.doctorTypeUsage.length > 0) {
        const mostUsed = stats.doctorTypeUsage.reduce((max, current) => 
            current.count > max.count ? current : max
        );
        document.getElementById('mostUsedDoctor').textContent = 
            formatDoctorType(mostUsed._id);
    }
}

// Populate recent activity
function populateRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    const recentSearches = dashboardData.recentSearches || [];

    if (recentSearches.length === 0) {
        activityContainer.innerHTML = '<p class="no-data-text">No recent activity</p>';
        return;
    }

    activityContainer.innerHTML = recentSearches.slice(0, 5).map(search => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-search"></i>
            </div>
            <div class="activity-content">
                <h4>${search.symptoms.join(', ') || search.query}</h4>
                <p>Consulted: ${formatDoctorType(search.doctorType)}</p>
                <span class="activity-time">${formatTimeAgo(search.timestamp)}</span>
            </div>
            <button class="btn-view-details" onclick="viewDiagnosis('${search.id}')">
                <i class="fas fa-eye"></i> View
            </button>
        </div>
    `).join('');
}

// Populate search history table
function populateSearchHistory() {
    const tableBody = document.getElementById('historyTableBody');
    const allSearches = dashboardData.allSearches || [];

    if (allSearches.length === 0) {
        document.getElementById('noHistory').style.display = 'flex';
        document.querySelector('.table-container').style.display = 'none';
        return;
    }

    tableBody.innerHTML = allSearches.map(search => `
        <tr data-doctor-type="${search.doctorType}" data-symptoms="${(search.symptoms || []).join(' ')}">
            <td>${formatDateTime(search.timestamp)}</td>
            <td>
                <div class="symptoms-cell">
                    ${(search.symptoms || []).map(s => `<span class="symptom-tag">${s}</span>`).join('')}
                </div>
            </td>
            <td>
                <span class="doctor-badge ${search.doctorType}">
                    ${formatDoctorType(search.doctorType)}
                </span>
            </td>
            <td>
                <button class="btn-view-details" onclick="viewDiagnosis('${search.id}')">
                    <i class="fas fa-file-medical"></i> View Details
                </button>
            </td>
            <td>
                <button class="btn-delete" onclick="deleteSearch('${search.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Setup filters
    setupFilters();
}

// Setup search and filter functionality
function setupFilters() {
    const searchInput = document.getElementById('searchFilter');
    const doctorFilter = document.getElementById('doctorTypeFilter');

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const doctorType = doctorFilter.value;
        const rows = document.querySelectorAll('#historyTableBody tr');

        rows.forEach(row => {
            const symptoms = row.dataset.symptoms.toLowerCase();
            const doctor = row.dataset.doctorType;

            const matchesSearch = !searchTerm || symptoms.includes(searchTerm);
            const matchesDoctor = !doctorType || doctor === doctorType;

            row.style.display = matchesSearch && matchesDoctor ? '' : 'none';
        });
    }

    searchInput.addEventListener('input', applyFilters);
    doctorFilter.addEventListener('change', applyFilters);
}

// View diagnosis details
window.viewDiagnosis = function(searchId) {
    const search = dashboardData.recentSearches.find(s => s.id === searchId);
    if (!search || !search.diagnosis) {
        alert('No diagnosis details available');
        return;
    }

    const modal = document.getElementById('diagnosisModal');
    const detailsContainer = document.getElementById('diagnosisDetails');

    const diagnosis = search.diagnosis;
    detailsContainer.innerHTML = `
        <div class="diagnosis-section">
            <h3>Search Query</h3>
            <p>${search.query}</p>
        </div>

        <div class="diagnosis-section">
            <h3>Symptoms</h3>
            <div class="symptoms-list">
                ${search.symptoms.map(s => `<span class="symptom-tag">${s}</span>`).join('')}
            </div>
        </div>

        ${diagnosis.conditions && diagnosis.conditions.length > 0 ? `
        <div class="diagnosis-section">
            <h3>Possible Conditions</h3>
            <ul class="conditions-list">
                ${diagnosis.conditions.map(c => `<li>${c}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${diagnosis.recommendations && diagnosis.recommendations.length > 0 ? `
        <div class="diagnosis-section">
            <h3>Recommendations</h3>
            <ul class="recommendations-list">
                ${diagnosis.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div class="diagnosis-section">
            <h3>Timestamp</h3>
            <p>${formatDateTime(search.timestamp)}</p>
        </div>
    `;

    modal.style.display = 'block';
};

// Delete search from history
window.deleteSearch = async function(searchId) {
    if (!confirm('Are you sure you want to delete this search from history?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user/search-history/${searchId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete search');
        }

        alert('Search deleted successfully');
        await loadDashboard(); // Reload dashboard
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete search');
    }
};

// Clear all history
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('clearHistoryBtn')?.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to clear all search history? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/user/search-history/clear/${currentUser.uid}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to clear history');
            }

            alert('History cleared successfully');
            await loadDashboard();
        } catch (error) {
            console.error('Clear history error:', error);
            alert('Failed to clear history');
        }
    });

    // Logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            const auth = await getFirebaseAuth();
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(auth);
            window.location.href = 'auth.html';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'auth.html';
        }
    });

    // Modal close functionality
    const modal = document.getElementById('diagnosisModal');
    const closeBtn = document.querySelector('.close-modal');
    
    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [name, secondsInInterval] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInInterval);
        if (interval >= 1) {
            return `${interval} ${name}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

function formatDoctorType(type) {
    const types = {
        general: 'General Physician',
        cardiologist: 'Cardiologist',
        dermatologist: 'Dermatologist',
        pediatrician: 'Pediatrician',
        neurologist: 'Neurologist',
        orthopedic: 'Orthopedic'
    };
    return types[type] || type;
}

// Generate default avatar with user initials
function generateDefaultAvatar(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 80, 80);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 80, 80);
    
    // Get initials
    const initials = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    
    // Draw initials
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 40, 40);
    
    return canvas.toDataURL();
}

function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('errorMessage').textContent = message;
}

// Initialize dashboard on page load
initializeDashboard();
