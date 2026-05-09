const API_URL = "https://project-1-mediremainder-backend.onrender.com";
let medicines = [];
let logs = [];
let notifiedMeds = new Set();
let currentUserId = localStorage.getItem('user_id');

// DOM Elements
const navLinks = document.querySelectorAll('.nav-links li[data-page]');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('page-title');
const themeSwitch = document.getElementById('theme-switch');
const clockEl = document.getElementById('current-clock');
const medGrid = document.getElementById('med-grid');
const upcomingList = document.getElementById('upcoming-list');
const addMedForm = document.getElementById('add-med-form');
const formMsg = document.getElementById('form-msg');
const btnEnableNotif = document.getElementById('enable-notifications');
const searchInput = document.getElementById('search-med');
const logsList = document.getElementById('logs-list');
const btnLogout = document.getElementById('nav-logout');

// Auth Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginMsg = document.getElementById('login-msg');
const signupMsg = document.getElementById('signup-msg');

// Modal Elements
const modal = document.getElementById('alert-modal');
const alertMsg = document.getElementById('alert-msg');
const btnTakeNow = document.getElementById('btn-take-now');
const btnSnooze = document.getElementById('btn-snooze');
const alertSound = document.getElementById('alert-sound');

let currentAlertMedId = null;

// Initialize
function init() {
    setupAuth();
    setupNavigation();
    setupThemeToggle();
    setupClock();
    setupNotifications();

    if (currentUserId) {
        showApp();
    } else {
        showAuth();
    }

    // Check reminders every 10 seconds locally to trigger alerts smoothly
    setInterval(checkRemindersLocal, 10000);
}

function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    fetchMedicines();
    fetchLogs();
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-User-Id': currentUserId
    };
}

// Auth Logic
function setupAuth() {
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        loginMsg.innerText = '';
    });

    tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        signupMsg.innerText = '';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                currentUserId = data.user_id;
                localStorage.setItem('user_id', currentUserId);
                showApp();
                loginForm.reset();
            } else {
                loginMsg.className = 'msg error';
                loginMsg.innerText = data.error || "Login failed";
            }
        } catch (err) {
            loginMsg.className = 'msg error';
            loginMsg.innerText = "Connection failed.";
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value;
        const phone = document.getElementById('signup-phone').value;
        try {
            const res = await fetch(`${API_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, phone })
            });
            const data = await res.json();
            if (res.ok && !data.error) {
                signupMsg.className = 'msg success';
                signupMsg.innerText = "Account created! Please login.";
                signupForm.reset();
                setTimeout(() => tabLogin.click(), 2000);
            } else {
                signupMsg.className = 'msg error';
                signupMsg.innerText = data.error || "Signup failed";
            }
        } catch (err) {
            signupMsg.className = 'msg error';
            signupMsg.innerText = "Connection failed.";
        }
    });

    btnLogout.addEventListener('click', () => {
        currentUserId = null;
        localStorage.removeItem('user_id');
        medicines = [];
        logs = [];
        showAuth();
    });
}

// Navigation
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const targetPage = link.getAttribute('data-page');
            pages.forEach(page => page.classList.remove('active'));
            document.getElementById(targetPage).classList.add('active');

            pageTitle.innerText = link.innerText.trim();

            if (targetPage === 'dashboard' || targetPage === 'medicine-list') {
                fetchMedicines();
            } else if (targetPage === 'logs') {
                fetchLogs();
            }
        });
    });
}

// Theme
function setupThemeToggle() {
    const isDark = localStorage.getItem('theme') === 'dark';
    themeSwitch.checked = isDark;
    if (isDark) document.body.setAttribute('data-theme', 'dark');

    themeSwitch.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Clock
function setupClock() {
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
}

// Notifications setup
function setupNotifications() {
    btnEnableNotif.addEventListener('click', () => {
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    btnEnableNotif.innerHTML = '<ion-icon name="notifications-outline"></ion-icon> Alerts Enabled';
                    btnEnableNotif.classList.replace('btn-secondary', 'btn-success');
                }
            });
        }
    });

    if ("Notification" in window && Notification.permission === "granted") {
        btnEnableNotif.innerHTML = '<ion-icon name="notifications-outline"></ion-icon> Alerts Enabled';
        btnEnableNotif.classList.replace('btn-secondary', 'btn-success');
    }
}

// API Calls
async function fetchMedicines() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_URL}/medicines`, { headers: getHeaders() });
        if (res.ok) {
            medicines = await res.json();
            renderDashboard();
            renderMedicineList(medicines);
        } else if (res.status === 401) {
            btnLogout.click();
        }
    } catch (err) {
        console.error("Error fetching medicines", err);
    }
}

async function fetchLogs() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_URL}/logs`, { headers: getHeaders() });
        if (res.ok) {
            logs = await res.json();
            renderLogs();
        }
    } catch (err) {
        console.error("Error fetching logs", err);
    }
}

addMedForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('med-name').value;
    const dosage = document.getElementById('med-dosage').value;
    const time = document.getElementById('med-time').value;
    const frequency = document.getElementById('med-frequency').value;

    try {
        const res = await fetch(`${API_URL}/add_medicine`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name, dosage, time, frequency })
        });
        const data = await res.json();

        if (res.ok) {
            formMsg.className = 'msg success';
            formMsg.innerText = data.message;
            addMedForm.reset();
            fetchMedicines();
        } else {
            formMsg.className = 'msg error';
            formMsg.innerText = data.error || "Error adding medicine";
        }
    } catch (err) {
        formMsg.className = 'msg error';
        formMsg.innerText = "Failed to connect to server.";
    }

    setTimeout(() => formMsg.innerText = '', 3000);
});

async function deleteMedicine(id) {
    if (confirm("Are you sure you want to delete this medicine?")) {
        await fetch(`${API_URL}/delete_medicine/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchMedicines();
    }
}

async function markAsTaken(id) {
    await fetch(`${API_URL}/mark_taken`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ medicine_id: id })
    });
    fetchMedicines();
    fetchLogs();
    closeAlertModal();
}

// Rendering
function renderDashboard() {
    const total = medicines.length;
    let taken = 0;
    let missed = 0;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    upcomingList.innerHTML = '';

    medicines.forEach(med => {
        const [h, m] = med.time.split(':').map(Number);
        const medMinutes = h * 60 + m;

        if (med.status === 'taken') {
            taken++;
        } else if (medMinutes < currentMinutes && med.status === 'not taken') {
            missed++;
        }

        // Show in upcoming if not taken and within next 12 hours, or missed today
        if (med.status === 'not taken') {
            upcomingList.appendChild(createMedCard(med));
        }
    });

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-taken').innerText = taken;
    document.getElementById('stat-missed').innerText = missed;
}

function renderMedicineList(meds) {
    medGrid.innerHTML = '';
    meds.forEach(med => {
        medGrid.appendChild(createMedCard(med));
    });
}

function renderLogs() {
    logsList.innerHTML = '';
    if (logs.length === 0) {
        logsList.innerHTML = '<p class="text-muted">No logs available.</p>';
        return;
    }
    logs.forEach(log => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${log.message}</span>
            <span class="log-time">${log.timestamp}</span>
        `;
        logsList.appendChild(li);
    });
}

function createMedCard(med) {
    const div = document.createElement('div');

    // Determine card state
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [h, m] = med.time.split(':').map(Number);
    const medMinutes = h * 60 + m;

    let stateClass = '';
    if (med.status === 'taken') stateClass = 'taken';
    else if (medMinutes < currentMinutes) stateClass = 'missed';

    div.className = `med-card ${stateClass}`;

    div.innerHTML = `
        <div class="med-card-header">
            <div class="med-name">${med.name}</div>
            <div class="med-time">
                <ion-icon name="time"></ion-icon> ${med.time}
            </div>
        </div>
        <div class="med-details">
            <p><ion-icon name="medical-outline"></ion-icon> ${med.dosage}</p>
            <p><ion-icon name="calendar-outline"></ion-icon> ${med.frequency.charAt(0).toUpperCase() + med.frequency.slice(1)}</p>
            <p><strong>Status:</strong> ${med.status.toUpperCase()}</p>
        </div>
        <div class="med-actions">
            ${med.status !== 'taken' ?
            `<button class="btn btn-success" onclick="markAsTaken(${med.id})">
                    <ion-icon name="checkmark"></ion-icon> Take
                </button>` : ''
        }
            <button class="btn btn-danger" onclick="deleteMedicine(${med.id})">
                <ion-icon name="trash"></ion-icon>
            </button>
        </div>
    `;
    return div;
}

// Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = medicines.filter(m => m.name.toLowerCase().includes(term));
    renderMedicineList(filtered);
});

// Reminder Logic Local
function checkRemindersLocal() {
    const now = new Date();
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    medicines.forEach(med => {
        if (med.time === currentTimeStr && med.status === 'not taken' && !notifiedMeds.has(med.id)) {
            triggerAlert(med);
            notifiedMeds.add(med.id);
        }
    });
}

function triggerAlert(med) {
    currentAlertMedId = med.id;
    alertMsg.innerText = `It's time to take ${med.dosage} of ${med.name}.`;

    // Play Sound
    alertSound.currentTime = 0;
    alertSound.play().catch(e => console.log("Audio play blocked by browser."));

    // Show Modal
    modal.classList.add('show');

    // Show Browser Notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("MediReminder Alerts", {
            body: `Time to take: ${med.name} (${med.dosage})`,
            icon: "https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
        });
    }
}

function closeAlertModal() {
    modal.classList.remove('show');
    alertSound.pause();
    currentAlertMedId = null;
}

btnSnooze.addEventListener('click', closeAlertModal);
btnTakeNow.addEventListener('click', () => {
    if (currentAlertMedId) {
        markAsTaken(currentAlertMedId);
    }
});

init();
