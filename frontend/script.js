/* MediScan — Main Frontend Script v4.0 */

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE_URL = 'http://localhost:3001/api';
let conversationSessionId = null;
let selectedLanguage = localStorage.getItem('mediscan_language') || 'en';
let currentFirebaseUser = null;
let hospitalMap = null;

// ─── CAROUSEL ─────────────────────────────────────────────────────────────────
let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-item');
const indicators = document.querySelectorAll('.indicator');

function showSlide(n) {
    if (!slides.length) return;
    currentSlide = ((n % slides.length) + slides.length) % slides.length;
    slides.forEach((s, i) => {
        s.classList.toggle('active', i === currentSlide);
        if (indicators[i]) indicators[i].classList.toggle('active', i === currentSlide);
    });
}
function moveCarousel(dir) { showSlide(currentSlide + dir); }
function goToSlide(n) { showSlide(n); }
setInterval(() => moveCarousel(1), 5000);

// ─── TERMS & CONDITIONS ───────────────────────────────────────────────────────
let termsAccepted = localStorage.getItem('mediscan_terms') === 'yes';

function initTermsModal() {
    const modal = document.getElementById('termsModal');
    const check = document.getElementById('termsCheck');
    const agreeBtn = document.getElementById('termsAgreeBtn');
    const chatInputEl = document.getElementById('chatInput');
    const sendBtnEl = document.getElementById('sendMessage');

    if (!modal) return;

    // Lock chat until terms accepted
    function lockChat() {
        if (chatInputEl) { chatInputEl.disabled = true; chatInputEl.placeholder = 'Please accept Terms of Service to continue...'; }
        if (sendBtnEl) sendBtnEl.disabled = true;
    }
    function unlockChat() {
        if (chatInputEl) { chatInputEl.disabled = false; chatInputEl.placeholder = 'Describe your symptoms in detail (e.g., fever for 2 days, headache, body aches)...'; }
        if (sendBtnEl) sendBtnEl.disabled = false;
    }

    if (!termsAccepted) {
        lockChat();
        // Show modal when user clicks on chat area
        chatInputEl?.addEventListener('focus', () => { if (!termsAccepted) modal.style.display = 'flex'; }, { once: false });
        const chatSection = document.getElementById('symptom-checker');
        chatSection?.addEventListener('click', () => { if (!termsAccepted) modal.style.display = 'flex'; }, { once: false });
    } else {
        unlockChat();
    }

    check?.addEventListener('change', () => {
        if (agreeBtn) agreeBtn.disabled = !check.checked;
    });

    agreeBtn?.addEventListener('click', () => {
        termsAccepted = true;
        localStorage.setItem('mediscan_terms', 'yes');
        modal.style.display = 'none';
        unlockChat();
        chatInputEl?.focus();
        // Show T&C confirmation + ask age/sex as first AI message
        addMessage('Terms accepted ✓', true);
        setTimeout(() => {
            addMessage(
                'Thank you! To provide the most accurate advice, could you please tell me your <strong>age and biological sex</strong>? This helps me tailor my guidance appropriately.<br><br><em style="color:#6b7280;font-size:0.85rem">Rest assured, anything you share remains private and confidential.</em>',
                false, true
            );
        }, 400);
    });
}

// ─── AUTH (OPTIONAL — guest access allowed) ───────────────────────────────────
async function initAuth() {
    try {
        const { getFirebaseAuth } = await import('./firebase-config.js');
        const auth = await getFirebaseAuth();
        const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        onAuthStateChanged(auth, (user) => {
            currentFirebaseUser = user;
            updateAuthUI(user);
        });
    } catch {
        // Firebase not configured — guest mode, full access
        updateAuthUI(null);
    }
}

function updateAuthUI(user) {
    const authArea = document.getElementById('authArea');
    if (!authArea) return;
    if (user) {
        authArea.innerHTML = `
            <span class="user-greeting">Hi, ${user.displayName || user.email?.split('@')[0]}</span>
            <a href="dashboard.html">Dashboard</a>
            <a href="#" id="logoutBtn">Logout</a>`;
        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const { getFirebaseAuth } = await import('./firebase-config.js');
                await signOut(await getFirebaseAuth());
            } catch {}
        });
    } else {
        authArea.innerHTML = `<a href="auth.html" class="login-link"><i class="fas fa-user"></i> Login</a>`;
    }
}

// ─── LANGUAGE SELECTOR ────────────────────────────────────────────────────────
function initLanguageSelector() {
    const sel = document.getElementById('languageSelect');
    if (!sel) return;
    sel.value = selectedLanguage;
    sel.addEventListener('change', () => {
        selectedLanguage = sel.value;
        localStorage.setItem('mediscan_language', selectedLanguage);
    });
}

// ─── CHAT UTILITIES ───────────────────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendMessage');
const clearBtn = document.getElementById('clearChat');

function addMessage(content, isUser = false, isHTML = false) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    div.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${isUser ? 'user' : 'stethoscope'}"></i>
        </div>
        <div class="message-content">${isHTML ? content : `<p>${escapeHtml(content)}</p>`}</div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatAIText(text) {
    if (!text) return '';
    let html = '';
    let inUl = false, inOl = false;

    const endLists = () => {
        if (inOl) { html += '</ol>'; inOl = false; }
        if (inUl) { html += '</ul>'; inUl = false; }
    };
    const inlineFmt = (t) => t
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line) continue;
        if (/^\d+\.\s/.test(line)) {
            if (!inOl) { endLists(); html += '<ol class="ai-list">'; inOl = true; }
            html += `<li>${inlineFmt(line.replace(/^\d+\.\s/, ''))}</li>`;
        } else if (/^[•\-\*]\s/.test(line)) {
            if (!inUl) { endLists(); html += '<ul class="ai-list">'; inUl = true; }
            html += `<li>${inlineFmt(line.replace(/^[•\-\*]\s/, ''))}</li>`;
        } else {
            endLists();
            html += `<p>${inlineFmt(line)}</p>`;
        }
    }
    endLists();
    return html;
}

// ─── STREAMING AI CHAT ────────────────────────────────────────────────────────
async function sendMessageToAPI(message) {
    if (!chatMessages) return null;

    // Create streaming bubble
    const bubble = document.createElement('div');
    bubble.className = 'message bot-message';
    bubble.innerHTML = `
        <div class="message-avatar"><i class="fas fa-stethoscope"></i></div>
        <div class="message-content" id="active-stream"><span class="typing-cursor">▍</span></div>`;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const contentEl = bubble.querySelector('#active-stream');

    let accumulated = '';
    try {
        const token = localStorage.getItem('mediscan_token');
        const resp = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                message,
                doctorType: 'general',
                language: selectedLanguage,
                sessionId: conversationSessionId
            })
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.token) {
                        accumulated += data.token;
                        contentEl.innerHTML = formatAIText(accumulated) + '<span class="typing-cursor">▍</span>';
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }
                    if (data.done && data.sessionId) conversationSessionId = data.sessionId;
                    if (data.error) throw new Error(data.error);
                } catch (e) {
                    if (e.message && e.message !== 'Unexpected end of JSON input') {
                        // ignore parse errors on incomplete chunks
                    }
                }
            }
        }
        contentEl.innerHTML = formatAIText(accumulated);
        contentEl.removeAttribute('id');

        // If AI recommended tests, show in-chat upload card
        if (!testUploadShown && detectsTestRecommendation(accumulated)) {
            setTimeout(showTestUploadCard, 600);
        }

        return accumulated;
    } catch (err) {
        console.error('Streaming error:', err.message);
        bubble.remove();
        return null;
    }
}

sendBtn?.addEventListener('click', async () => {
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMessage(msg, true);
    chatInput.value = '';
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const resp = await sendMessageToAPI(msg);

    if (resp === null) {
        addMessage('Could not reach the server. Please make sure the backend is running (port 3001).', false);
    } else if (isSevereCondition(resp)) {
        setTimeout(showHospitalSuggestion, 800);
    }

    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send';
});

chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

clearBtn?.addEventListener('click', () => {
    conversationSessionId = null;
    testUploadShown = false;
    if (!chatMessages) return;
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar"><i class="fas fa-stethoscope"></i></div>
            <div class="message-content">
                <p>Hello! I'm MediScan's AI Doctor.</p>
                <p style="color:#ef4444;font-size:0.85rem"><strong>⚠️ If this is an emergency, call 112 immediately.</strong></p>
            </div>
        </div>`;
    if (termsAccepted) {
        setTimeout(() => addMessage(
            'To provide the most accurate advice, could you please tell me your <strong>age and biological sex</strong>? This helps me tailor my guidance appropriately.',
            false, true
        ), 300);
    }
});

function isSevereCondition(text) {
    const keywords = ['emergency','severe','critical','urgent','immediate medical','call 112','chest pain','heart attack','stroke','cannot breathe','difficulty breathing','severe bleeding'];
    return keywords.some(k => text.toLowerCase().includes(k));
}

function showHospitalSuggestion() {
    if (!chatMessages) return;
    const card = document.createElement('div');
    card.className = 'hospital-suggestion-card';
    card.innerHTML = `
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.75rem">
            <i class="fas fa-hospital-alt" style="font-size:1.8rem;color:#ef4444"></i>
            <div>
                <strong style="color:#ef4444">Your symptoms may need medical attention</strong>
                <p style="margin:0.2rem 0 0;font-size:0.9rem;color:#6b7280">Would you like to find hospitals near you?</p>
            </div>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button onclick="useMyLocationForHospitals()" class="primary-button" style="padding:0.5rem 1rem;font-size:0.9rem">
                <i class="fas fa-map-marker-alt"></i> Find Nearby Hospitals
            </button>
            <button onclick="this.closest('.hospital-suggestion-card').remove()" style="padding:0.5rem 1rem;font-size:0.9rem;background:transparent;border:1px solid #d1d5db;border-radius:8px;cursor:pointer">
                Dismiss
            </button>
        </div>`;
    chatMessages.appendChild(card);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ─── CONTEXTUAL REPORT UPLOAD (in-chat) ──────────────────────────────────────

// Keywords that indicate the AI has recommended tests
const TEST_KEYWORDS = [
    'cbc', 'complete blood count', 'blood test', 'blood work', 'rt-pcr', 'x-ray',
    'chest x-ray', 'mri', 'ct scan', 'ultrasound', 'urine test', 'urine routine',
    'culture', 'lab test', 'investigation', 'ns1 antigen', 'dengue test', 'malaria test',
    'widal test', 'typhoid test', 'stool test', 'ecg', 'echo', 'thyroid', 'tsh',
    'lipid profile', 'hba1c', 'blood sugar', 'fasting glucose', 'creatinine',
    'liver function', 'lft', 'kft', 'kidney function', 'sputum test', 'biopsy',
    'recommend getting', 'suggest getting', 'recommend a', 'suggest a',
    'get tested', 'run some tests', 'order a', 'obtain a', 'recommended tests'
];

let testUploadShown = false; // Only show upload card once per recommendation

function detectsTestRecommendation(text) {
    const lower = text.toLowerCase();
    return TEST_KEYWORDS.some(k => lower.includes(k));
}

function extractConversationText() {
    if (!chatMessages) return '';
    const msgs = chatMessages.querySelectorAll('.message');
    return Array.from(msgs).map(msg => {
        const isUser = msg.classList.contains('user-message');
        const content = msg.querySelector('.message-content')?.innerText?.trim() || '';
        if (!content) return null;
        return `${isUser ? 'Patient' : 'AI Doctor'}: ${content}`;
    }).filter(Boolean).join('\n\n');
}

function showTestUploadCard() {
    if (testUploadShown || !chatMessages) return;
    testUploadShown = true;

    const card = document.createElement('div');
    card.className = 'test-upload-card';
    card.id = 'testUploadCard';
    card.innerHTML = `
        <div class="test-upload-icon"><i class="fas fa-flask"></i></div>
        <div class="test-upload-body">
            <strong>Got your test results?</strong>
            <p>Upload your lab report and I'll analyze it together with everything we discussed to give you a complete assessment.</p>
        </div>
        <label class="test-upload-label">
            <i class="fas fa-upload"></i> Upload Report (PDF)
            <input type="file" accept=".pdf" style="display:none" id="chatReportInput">
        </label>`;
    chatMessages.appendChild(card);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    document.getElementById('chatReportInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await handleChatReportUpload(file, card);
    });
}

async function handleChatReportUpload(file, card) {
    // Replace card with loading state
    card.innerHTML = `
        <div class="test-upload-icon"><i class="fas fa-spinner fa-spin"></i></div>
        <div class="test-upload-body">
            <strong>Analyzing "${escapeHtml(file.name)}"</strong>
            <p>Reading your report and correlating with our conversation...</p>
        </div>`;

    const conversationContext = extractConversationText();
    const formData = new FormData();
    formData.append('report', file);
    formData.append('language', selectedLanguage);
    formData.append('conversationContext', conversationContext);

    try {
        const resp = await fetch(`${API_BASE_URL}/reports/analyze-with-context`, {
            method: 'POST',
            body: formData
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.message || 'Analysis failed');

        // Remove the upload card
        card.remove();

        // Show user message (file uploaded)
        addMessage(`📄 Uploaded report: ${file.name}`, true);

        // Show combined analysis as streaming-style bot message
        const bubble = document.createElement('div');
        bubble.className = 'message bot-message';
        bubble.innerHTML = `
            <div class="message-avatar"><i class="fas fa-microscope"></i></div>
            <div class="message-content" id="report-context-result"></div>`;
        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        document.getElementById('report-context-result').innerHTML =
            formatAIText(data.data.combinedAnalysis);

    } catch (err) {
        card.innerHTML = `
            <div class="test-upload-icon"><i class="fas fa-exclamation-circle" style="color:#ef4444"></i></div>
            <div class="test-upload-body">
                <strong>Upload failed</strong>
                <p>${escapeHtml(err.message)}</p>
            </div>
            <label class="test-upload-label">
                <i class="fas fa-redo"></i> Try Again
                <input type="file" accept=".pdf" style="display:none" onchange="handleChatReportUpload(this.files[0], this.closest('.test-upload-card'))">
            </label>`;
        testUploadShown = false; // Allow retry
    }
}

// ─── REPORT ANALYZER ──────────────────────────────────────────────────────────
function initReportAnalyzer() {
    const dropZone = document.getElementById('reportDropZone');
    const fileInput = document.getElementById('reportFileInput');
    const fileNameEl = document.getElementById('reportFileName');
    const analyzeBtn = document.getElementById('analyzeReportBtn');
    const resultEl = document.getElementById('reportAnalysisResult');
    const loaderEl = document.getElementById('reportLoader');
    if (!dropZone) return;

    let selectedFile = null;

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file?.type === 'application/pdf') selectFile(file);
        else alert('Please upload a PDF file.');
    });

    fileInput?.addEventListener('change', () => {
        if (fileInput.files[0]) selectFile(fileInput.files[0]);
    });

    function selectFile(file) {
        selectedFile = file;
        if (fileNameEl) {
            fileNameEl.style.display = 'flex';
            fileNameEl.innerHTML = `
                <i class="fas fa-file-pdf" style="color:#ef4444;font-size:1.3rem"></i>
                <span><strong>${escapeHtml(file.name)}</strong> &nbsp;
                <span style="color:#6b7280;font-size:0.85rem">${(file.size / 1024).toFixed(0)} KB</span></span>
                <button onclick="clearReport()" style="background:none;border:none;cursor:pointer;color:#6b7280;margin-left:auto">
                    <i class="fas fa-times"></i>
                </button>`;
        }
        if (analyzeBtn) analyzeBtn.style.display = 'inline-flex';
        if (resultEl) resultEl.style.display = 'none';
    }

    window.clearReport = () => {
        selectedFile = null;
        if (fileNameEl) fileNameEl.style.display = 'none';
        if (analyzeBtn) analyzeBtn.style.display = 'none';
        if (resultEl) resultEl.style.display = 'none';
        if (fileInput) fileInput.value = '';
    };

    analyzeBtn?.addEventListener('click', async () => {
        if (!selectedFile) return;
        loaderEl.style.display = 'flex';
        analyzeBtn.disabled = true;
        if (resultEl) resultEl.style.display = 'none';

        const formData = new FormData();
        formData.append('report', selectedFile);
        formData.append('language', selectedLanguage);

        try {
            const resp = await fetch(`${API_BASE_URL}/reports/analyze`, {
                method: 'POST',
                body: formData
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.message || 'Analysis failed');
            renderReportResult(data.data);
        } catch (err) {
            alert('Analysis failed: ' + err.message + '\n\nMake sure the backend is running and the PDF is text-based (not a scanned image).');
        } finally {
            loaderEl.style.display = 'none';
            analyzeBtn.disabled = false;
        }
    });

    function renderReportResult(reportData) {
        const analysis = reportData.analysis;
        const urgencyConfig = {
            routine: { color: '#10b981', icon: 'check-circle', label: 'ROUTINE' },
            soon: { color: '#f59e0b', icon: 'exclamation-circle', label: 'FOLLOW UP SOON' },
            urgent: { color: '#ef4444', icon: 'exclamation-triangle', label: 'URGENT' },
            emergency: { color: '#7f1d1d', icon: 'ambulance', label: 'EMERGENCY' }
        };
        const urg = urgencyConfig[analysis.urgency] || urgencyConfig.routine;

        document.getElementById('reportUrgency').innerHTML = `
            <div class="urgency-badge urgency-${analysis.urgency}">
                <i class="fas fa-${urg.icon}"></i> ${urg.label}
            </div>
            <p style="color:#6b7280;font-size:0.85rem;margin-top:0.5rem">
                Report: ${reportData.fileName || 'Uploaded report'} · Type: ${(reportData.reportType || 'general').replace(/_/g, ' ').toUpperCase()}
            </p>`;

        document.getElementById('reportSummary').innerHTML = `
            <h4><i class="fas fa-clipboard-list"></i> Summary</h4>
            <p>${analysis.summary || ''}</p>
            ${analysis.fullAnalysis ? `
            <details style="margin-top:1rem">
                <summary style="cursor:pointer;color:#3b82f6;font-weight:600">Read detailed analysis</summary>
                <p style="margin-top:0.75rem;line-height:1.7">${analysis.fullAnalysis}</p>
            </details>` : ''}`;

        const abnEl = document.getElementById('reportAbnormal');
        if (analysis.abnormalValues?.length > 0) {
            abnEl.innerHTML = `
                <h4><i class="fas fa-vials"></i> Lab Values</h4>
                <div style="overflow-x:auto">
                <table class="abnormal-table">
                    <thead><tr>
                        <th>Parameter</th><th>Your Value</th><th>Normal Range</th>
                        <th>Status</th><th>Interpretation</th>
                    </tr></thead>
                    <tbody>
                        ${analysis.abnormalValues.map(v => `
                        <tr>
                            <td><strong>${escapeHtml(v.parameter || '')}</strong></td>
                            <td><strong>${escapeHtml(v.value || '')}</strong></td>
                            <td>${escapeHtml(v.normalRange || '')}</td>
                            <td><span class="status-badge status-${v.status}">${(v.status || '').toUpperCase()}</span></td>
                            <td style="font-size:0.9rem">${escapeHtml(v.interpretation || '')}</td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>`;
        } else {
            abnEl.innerHTML = '';
        }

        const recsEl = document.getElementById('reportRecommendations');
        if (analysis.recommendations?.length > 0) {
            recsEl.innerHTML = `
                <h4><i class="fas fa-lightbulb"></i> Recommendations</h4>
                <ul>${analysis.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
                <p style="color:#6b7280;font-size:0.85rem;margin-top:1rem">
                    <i class="fas fa-info-circle"></i> This analysis is for informational purposes. Consult your doctor for medical advice.
                </p>`;
        } else {
            recsEl.innerHTML = '';
        }

        if (resultEl) {
            resultEl.style.display = 'block';
            resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// ─── MEDICINE REMINDERS ───────────────────────────────────────────────────────
function initReminders() {
    const addBtn = document.getElementById('addReminderBtn');
    const listEl = document.getElementById('remindersList');
    const freqSel = document.getElementById('reminderFrequency');
    const timesContainer = document.getElementById('timeInputsContainer');
    if (!addBtn) return;

    let reminders = [];
    try { reminders = JSON.parse(localStorage.getItem('mediscan_reminders') || '[]'); } catch {}

    function saveReminders() {
        localStorage.setItem('mediscan_reminders', JSON.stringify(reminders));
    }

    function renderReminders() {
        if (!listEl) return;
        if (reminders.length === 0) {
            listEl.innerHTML = '<p class="empty-state">No reminders yet. Add one to get started!</p>';
            return;
        }
        listEl.innerHTML = reminders.map((r, i) => `
            <div class="reminder-item ${r.active ? '' : 'inactive'}">
                <div class="reminder-info">
                    <strong>${escapeHtml(r.name)}</strong>
                    <span class="reminder-dosage">${escapeHtml(r.dosage)}</span>
                    <div class="reminder-meta">
                        ${r.frequency.replace(/_/g, ' ')} · ${r.times.join(', ')}
                        ${r.instructions ? ' · ' + escapeHtml(r.instructions) : ''}
                    </div>
                </div>
                <div class="reminder-actions">
                    <label class="toggle-switch" title="${r.active ? 'Disable' : 'Enable'}">
                        <input type="checkbox" ${r.active ? 'checked' : ''} onchange="toggleReminder(${i})">
                        <span class="toggle-slider"></span>
                    </label>
                    <button onclick="deleteReminder(${i})" class="icon-btn danger" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`).join('');
    }

    function updateTimeInputs() {
        const counts = { once_daily:1, twice_daily:2, thrice_daily:3, four_times_daily:4, weekly:1, as_needed:1 };
        const n = counts[freqSel?.value] || 1;
        const defaults = ['08:00', '14:00', '20:00', '22:00'];
        if (timesContainer) {
            timesContainer.innerHTML = Array.from({ length: n }, (_, i) =>
                `<input type="time" class="time-input" value="${defaults[i] || '08:00'}">`
            ).join('');
        }
    }

    freqSel?.addEventListener('change', updateTimeInputs);

    addBtn.addEventListener('click', () => {
        const name = document.getElementById('reminderName')?.value.trim();
        const dosage = document.getElementById('reminderDosage')?.value.trim();
        if (!name) { alert('Please enter a medicine name.'); return; }

        const times = Array.from(timesContainer?.querySelectorAll('.time-input') || []).map(i => i.value);
        reminders.unshift({
            id: Date.now(),
            name,
            dosage: dosage || '1 dose',
            frequency: freqSel?.value || 'once_daily',
            times: times.length ? times : ['08:00'],
            instructions: document.getElementById('reminderInstructions')?.value.trim() || '',
            active: true,
            createdAt: new Date().toISOString()
        });
        saveReminders();
        renderReminders();
        requestNotificationPermission();

        if (document.getElementById('reminderName')) document.getElementById('reminderName').value = '';
        if (document.getElementById('reminderDosage')) document.getElementById('reminderDosage').value = '';
        if (document.getElementById('reminderInstructions')) document.getElementById('reminderInstructions').value = '';
    });

    window.toggleReminder = (i) => {
        reminders[i].active = !reminders[i].active;
        saveReminders();
        renderReminders();
    };

    window.deleteReminder = (i) => {
        if (!confirm(`Delete reminder for "${reminders[i].name}"?`)) return;
        reminders.splice(i, 1);
        saveReminders();
        renderReminders();
    };

    function requestNotificationPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(p => {
                if (p === 'denied') {
                    const banner = document.getElementById('notifPermissionBanner');
                    if (banner) banner.style.display = 'flex';
                }
            });
        }
    }

    // Check for due reminders every minute
    setInterval(() => {
        if (Notification.permission !== 'granted') return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hh}:${mm}`;
        reminders.filter(r => r.active).forEach(r => {
            if (r.times.includes(currentTime)) {
                new Notification(`💊 ${r.name}`, {
                    body: `${r.dosage}${r.instructions ? ' · ' + r.instructions : ''}`,
                    icon: '/favicon.ico',
                    tag: `reminder-${r.id}-${currentTime}`
                });
            }
        });
    }, 60000);

    renderReminders();
}

// ─── HOSPITAL FINDER (Overpass API — no key needed) ───────────────────────────
function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findHospitalsOverpass(lat, lng, radius = 5000) {
    const query = `[out:json][timeout:20];
(
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="clinic"](around:${radius},${lat},${lng});
  node["healthcare"="hospital"](around:${radius},${lat},${lng});
  node["healthcare"="clinic"](around:${radius},${lat},${lng});
);
out center 20;`;

    const resp = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
    });
    if (!resp.ok) throw new Error('Overpass API error');
    const data = await resp.json();

    return data.elements
        .map(el => {
            const eLat = el.lat ?? el.center?.lat;
            const eLng = el.lon ?? el.center?.lon;
            const addr = [
                el.tags?.['addr:housenumber'],
                el.tags?.['addr:street'],
                el.tags?.['addr:suburb'] || el.tags?.['addr:city']
            ].filter(Boolean).join(' ');
            return {
                name: el.tags?.name,
                type: el.tags?.amenity === 'hospital' ? 'Hospital' : 'Clinic / Healthcare Centre',
                address: addr || 'See map for exact location',
                phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
                website: el.tags?.website || '',
                latitude: eLat,
                longitude: eLng,
                distance: eLat != null && eLng != null ? calcDistance(lat, lng, eLat, eLng) : 999
            };
        })
        .filter(h => h.latitude != null && h.longitude != null && h.name)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 15);
}

async function geocodeAddress(address) {
    const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`,
        { headers: { 'User-Agent': 'MediScan/1.0 (health-assistant)' } }
    );
    const data = await resp.json();
    if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
}

async function loadHospitals(lat, lng) {
    const resultsEl = document.getElementById('hospitalResults');
    const mapEl = document.getElementById('map');
    if (!resultsEl) return;

    resultsEl.innerHTML = `
        <div style="text-align:center;padding:2rem;color:#6b7280">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p style="margin-top:0.5rem">Finding nearby hospitals and clinics...</p>
        </div>`;
    if (mapEl) mapEl.style.display = 'block';

    try {
        const hospitals = await findHospitalsOverpass(lat, lng);
        renderHospitalMap(lat, lng, hospitals);
        renderHospitalCards(hospitals, resultsEl);
    } catch (err) {
        resultsEl.innerHTML = `<p style="color:#ef4444;text-align:center;padding:2rem">
            <i class="fas fa-exclamation-triangle"></i> Could not load hospital data. Please try again in a moment.</p>`;
    }
}

function renderHospitalMap(userLat, userLng, hospitals) {
    const mapEl = document.getElementById('map');
    if (!mapEl || !window.L) return;

    mapEl.innerHTML = '<div id="leaflet-map" style="width:100%;height:420px;border-radius:12px;"></div>';
    if (hospitalMap) { hospitalMap.remove(); hospitalMap = null; }

    hospitalMap = L.map('leaflet-map').setView([userLat, userLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(hospitalMap);

    // User location marker
    L.marker([userLat, userLng], {
        icon: L.divIcon({
            className: '',
            html: '<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(59,130,246,0.6)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        })
    }).addTo(hospitalMap).bindPopup('<b>📍 Your Location</b>').openPopup();

    // Hospital markers
    hospitals.forEach((h, idx) => {
        L.marker([h.latitude, h.longitude], {
            icon: L.divIcon({
                className: '',
                html: `<div style="background:#ef4444;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white">${idx + 1}</div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            })
        }).addTo(hospitalMap).bindPopup(`
            <div style="min-width:200px">
                <b style="color:#1f2937">${escapeHtml(h.name)}</b><br>
                <span style="color:#6b7280;font-size:12px">${h.type}</span><br>
                <span style="font-size:12px">${escapeHtml(h.address)}</span><br>
                ${h.phone ? `<span style="font-size:12px">📞 ${escapeHtml(h.phone)}</span><br>` : ''}
                <span style="font-size:12px">📍 ${h.distance.toFixed(1)} km away</span><br>
                <a href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}"
                   target="_blank" style="color:#3b82f6;font-size:12px;margin-top:4px;display:inline-block">
                   Get Directions →
                </a>
            </div>`);
    });

    if (hospitals.length > 0) {
        const bounds = [[userLat, userLng], ...hospitals.map(h => [h.latitude, h.longitude])];
        hospitalMap.fitBounds(bounds, { padding: [30, 30] });
    }
}

function renderHospitalCards(hospitals, resultsEl) {
    if (hospitals.length === 0) {
        resultsEl.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#6b7280">
                <i class="fas fa-hospital" style="font-size:2rem;margin-bottom:0.5rem;display:block"></i>
                No hospitals or clinics found in this area. Try a broader search or different location.
            </div>`;
        return;
    }
    resultsEl.innerHTML = hospitals.map((h, i) => `
        <div class="hospital-card">
            <h4>
                <span style="background:#ef4444;color:white;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;margin-right:0.5rem">${i + 1}</span>
                ${escapeHtml(h.name)}
            </h4>
            <p style="color:#6b7280;margin:0.25rem 0;font-size:0.9rem">${h.type}</p>
            <div class="hospital-info">
                <div class="hospital-info-item"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(h.address)}</span></div>
                ${h.phone ? `<div class="hospital-info-item"><i class="fas fa-phone"></i><span>${escapeHtml(h.phone)}</span></div>` : ''}
                <div class="hospital-info-item"><i class="fas fa-route"></i><span>${h.distance.toFixed(1)} km away</span></div>
            </div>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}"
               target="_blank" class="primary-button" style="margin-top:0.75rem;display:inline-flex;align-items:center;gap:0.4rem;text-decoration:none">
                <i class="fas fa-directions"></i> Get Directions
            </a>
        </div>`).join('');
}

function initHospitalFinder() {
    const currentLocBtn = document.getElementById('currentLocationBtn');
    const searchBtn = document.getElementById('searchHospitalsBtn');
    const locationInput = document.getElementById('locationInput');
    if (!currentLocBtn) return;

    currentLocBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
        currentLocBtn.disabled = true;
        currentLocBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                await loadHospitals(coords.latitude, coords.longitude);
                currentLocBtn.disabled = false;
                currentLocBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Use My Location';
            },
            () => {
                alert('Could not get your location. Please enter it manually.');
                currentLocBtn.disabled = false;
                currentLocBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Use My Location';
            }
        );
    });

    searchBtn?.addEventListener('click', async () => {
        const addr = locationInput?.value.trim();
        if (!addr) { alert('Please enter a location.'); return; }
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        const coords = await geocodeAddress(addr).catch(() => null);
        if (!coords) {
            alert('Location not found. Try a more specific address (e.g. "Jubilee Hills, Hyderabad").');
        } else {
            await loadHospitals(coords.lat, coords.lng);
        }
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
    });
}

// Called from hospital suggestion card in chat
window.useMyLocationForHospitals = function () {
    document.getElementById('hospitals')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => document.getElementById('currentLocationBtn')?.click(), 600);
};

// ─── DARK MODE ────────────────────────────────────────────────────────────────
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
        toggle.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    });
}

// ─── SCROLL ANIMATIONS ────────────────────────────────────────────────────────
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.style.opacity = '1';
            e.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('section').forEach(s => {
    s.style.cssText += 'opacity:0;transform:translateY(20px);transition:opacity 0.6s ease-out,transform 0.6s ease-out';
    sectionObserver.observe(s);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTermsModal();
    initAuth();
    initLanguageSelector();
    initReportAnalyzer();
    initReminders();
    initHospitalFinder();
    initDarkMode();

    // Mobile nav
    document.querySelector('.hamburger')?.addEventListener('click', () => {
        document.querySelector('.nav-menu')?.classList.toggle('active');
    });
    document.querySelectorAll('.nav-link').forEach(l =>
        l.addEventListener('click', () => document.querySelector('.nav-menu')?.classList.remove('active'))
    );

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
        });
    });

    // Contact form
    document.getElementById('contactForm')?.addEventListener('submit', e => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        e.target.reset();
    });

    // Floating chat button visibility
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('floatingChatBtn');
        if (btn) btn.style.display = window.scrollY > 500 ? 'block' : 'none';
    });

    document.getElementById('floatingChatBtn')?.addEventListener('click', () => {
        document.getElementById('symptom-checker')?.scrollIntoView({ behavior: 'smooth' });
    });

    console.log('✅ MediScan v4.0 initialized');
});
