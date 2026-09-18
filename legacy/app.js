const appContainer = document.getElementById('app');
const overlayContainer = document.getElementById('overlay-container');

// State
let currentUser = JSON.parse(localStorage.getItem('erp_currentUser')) || null;
let currentViewParams = JSON.parse(localStorage.getItem('erp_currentViewParams')) || {};
let selectedYear = 'Year 1';
let selectedSection = 'Sec A';
let selectedHostel = 'Boys Hostel';
let selectedWardenSession = 'morning-roll';
let adminSelectedYear = 'All';
let adminSelectedSection = 'All';
let adminSelectedTime = 'Today';
let adminAbsenteesDate = null;

// Inactivity timer
let inactivityTimer = null;
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

function resetInactivityTimer() {
    if (!currentUser) return;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        showToast('Session expired due to inactivity.');
        logout();
    }, INACTIVITY_LIMIT_MS);
}

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('scroll', resetInactivityTimer);

// Utils
function getCurrentDateKey() {
    return new Date().toISOString().split('T')[0];
}

function checkIsHoliday(dateStr, type) {
    const d = new Date(dateStr);
    const isSunday = d.getDay() === 0;
    
    // Find if the date exists in predefined holidays
    const specificHoliday = mockData.holidays.find(h => h.date === dateStr);
    
    if (type === 'Class') {
        if (specificHoliday) return { isHoliday: true, name: specificHoliday.name };
        if (isSunday) return { isHoliday: true, name: 'Sunday' };
    } else if (type === 'Hostel') {
        if (specificHoliday && specificHoliday.affectsHostel) return { isHoliday: true, name: specificHoliday.name };
    }
    
    return { isHoliday: false, name: '' };
}

// Submissions State for tracking Grace Periods
// Key: "2026-08-31-Year 1-Sec A-morning", Value: { timestamp: Date.now(), records: {}, markedBy: '...' }
let submissions = JSON.parse(localStorage.getItem('erp_submissions')) || {};

function saveSubmissions() {
    localStorage.setItem('erp_submissions', JSON.stringify(submissions));
}

const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000; // 2 hours for grace period

// Router
function renderView(viewName, params = {}) {
    appContainer.innerHTML = '';
    appContainer.className = 'page-enter';
    
    // Save state
    localStorage.setItem('erp_currentView', viewName);
    localStorage.setItem('erp_currentViewParams', JSON.stringify(params));
    
    switch (viewName) {
        case 'login':
            appContainer.innerHTML = getLoginView();
            break;
        case 'admin-dashboard':
            appContainer.innerHTML = getAdminDashboardView(params.tab || 'master-list');
            break;
        case 'teacher-sessions':
            appContainer.innerHTML = getTeacherSessionsView();
            break;
        case 'teacher-attendance':
            appContainer.innerHTML = getTeacherAttendanceView(params.year, params.section, params.session);
            break;
        case 'teacher-search':
            appContainer.innerHTML = getTeacherSearchView();
            break;
        case 'warden-dashboard':
            appContainer.innerHTML = getWardenDashboardView();
            break;
        case 'warden-attendance':
            appContainer.innerHTML = getWardenAttendanceView(params.roomId, params.roomName, params.sessionId);
            break;
        default:
            appContainer.innerHTML = getLoginView();
    }
}

// Views
function getLoginView() {
    return `
        <div class="login-wrapper">
            <div class="glass-panel login-card">
                <h2 class="text-center mb-1">College ERP</h2>
                <p class="text-center text-muted mb-4">Sign in to your account</p>
                <form id="login-form">
                    <div class="input-group">
                        <label>Username</label>
                        <input type="text" id="login-username" class="input-control" placeholder="Enter username (e.g. admin, teacher1)" required>
                    </div>
                    <div class="input-group">
                        <label>Password</label>
                        <input type="password" id="login-password" class="input-control" placeholder="Enter password" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Login</button>
                </form>
            </div>
        </div>
    `;
}

function getAdminDashboardView(activeTab = 'master-list') {
    let mainContentHtml = '';

    if (activeTab === 'absentees-list') {
        mainContentHtml = `
            <div class="flex items-center justify-between mb-3">
                <h2 style="margin:0">Absentees List</h2>
                <button class="btn btn-outline" onclick="showToast('Exporting Absentees CSV...')">Download CSV</button>
            </div>
            <div class="flex gap-4 mb-4">
                <div class="input-group" style="flex: 1; max-width: 250px;">
                    <label>Filter by Date</label>
                    <input type="date" class="input-control" value="${adminAbsenteesDate || getCurrentDateKey()}" onchange="adminAbsenteesDate = this.value; renderView('admin-dashboard', {tab: 'absentees-list'})">
                </div>
            </div>
            <div class="data-table-wrapper" style="max-height: 50vh; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Class</th>
                            <th>Hostel Room</th>
                            <th>Session Context</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getAbsenteesListHtml()}
                    </tbody>
                </table>
            </div>
        `;
    } else if (activeTab === 'staff-allocation') {
        let staffRows = mockData.users
            .filter(u => u.role === 'teacher' || u.role === 'warden')
            .map(u => `<tr><td>${u.name}</td><td>${u.role}</td><td>${u.domain}</td></tr>`)
            .join('');

        mainContentHtml = `
            <h2 class="mb-3">Staff Allocation</h2>
            <div class="flex gap-2 mb-4">
                <button class="btn btn-primary" onclick="showAssignTeacherModal()">Assign Teacher</button>
                <button class="btn btn-outline" onclick="showAssignWardenModal()">Assign Warden</button>
            </div>
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Staff Name</th><th>Role</th><th>Assigned Domain</th></tr></thead>
                    <tbody>
                        ${staffRows || '<tr><td colspan="3" class="text-center text-muted">No staff allocated</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } else if (activeTab === 'global-analytics') {
        let totalStudents = 0;
        for (const year in mockData.students) {
            for (const section in mockData.students[year]) {
                totalStudents += mockData.students[year][section].length;
            }
        }

        let todayP = 0;
        let todayTotal = 0;
        const todayStr = getCurrentDateKey();
        for (const [key, sub] of Object.entries(submissions)) {
            if (key.startsWith(todayStr) && !key.includes('-Warden-')) {
                for (const rollNo in sub.records) {
                    todayTotal++;
                    if (sub.records[rollNo] === 'P') todayP++;
                }
            }
        }
        let todayAttPct = todayTotal === 0 ? 'N/A' : Math.round((todayP / todayTotal) * 100) + '%';

        let totalHostelStudents = 0;
        for (const roomId in mockData.wardenStudents) {
            totalHostelStudents += mockData.wardenStudents[roomId].length;
        }
        let hostelOccPct = totalStudents === 0 ? '0%' : Math.round((totalHostelStudents / totalStudents) * 100) + '%';

        let chartBars = '';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = [];
        const now = new Date();
        for (let i = 6; i >= 1; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days.push(dayNames[d.getDay()]);
        }
        days.push('Today');
        
        let lastDayPct = todayTotal === 0 ? 96 : Math.round((todayP / todayTotal) * 100);
        const dummyData = [92, 94, 89, 95, 91, 85, lastDayPct]; 

        dummyData.forEach((pct, i) => {
            chartBars += `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div style="height: 150px; width: 40px; background: #e2e8f0; border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden;">
                        <div style="width: 100%; background: var(--primary-color); border-radius: 6px; height: ${pct}%; opacity: ${i === 6 ? '1' : '0.6'};"></div>
                    </div>
                    <span style="font-size: 0.8rem; color: #64748b; font-weight: 500;">${days[i]}</span>
                    <span style="font-size: 0.75rem; font-weight: bold; color: var(--primary-color)">${pct}%</span>
                </div>
            `;
        });

        mainContentHtml = `
            <h2 class="mb-3">Global Analytics</h2>
            <div class="flex gap-4 mb-4" style="flex-wrap: wrap;">
                <div class="card" style="flex: 1; min-width: 200px; text-align: center;">
                    <h4 class="text-muted">Total Students</h4>
                    <h2 style="font-size: 2.5rem; margin: 10px 0;">${totalStudents}</h2>
                </div>
                <div class="card" style="flex: 1; min-width: 200px; text-align: center;">
                    <h4 class="text-muted">Today's Class Attendance</h4>
                    <h2 style="font-size: 2.5rem; margin: 10px 0; color: var(--success);">${todayAttPct}</h2>
                </div>
                <div class="card" style="flex: 1; min-width: 200px; text-align: center;">
                    <h4 class="text-muted">Hostel Allocation</h4>
                    <h2 style="font-size: 2.5rem; margin: 10px 0;">${hostelOccPct}</h2>
                </div>
            </div>
            <div class="card p-4">
                <h3 class="mb-3" style="text-align: center;">7-Day Attendance Trend</h3>
                <div style="display: flex; justify-content: space-around; align-items: flex-end; padding: 10px; height: 200px;">
                    ${chartBars}
                </div>
                <div class="text-center text-muted" style="font-size: 0.85rem; margin-top: 15px;">Historical data is simulated. "Today" uses live data.</div>
            </div>
        `;
    } else {
        // master-list
        const teacherSessionHeaders = mockData.sessions.map(s => `<th>${s.name}</th>`).join('');
        const wardenSessionHeaders = mockData.wardenSessions.map(s => `<th>${s.name}</th>`).join('');

        mainContentHtml = `
            <div class="flex items-center justify-between mb-3">
                <h2 style="margin:0">Master Student List</h2>
                <div class="flex gap-2">
                    <button class="btn btn-primary" onclick="showAdminAddStudentModal()">Add Student</button>
                    <button class="btn btn-outline" onclick="downloadMasterListCSV()">Download CSV</button>
                </div>
            </div>
            
            <div class="flex gap-4 mb-4" style="flex-wrap: wrap;">
                <div class="input-group" style="flex: 1; min-width: 150px;">
                    <label>Search</label>
                    <input type="text" id="admin-search" class="input-control" placeholder="Name or Roll No..." onkeyup="filterMasterList()">
                </div>
                <div class="input-group" style="flex: 1; min-width: 150px;">
                    <label>Time Range</label>
                    <select class="input-control" onchange="adminSelectedTime = this.value; renderView('admin-dashboard', {tab: 'master-list'})">
                        <option value="Today" ${adminSelectedTime === 'Today' ? 'selected' : ''}>Today</option>
                        <option value="1 Week" ${adminSelectedTime === '1 Week' ? 'selected' : ''}>Last 1 Week</option>
                        <option value="1 Month" ${adminSelectedTime === '1 Month' ? 'selected' : ''}>Last 1 Month</option>
                        <option value="3 Months" ${adminSelectedTime === '3 Months' ? 'selected' : ''}>Last 3 Months</option>
                        <option value="All Time" ${adminSelectedTime === 'All Time' ? 'selected' : ''}>All Time</option>
                    </select>
                </div>
                <div class="input-group" style="flex: 1; min-width: 150px;">
                    <label>Academic Year</label>
                    <select class="input-control" onchange="adminSelectedYear = this.value; renderView('admin-dashboard', {tab: 'master-list'})">
                        <option value="All" ${adminSelectedYear === 'All' ? 'selected' : ''}>All Years</option>
                        <option value="Year 1" ${adminSelectedYear === 'Year 1' ? 'selected' : ''}>1st Year</option>
                        <option value="Year 2" ${adminSelectedYear === 'Year 2' ? 'selected' : ''}>2nd Year</option>
                    </select>
                </div>
                <div class="input-group" style="flex: 1; min-width: 150px;">
                    <label>Section</label>
                    <select class="input-control" onchange="adminSelectedSection = this.value; renderView('admin-dashboard', {tab: 'master-list'})">
                        <option value="All" ${adminSelectedSection === 'All' ? 'selected' : ''}>All Sections</option>
                        <option value="Sec A" ${adminSelectedSection === 'Sec A' ? 'selected' : ''}>Section A</option>
                        <option value="Sec B" ${adminSelectedSection === 'Sec B' ? 'selected' : ''}>Section B</option>
                        <option value="Sec C" ${adminSelectedSection === 'Sec C' ? 'selected' : ''}>Section C</option>
                        <option value="Sec D" ${adminSelectedSection === 'Sec D' ? 'selected' : ''}>Section D</option>
                    </select>
                </div>
            </div>
            
            <div class="data-table-wrapper" style="max-height: 50vh; overflow-y: auto;">
                <table class="data-table" style="font-size: 0.9rem">
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th>Class</th>
                            ${teacherSessionHeaders}
                            <th>Hostel Room</th>
                            ${wardenSessionHeaders}
                        </tr>
                    </thead>
                    <tbody>
                        ${getAllStudentsData()}
                    </tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item ${activeTab === 'absentees-list' ? 'active' : ''}" style="cursor:pointer" onclick="renderView('admin-dashboard', {tab: 'absentees-list'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Absentees
                    </a>
                    <a class="nav-item ${activeTab === 'staff-allocation' ? 'active' : ''}" style="cursor:pointer" onclick="renderView('admin-dashboard', {tab: 'staff-allocation'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                        Staff
                    </a>
                    <a class="nav-item ${activeTab === 'master-list' ? 'active' : ''}" style="cursor:pointer" onclick="renderView('admin-dashboard', {tab: 'master-list'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
                        Master List
                    </a>
                    <a class="nav-item ${activeTab === 'global-analytics' ? 'active' : ''}" style="cursor:pointer" onclick="renderView('admin-dashboard', {tab: 'global-analytics'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                        Analytics
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Admin Portal</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'A'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Administrator'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Admin</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    ${mainContentHtml}
                </main>
            </div>
            
            <nav class="bottom-nav">
                <div class="bottom-nav-inner">
                    <a class="tab-item ${activeTab === 'absentees-list' ? 'active' : ''}" onclick="renderView('admin-dashboard', {tab: 'absentees-list'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Absentees
                    </a>
                    <a class="tab-item ${activeTab === 'staff-allocation' ? 'active' : ''}" onclick="renderView('admin-dashboard', {tab: 'staff-allocation'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                        Staff
                    </a>
                    <a class="tab-item ${activeTab === 'master-list' ? 'active' : ''}" onclick="renderView('admin-dashboard', {tab: 'master-list'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
                        Students
                    </a>
                    <a class="tab-item ${activeTab === 'global-analytics' ? 'active' : ''}" onclick="renderView('admin-dashboard', {tab: 'global-analytics'})">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                        Analytics
                    </a>
                </div>
            </nav>
        </div>
    `;
}

function getAllStudentsData() {
    let rowsHtml = '';
    const dateKey = getCurrentDateKey();
    
    // First, map warden students to a quick lookup dictionary: rollNo -> roomId
    const hostelMapping = {};
    for (const roomId in mockData.wardenStudents) {
        mockData.wardenStudents[roomId].forEach(student => {
            hostelMapping[student.rollNo] = roomId;
        });
    }

    for (const year in mockData.students) {
        if (adminSelectedYear !== 'All' && year !== adminSelectedYear) continue;
        
        for (const section in mockData.students[year]) {
            if (adminSelectedSection !== 'All' && section !== adminSelectedSection) continue;
            
            mockData.students[year][section].forEach(student => {
                const rollNo = student.rollNo;
                
                // Get Class Attendance for all sessions
                let teacherCellsHtml = '';
                mockData.sessions.forEach(session => {
                    const classSessionKey = `${dateKey}-${year}-${section}-${session.id}`;
                    const classSub = submissions[classSessionKey];
                    let classAtt = '<span class="text-muted">Not Marked</span>';
                    
                    if (classSub && classSub.records && classSub.records[rollNo]) {
                        const status = classSub.records[rollNo];
                        const markedByStr = classSub.markedBy ? ` <span style="font-size: 0.75rem; color: #888;">(by ${classSub.markedBy})</span>` : '';
                        if (status === 'P') classAtt = `<span style="color: var(--success); font-weight: bold;">Present</span>${markedByStr}`;
                        else if (status === 'A') classAtt = `<span style="color: var(--danger); font-weight: bold;">Absent</span>${markedByStr}`;
                    }
                    teacherCellsHtml += `<td>${classAtt}</td>`;
                });
                
                // Get Hostel Status
                const roomId = hostelMapping[rollNo];
                let hostelRoomStr = '<span class="text-muted">Day Scholar</span>';
                let wardenCellsHtml = '';
                
                if (roomId) {
                    hostelRoomStr = `<strong>${roomId}</strong>`;
                    mockData.wardenSessions.forEach(session => {
                        const wardenKey = `${dateKey}-Warden-${roomId}-${session.id}`;
                        const wardenSub = submissions[wardenKey];
                        let hostelAtt = '<span class="text-muted">Not Marked</span>';
                        
                        if (wardenSub && wardenSub.records && wardenSub.records[rollNo]) {
                            const status = wardenSub.records[rollNo];
                            const markedByStr = wardenSub.markedBy ? ` <span style="font-size: 0.75rem; color: #888;">(by ${wardenSub.markedBy})</span>` : '';
                            if (status === 'P') hostelAtt = `<span style="color: var(--success); font-weight: bold;">Present</span>${markedByStr}`;
                            else if (status === 'A') hostelAtt = `<span style="color: var(--danger); font-weight: bold;">Absent</span>${markedByStr}`;
                        }
                        wardenCellsHtml += `<td>${hostelAtt}</td>`;
                    });
                } else {
                    // Empty cells for Day Scholars
                    mockData.wardenSessions.forEach(() => {
                        wardenCellsHtml += `<td>-</td>`;
                    });
                }
                
                rowsHtml += `
                    <tr>
                        <td>${rollNo}</td>
                        <td>${student.name}</td>
                        <td>${year} - ${section}</td>
                        ${teacherCellsHtml}
                        <td>${hostelRoomStr}</td>
                        ${wardenCellsHtml}
                    </tr>
                `;
            });
        }
    }
    
    const totalCols = 4 + mockData.sessions.length + mockData.wardenSessions.length;
    return rowsHtml || `<tr><td colspan="${totalCols}" class="text-center text-muted">No students found</td></tr>`;
}

function getAbsenteesListHtml() {
    let rowsHtml = '';
    const targetDate = adminAbsenteesDate || getCurrentDateKey();
    
    // Map rollNo to student info for quick lookup
    const studentInfo = {};
    for (const year in mockData.students) {
        for (const section in mockData.students[year]) {
            mockData.students[year][section].forEach(s => {
                studentInfo[s.rollNo] = { name: s.name, class: `${year} - ${section}` };
            });
        }
    }
    for (const roomId in mockData.wardenStudents) {
        mockData.wardenStudents[roomId].forEach(s => {
            if (studentInfo[s.rollNo]) {
                studentInfo[s.rollNo].hostel = roomId;
            }
        });
    }

    for (const [key, sub] of Object.entries(submissions)) {
        const dateStr = key.substring(0, 10); // YYYY-MM-DD
        if (dateStr === targetDate) {
            const rest = key.substring(11);
            let context = '';
            
            if (rest.startsWith('Warden-')) {
                // e.g. Warden-B-101-morning-roll
                const parts = rest.split('-');
                if (parts.length >= 4) {
                    const roomId = parts[1] + '-' + parts[2];
                    const sessionNameObj = mockData.wardenSessions.find(s => s.id === parts.slice(3).join('-'));
                    const sName = sessionNameObj ? sessionNameObj.name : 'Roll Call';
                    context = `Hostel ${roomId} (${sName})`;
                } else {
                    context = 'Hostel ' + rest.substring(7);
                }
            } else {
                // e.g. Year 1-Sec A-morning
                const parts = rest.split('-');
                if (parts.length >= 3) {
                    const yearSec = parts[0] + ' - ' + parts[1];
                    const sessionNameObj = mockData.sessions.find(s => s.id === parts.slice(2).join('-'));
                    const sName = sessionNameObj ? sessionNameObj.name : 'Class';
                    context = `${yearSec} (${sName})`;
                } else {
                    context = 'Class ' + rest;
                }
            }
            
            for (const rollNo in sub.records) {
                if (sub.records[rollNo] === 'A') {
                    const info = studentInfo[rollNo] || { name: 'Unknown', class: 'Unknown', hostel: '-' };
                    rowsHtml += `
                        <tr>
                            <td>${dateStr}</td>
                            <td>${rollNo}</td>
                            <td>${info.name}</td>
                            <td>${info.class}</td>
                            <td>${info.hostel || '-'}</td>
                            <td>${context}</td>
                        </tr>
                    `;
                }
            }
        }
    }
    
    return rowsHtml || '<tr><td colspan="6" class="text-center text-muted">No absentees found for this date</td></tr>';
}

function filterMasterList() {
    const query = document.getElementById('admin-search').value.toLowerCase();
    const rows = document.querySelectorAll('.data-table tbody tr');
    let hasVisible = false;
    
    rows.forEach(row => {
        // Skip the "No students found" row if present
        if (row.cells.length === 1) return;
        
        const rollNo = row.cells[0].innerText.toLowerCase();
        const name = row.cells[1].innerText.toLowerCase();
        
        if (rollNo.includes(query) || name.includes(query)) {
            row.style.display = '';
            hasVisible = true;
        } else {
            row.style.display = 'none';
        }
    });
}

function downloadMasterListCSV() {
    const table = document.querySelector('.data-table');
    if (!table) return;

    let csvContent = "";
    
    // Get headers
    const headers = Array.from(table.querySelectorAll('th')).map(th => `"${th.innerText}"`);
    csvContent += headers.join(",") + "\n";
    
    // Get rows (only visible ones to respect filters and search)
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            if (row.cells.length === 1) return; // Skip "No students found" row
            
            const cols = Array.from(row.querySelectorAll('td')).map(td => {
                let text = td.innerText.replace(/"/g, '""'); // Escape quotes
                return `"${text}"`; // Quote fields to handle commas
            });
            csvContent += cols.join(",") + "\n";
        }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    // Generate smart filename based on filters
    const searchVal = document.getElementById('admin-search').value.trim();
    let nameParts = ['attendance'];
    if (adminSelectedYear !== 'All') nameParts.push(adminSelectedYear.replace(' ', ''));
    if (adminSelectedSection !== 'All') nameParts.push(adminSelectedSection.replace(' ', ''));
    if (adminSelectedTime !== 'Today') nameParts.push(adminSelectedTime.replace(' ', ''));
    if (searchVal) nameParts.push(searchVal.replace(/\s+/g, '_'));
    
    const dateStr = new Date().toISOString().split('T')[0];
    nameParts.push(dateStr);
    
    const finalFilename = nameParts.join('_') + '.csv';
    link.setAttribute("download", finalFilename);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Downloaded: " + finalFilename);
}

function getTeacherSessionsView() {
    let sessionsHtml = mockData.sessions.map(s => {
        const dateKey = getCurrentDateKey();
        const key = `${dateKey}-${selectedYear}-${selectedSection}-${s.id}`;
        const sub = submissions[key];
        let statusHtml = '<span class="text-muted">Not Marked</span>';
        let isLocked = false;
        
        if (sub) {
            const timeElapsed = Date.now() - sub.timestamp;
            if (timeElapsed < GRACE_PERIOD_MS) {
                const timeLeft = Math.ceil((GRACE_PERIOD_MS - timeElapsed) / 60000);
                const hoursLeft = Math.floor(timeLeft / 60);
                const minsLeft = timeLeft % 60;
                const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
                statusHtml = `<span style="color: var(--success)">Marked (Editable ${timeStr} left)</span>`;
            } else {
                isLocked = true;
                statusHtml = `<span style="color: var(--danger)">Locked</span>`;
            }
        }
        
        return `
            <div class="card glass-card mb-3" style="cursor: pointer; border-left: 4px solid ${isLocked ? 'var(--danger)' : sub ? 'var(--success)' : 'var(--primary)'}" 
                 onclick="renderView('teacher-attendance', { year: '${selectedYear}', section: '${selectedSection}', session: '${s.id}' })">
                <div class="flex justify-between items-center">
                    <div style="display: flex; align-items: center; gap: 1rem">
                        <div class="btn-icon" style="background: var(--primary-light); color: var(--primary)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem">${s.name}</h4>
                            <p class="text-muted" style="font-size: 0.85rem; margin-top: 0.2rem;">${s.time}</p>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; font-weight: 500">${statusHtml}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item active" style="cursor:pointer" onclick="renderView('teacher-sessions')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                        Sessions
                    </a>
                    <a class="nav-item" style="cursor:pointer" onclick="renderView('teacher-search')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                        Search
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Teacher Dashboard</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'T'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Teacher'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Teacher</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    <h2 class="mb-3">Select Class Session</h2>
                    <div class="flex gap-4 mb-4">
                        <div class="input-group" style="flex: 1">
                            <label>Academic Year</label>
                            <select id="year-filter" class="input-control" onchange="selectedYear = this.value; renderView('teacher-sessions')">
                                <option value="Year 1" ${selectedYear === 'Year 1' ? 'selected' : ''}>1st Year</option>
                                <option value="Year 2" ${selectedYear === 'Year 2' ? 'selected' : ''}>2nd Year</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex: 1">
                            <label>Section</label>
                            <select id="section-filter" class="input-control" onchange="selectedSection = this.value; renderView('teacher-sessions')">
                                <option value="Sec A" ${selectedSection === 'Sec A' ? 'selected' : ''}>Section A</option>
                                <option value="Sec B" ${selectedSection === 'Sec B' ? 'selected' : ''}>Section B</option>
                                <option value="Sec C" ${selectedSection === 'Sec C' ? 'selected' : ''}>Section C</option>
                                <option value="Sec D" ${selectedSection === 'Sec D' ? 'selected' : ''}>Section D</option>
                            </select>
                        </div>
                    </div>
                    
                    <h3 class="mb-2 mt-4">Today's Sessions</h3>
                    ${sessionsHtml}
                </main>
            </div>
            ${getBottomNav('sessions')}
        </div>
    `;
}

function getTeacherAttendanceView(year, section, sessionId) {
    const sessionObj = mockData.sessions.find(s => s.id === sessionId);
    const sessionName = sessionObj ? sessionObj.name : 'Unknown Session';
    const sessionTime = sessionObj ? sessionObj.time : null;
    
    const dateKey = getCurrentDateKey();
    
    const holidayCheck = checkIsHoliday(dateKey, 'Class');
    if (holidayCheck.isHoliday) {
        return `
            <div class="app-layout">
                <aside class="sidebar">
                    <div class="sidebar-brand">
                        <div class="sidebar-brand-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                            </svg>
                        </div>
                        <h3>College ERP</h3>
                    </div>
                    <nav class="sidebar-nav">
                        <a class="nav-item active" style="cursor:pointer" onclick="renderView('teacher-sessions')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                            Sessions
                        </a>
                        <a class="nav-item" style="cursor:pointer" onclick="renderView('teacher-search')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                            Search
                        </a>
                    </nav>
                </aside>
                <div class="main-wrapper">
                    <header class="top-header">
                        <div>
                            <h2 style="font-size: 1.2rem; margin: 0">Teacher Dashboard</h2>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div class="user-profile" style="cursor: default; pointer-events: none;">
                                <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'T'}</div>
                                <div style="display: flex; flex-direction: column;">
                                    <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Teacher'}</span>
                                    <span class="text-muted" style="font-size: 0.75rem">Teacher</span>
                                </div>
                            </div>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </header>
                    <main class="main-content">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h2>${year} - ${section}</h2>
                                <p class="text-muted">${sessionName} Attendance</p>
                            </div>
                        </div>
                        <div class="card text-center p-5" style="border-left: 4px solid var(--primary-color)">
                            <h3 class="mb-2">Holiday: ${holidayCheck.name}</h3>
                            <p class="text-muted">Class attendance is disabled for today.</p>
                        </div>
                        <button class="btn btn-outline mt-4" onclick="renderView('teacher-sessions')">Back</button>
                    </main>
                </div>
                ${getBottomNav('sessions')}
            </div>
        `;
    }
    
    const key = `${dateKey}-${year}-${section}-${sessionId}`;
    const sub = submissions[key];
    let isLocked = false;
    let lockMessage = '';
    
    if (sessionTime && !isSessionActive(sessionTime)) {
        isLocked = true;
        lockMessage = `<div class="mb-3 p-3" style="background: var(--warning-bg); color: var(--warning); border-radius: 8px; font-weight: 500;">Attendance can only be marked during the allotted session time: ${sessionTime}.</div>`;
    }
    
    if (sub) {
        const timeElapsed = Date.now() - sub.timestamp;
        if (timeElapsed >= GRACE_PERIOD_MS) {
            isLocked = true;
            lockMessage = '<div class="mb-3 p-3" style="background: var(--danger-bg); color: var(--danger); border-radius: 8px; font-weight: 500;">This session is locked as SMS notifications have already been dispatched.</div>';
        } else {
            isLocked = false;
            const timeLeft = Math.ceil((GRACE_PERIOD_MS - timeElapsed) / 60000);
            const hoursLeft = Math.floor(timeLeft / 60);
            const minsLeft = timeLeft % 60;
            const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
            lockMessage = `<div class="mb-3 p-3" style="background: var(--success-bg); color: var(--success); border-radius: 8px; font-weight: 500;">Attendance marked. You have ${timeStr} left to make edits before it locks.</div>`;
        }
    }
    
    const studentList = mockData.students[year] && mockData.students[year][section] ? mockData.students[year][section] : [];
    
    let studentsHtml = studentList.length > 0 ? `
        <div class="data-table-wrapper" style="margin-top: 1rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <table class="data-table" style="margin: 0; min-width: 100%;">
                <thead style="background: var(--bg-surface-solid);">
                    <tr>
                        <th style="width: 25%">Roll No</th>
                        <th style="width: 45%">Name</th>
                        <th style="width: 30%; text-align: right">Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentList.map(s => {
                        const disabledAttr = isLocked ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
                        let pClass = "mark-btn btn-p";
                        let aClass = "mark-btn btn-a";
                        
                        if (sub && sub.records && sub.records[s.rollNo]) {
                            if (sub.records[s.rollNo] === 'P') pClass += " selected-p";
                            if (sub.records[s.rollNo] === 'A') aClass += " selected-a";
                        }
                        
                        return `
                        <tr class="attendance-table-row" data-roll="${s.rollNo}" style="background: var(--bg-surface-solid); transition: background-color 0.2s;">
                            <td style="font-weight: 500;">${s.rollNo}</td>
                            <td style="font-weight: 600; color: var(--text-main); font-size: 1.05rem;">${s.name}</td>
                            <td>
                                <div class="attendance-options" style="justify-content: flex-end; background: transparent; padding: 0;">
                                    <button class="${pClass}" style="width: 36px; height: 36px; font-size: 0.95rem; border-radius: 6px;" onclick="markAttendance(this, 'P')" ${disabledAttr}>P</button>
                                    <button class="${aClass}" style="width: 36px; height: 36px; font-size: 0.95rem; border-radius: 6px;" onclick="markAttendance(this, 'A')" ${disabledAttr}>A</button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    ` : '<div class="card p-4 text-center text-muted">No students found for this section.</div>';

    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item active" style="cursor:pointer" onclick="renderView('teacher-sessions')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                        Sessions
                    </a>
                    <a class="nav-item" style="cursor:pointer" onclick="renderView('teacher-search')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                        Search
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Teacher Dashboard</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'T'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Teacher'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Teacher</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    <div class="flex items-center justify-between mb-4" style="flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="font-size: 1.6rem; margin-bottom: 0.2rem;">${year} - ${section}</h2>
                            <p class="text-muted" style="font-size: 0.95rem;">${sessionName} Attendance</p>
                        </div>
                        <div class="flex gap-2">
                            ${!isLocked && studentList.length > 0 ? `<button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="submitAttendance('${year}', '${section}', '${sessionId}')">Submit</button>` : ''}
                        </div>
                    </div>
                    ${lockMessage}
                    <div class="attendance-list-container">
                        ${studentsHtml}
                    </div>
                    <button class="btn btn-outline mt-4" onclick="renderView('teacher-sessions')">Back</button>
                </main>
            </div>
            ${getBottomNav('sessions')}
        </div>
    `;
}

function getTeacherSearchView() {
    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item" style="cursor:pointer" onclick="renderView('teacher-sessions')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                        Sessions
                    </a>
                    <a class="nav-item active" style="cursor:pointer" onclick="renderView('teacher-search')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                        Search
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Teacher Dashboard</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'T'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Teacher'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Teacher</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    <h2 class="mb-4">Student Search</h2>
                    <div class="input-group" style="max-width: 500px;">
                        <input type="text" class="input-control" placeholder="Enter Roll Number">
                    </div>
                    <button class="btn btn-primary mb-4" onclick="showToast('Searching...')">Search</button>
                    
                    <div class="card glass-card" style="max-width: 800px;">
                        <h4>Unified Timeline</h4>
                        <p class="text-muted mb-3">Search a roll number to view history.</p>
                        <button class="btn btn-outline" onclick="showToast('PDF Export Triggered')">Generate PDF</button>
                    </div>
                </main>
            </div>
            ${getBottomNav('search')}
        </div>
    `;
}

function getWardenDashboardView() {
    let roomsHtml = mockData.rooms[selectedHostel].map(r => {
        const dateKey = getCurrentDateKey();
        const key = `${dateKey}-Warden-${r.id}-${selectedWardenSession}`;
        const sub = submissions[key];
        let statusHtml = '<span class="text-muted">Not Marked</span>';
        let isLocked = false;
        
        if (sub) {
            const timeElapsed = Date.now() - sub.timestamp;
            if (timeElapsed < GRACE_PERIOD_MS) {
                const timeLeft = Math.ceil((GRACE_PERIOD_MS - timeElapsed) / 60000);
                const hoursLeft = Math.floor(timeLeft / 60);
                const minsLeft = timeLeft % 60;
                const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
                statusHtml = `<span style="color: var(--success)">Marked (Editable ${timeStr} left)</span>`;
            } else {
                isLocked = true;
                statusHtml = `<span style="color: var(--danger)">Locked</span>`;
            }
        }
        
        return `
            <div class="card glass-card mb-3" style="cursor: pointer; border-left: 4px solid ${isLocked ? 'var(--danger)' : sub ? 'var(--success)' : 'var(--primary)'}" onclick="renderView('warden-attendance', {roomId: '${r.id}', roomName: '${r.name}', sessionId: '${selectedWardenSession}'})">
                <div class="flex justify-between items-center">
                    <div style="display: flex; align-items: center; gap: 1rem">
                        <div class="btn-icon" style="background: var(--primary-light); color: var(--primary)">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem">${r.name}</h4>
                            <p class="text-muted" style="font-size: 0.85rem; margin-top: 0.2rem">Tap to take roll call</p>
                        </div>
                    </div>
                    <div style="font-size: 0.9rem; font-weight: 500">${statusHtml}</div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item active" style="cursor:pointer" onclick="renderView('warden-dashboard')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                        Dashboard
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Hostel Dashboard</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'W'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Warden'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Warden</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    <h2 class="mb-3">Select Room</h2>
                    <div class="flex gap-4 mb-4">
                        <div class="input-group" style="flex: 1; max-width: 250px;">
                            <label>Select Hostel</label>
                            <select id="hostel-filter" class="input-control" onchange="selectedHostel = this.value; renderView('warden-dashboard')">
                                <option value="Boys Hostel" ${selectedHostel === 'Boys Hostel' ? 'selected' : ''}>Boys Hostel</option>
                                <option value="Girls Hostel" ${selectedHostel === 'Girls Hostel' ? 'selected' : ''}>Girls Hostel</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex: 1; max-width: 250px;">
                            <label>Select Session</label>
                            <select id="session-filter" class="input-control" onchange="selectedWardenSession = this.value; renderView('warden-dashboard')">
                                ${mockData.wardenSessions.map(s => `<option value="${s.id}" ${selectedWardenSession === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <h3 class="mb-2 mt-4">Rooms</h3>
                    ${roomsHtml}
                </main>
            </div>
            ${getBottomNav('dashboard')}
        </div>
    `;
}

function getWardenAttendanceView(roomId, roomName, sessionId) {
    const studentList = mockData.wardenStudents[roomId] || [];
    const sessionObj = mockData.wardenSessions.find(s => s.id === sessionId);
    const sessionTime = sessionObj ? sessionObj.time : null;
    
    const dateKey = getCurrentDateKey();
    
    const holidayCheck = checkIsHoliday(dateKey, 'Hostel');
    if (holidayCheck.isHoliday) {
        return `
            <div class="app-layout">
                <aside class="sidebar">
                    <div class="sidebar-brand">
                        <div class="sidebar-brand-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                            </svg>
                        </div>
                        <h3>College ERP</h3>
                    </div>
                    <nav class="sidebar-nav">
                        <a class="nav-item active" style="cursor:pointer" onclick="renderView('warden-dashboard')">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                            Dashboard
                        </a>
                    </nav>
                </aside>
                <div class="main-wrapper">
                    <header class="top-header">
                        <div>
                            <h2 style="font-size: 1.2rem; margin: 0">Hostel Dashboard</h2>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1.5rem;">
                            <div class="user-profile" style="cursor: default; pointer-events: none;">
                                <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'W'}</div>
                                <div style="display: flex; flex-direction: column;">
                                    <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Warden'}</span>
                                    <span class="text-muted" style="font-size: 0.75rem">Warden</span>
                                </div>
                            </div>
                            <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    </header>
                    <main class="main-content">
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <h2>${selectedHostel} - ${roomName}</h2>
                                <p class="text-muted">Room Roll Call</p>
                            </div>
                        </div>
                        <div class="card text-center p-5" style="border-left: 4px solid var(--primary-color)">
                            <h3 class="mb-2">Hostel Holiday: ${holidayCheck.name}</h3>
                            <p class="text-muted">Hostel roll call and parent notifications are disabled for today.</p>
                        </div>
                        <button class="btn btn-outline mt-4" onclick="renderView('warden-dashboard')">Back</button>
                    </main>
                </div>
                ${getBottomNav('dashboard')}
            </div>
        `;
    }

    const key = `${dateKey}-Warden-${roomId}-${sessionId}`;
    const sub = submissions[key];
    let isLocked = false;
    let lockMessage = '';
    
    if (sessionTime && !isSessionActive(sessionTime)) {
        isLocked = true;
        lockMessage = `<div class="mb-3 p-3" style="background: var(--warning-bg); color: var(--warning); border-radius: 8px; font-weight: 500;">Attendance can only be marked during the allotted session time: ${sessionTime}.</div>`;
    }
    
    if (sub) {
        const timeElapsed = Date.now() - sub.timestamp;
        if (timeElapsed >= GRACE_PERIOD_MS) {
            isLocked = true;
            lockMessage = '<div class="mb-3 p-3" style="background: var(--danger-bg); color: var(--danger); border-radius: 8px; font-weight: 500;">This session is locked as SMS notifications have already been dispatched.</div>';
        } else {
            isLocked = false;
            const timeLeft = Math.ceil((GRACE_PERIOD_MS - timeElapsed) / 60000);
            const hoursLeft = Math.floor(timeLeft / 60);
            const minsLeft = timeLeft % 60;
            const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
            lockMessage = `<div class="mb-3 p-3" style="background: var(--success-bg); color: var(--success); border-radius: 8px; font-weight: 500;">Attendance marked. You have ${timeStr} left to make edits before it locks.</div>`;
        }
    }
    
    let studentsHtml = studentList.length > 0 ? `
        <div class="data-table-wrapper" style="margin-top: 1rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <table class="data-table" style="margin: 0; min-width: 100%;">
                <thead style="background: var(--bg-surface-solid);">
                    <tr>
                        <th style="width: 25%">Roll No</th>
                        <th style="width: 45%">Name</th>
                        <th style="width: 30%; text-align: right">Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    ${studentList.map(s => {
                        const disabledAttr = isLocked ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
                        let pClass = "mark-btn btn-p";
                        let aClass = "mark-btn btn-a";
                        
                        if (sub && sub.records && sub.records[s.rollNo]) {
                            if (sub.records[s.rollNo] === 'P') pClass += " selected-p";
                            if (sub.records[s.rollNo] === 'A') aClass += " selected-a";
                        }
                        
                        return `
                        <tr class="attendance-table-row" data-roll="${s.rollNo}" style="background: var(--bg-surface-solid); transition: background-color 0.2s;">
                            <td style="font-weight: 500;">${s.rollNo}</td>
                            <td style="font-weight: 600; color: var(--text-main); font-size: 1.05rem;">${s.name}</td>
                            <td>
                                <div class="attendance-options" style="justify-content: flex-end; background: transparent; padding: 0;">
                                    <button class="${pClass}" style="width: 36px; height: 36px; font-size: 0.95rem; border-radius: 6px;" onclick="markAttendance(this, 'P')" ${disabledAttr}>P</button>
                                    <button class="${aClass}" style="width: 36px; height: 36px; font-size: 0.95rem; border-radius: 6px;" onclick="markAttendance(this, 'A')" ${disabledAttr}>A</button>
                                </div>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    ` : '<div class="card p-4 text-center text-muted">No students assigned to this room.</div>';

    return `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-brand-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                        </svg>
                    </div>
                    <h3>College ERP</h3>
                </div>
                <nav class="sidebar-nav">
                    <a class="nav-item active" style="cursor:pointer" onclick="renderView('warden-dashboard')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
                        Dashboard
                    </a>
                </nav>
            </aside>
            <div class="main-wrapper">
                <header class="top-header">
                    <div>
                        <h2 style="font-size: 1.2rem; margin: 0">Hostel Dashboard</h2>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div class="user-profile" style="cursor: default; pointer-events: none;">
                            <div class="avatar">${currentUser ? currentUser.username.charAt(0).toUpperCase() : 'W'}</div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="font-bold" style="font-size: 0.9rem">${currentUser ? currentUser.name : 'Warden'}</span>
                                <span class="text-muted" style="font-size: 0.75rem">Warden</span>
                            </div>
                        </div>
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="logout()">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 16px; height: 16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </header>
                <main class="main-content">
                    <div class="flex items-center justify-between mb-4" style="flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <h2 style="font-size: 1.6rem; margin-bottom: 0.2rem;">${selectedHostel}</h2>
                            <p class="text-muted" style="font-size: 0.95rem;">Room ${roomName} Roll Call</p>
                        </div>
                        <div class="flex gap-2">
                            ${!isLocked ? `<button class="btn btn-outline" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="showAddWardenStudentModal('${roomId}', '${roomName}')">Add Student</button>` : ''}
                            ${!isLocked && studentList.length > 0 ? `<button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="submitAttendance('Warden', '${roomId}', '${sessionId}')">Submit</button>` : ''}
                        </div>
                    </div>
                    ${lockMessage}
                    <div class="attendance-list-container">
                        ${studentsHtml}
                    </div>
                    <button class="btn btn-outline mt-4" onclick="renderView('warden-dashboard')">Back</button>
                </main>
            </div>
            ${getBottomNav('dashboard')}
        </div>
    `;
}

function getBottomNav(activeTab) {
    return `
        <nav class="bottom-nav">
            <div class="bottom-nav-inner">
                <a class="tab-item ${activeTab === 'sessions' ? 'active' : ''}" onclick="renderView('teacher-sessions')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                    Sessions
                </a>
                <a class="tab-item ${activeTab === 'search' ? 'active' : ''}" onclick="renderView('teacher-search')">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    Search
                </a>
            </div>
        </nav>
    `;
}
    
function isSessionActive(timeStr) {
    if (!timeStr) return true; // fallback
    
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    const parseTime = (tStr) => {
        const [time, modifier] = tStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
        if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    };

    try {
        if (timeStr.includes('-')) {
            const [startStr, endStr] = timeStr.split('-');
            const startMins = parseTime(startStr);
            const endMins = parseTime(endStr);
            return currentMins >= startMins && currentMins <= endMins;
        } else {
            const startMins = parseTime(timeStr);
            // Assuming a 2 hour window for single-time sessions
            const endMins = startMins + 120;
            return currentMins >= startMins && currentMins <= endMins;
        }
    } catch(e) {
        return true; // fail open if format is unexpected
    }
}

// Logic functions
function markAttendance(btn, status) {
    if (btn.hasAttribute('disabled')) return;
    
    const parent = btn.parentElement;
    const btnP = parent.querySelector('.btn-p');
    const btnA = parent.querySelector('.btn-a');
    
    // Reset both
    btnP.classList.remove('selected-p');
    btnA.classList.remove('selected-a');
    
    // Set selected
    if (status === 'P') {
        btn.classList.add('selected-p');
    } else if (status === 'A') {
        btn.classList.add('selected-a');
    }
}

function showModal(content, onAction) {
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content">
                ${content}
                <button class="btn btn-primary mt-4" onclick="closeModal(${onAction ? 'true' : 'false'})">Close</button>
            </div>
        </div>
    `;
    
    // Attach custom action on close if provided (simple implementation for routing)
    if (onAction) {
        window._modalCloseAction = onAction;
    }
}

function closeModal(executeAction = false) {
    overlayContainer.innerHTML = '';
    if (executeAction && window._modalCloseAction) {
        window._modalCloseAction();
        window._modalCloseAction = null;
    }
}

function showToast(message) {
    alert(message);
}

function submitAttendance(year, section, sessionId) {
    const records = {};
    document.querySelectorAll('.attendance-table-row').forEach(row => {
        let rollNo = row.dataset.roll;
        if (!rollNo) {
            // fallback for old UI if needed
            const rollNoEl = row.querySelector('.text-muted');
            if (rollNoEl) {
                rollNo = rollNoEl.innerText.replace('Roll: ', '').split('|')[0].trim();
            }
        }
        if (!rollNo) return;
        
        const isP = row.querySelector('.btn-p').classList.contains('selected-p');
        const isA = row.querySelector('.btn-a').classList.contains('selected-a');
        if (isP) records[rollNo] = 'P';
        else if (isA) records[rollNo] = 'A';
        else records[rollNo] = 'Not Marked';
    });

    const markedBy = currentUser ? currentUser.name : 'Unknown';

    if (year === 'Warden') {
        const roomId = section; // Reusing the section param for roomId
        const dateKey = getCurrentDateKey();
        const key = `${dateKey}-Warden-${roomId}-${sessionId}`;
        const existingSub = submissions[key];
        const timestamp = existingSub ? existingSub.timestamp : Date.now();
        submissions[key] = { timestamp: timestamp, records: records, markedBy: markedBy };
        saveSubmissions();
        
        showModal('<h3 class="mb-2">Attendance Submitted</h3><p class="text-muted">Successfully recorded. You have a 2-hour grace period to make edits.</p>', function() {
            renderView('warden-dashboard');
        });
    } else {
        const dateKey = getCurrentDateKey();
        const key = `${dateKey}-${year}-${section}-${sessionId}`;
        const existingSub = submissions[key];
        const timestamp = existingSub ? existingSub.timestamp : Date.now();
        submissions[key] = { timestamp: timestamp, records: records, markedBy: markedBy };
        saveSubmissions();
        
        showModal('<h3 class="mb-2">Attendance Submitted</h3><p class="text-muted">Successfully recorded. You have a 2-hour grace period to make edits.</p>', function() {
            renderView('teacher-sessions');
        });
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('erp_currentUser');
    localStorage.removeItem('erp_currentView');
    localStorage.removeItem('erp_currentViewParams');
    if (inactivityTimer) clearTimeout(inactivityTimer);
    renderView('login');
}

// Event Listeners
document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'login-form') {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim();
        const passwordInput = document.getElementById('login-password').value;
        
        const user = mockData.users.find(u => u.username === usernameInput && u.password === passwordInput);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('erp_currentUser', JSON.stringify(user));
            resetInactivityTimer();
            if (user.role === 'admin') renderView('admin-dashboard');
            else if (user.role === 'teacher') {
                if (user.domain) {
                    const parts = user.domain.split(' - ');
                    if (parts.length === 2) {
                        selectedYear = parts[0];
                        selectedSection = parts[1];
                    }
                }
                renderView('teacher-sessions');
            }
            else if (user.role === 'warden') {
                if (user.domain) {
                    selectedHostel = user.domain;
                }
                renderView('warden-dashboard');
            }
        } else {
            showToast('Invalid username or password');
        }
    }
});

// Data Management functions
function showAddStudentModal(year, section, sessionId) {
    const content = `
        <h3 class="mb-3">Add Student</h3>
        <p class="text-muted mb-4">${year} - ${section}</p>
        <div class="input-group text-left mb-3">
            <label>Roll Number</label>
            <input type="text" id="new-roll" class="input-control" placeholder="e.g. 109">
        </div>
        <div class="input-group text-left mb-4">
            <label>Student Name</label>
            <input type="text" id="new-name" class="input-control" placeholder="e.g. John Doe">
        </div>
        <div class="flex gap-2 justify-center">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveNewStudent('${year}', '${section}', '${sessionId}')">Save Student</button>
        </div>
    `;
    
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content">
                ${content}
            </div>
        </div>
    `;
}

function saveNewStudent(year, section, sessionId) {
    const rollNo = document.getElementById('new-roll').value.trim();
    const name = document.getElementById('new-name').value.trim();
    
    if (!rollNo || !name) {
        showToast("Please enter both Roll Number and Name.");
        return;
    }
    
    if (!mockData.students[year]) mockData.students[year] = {};
    if (!mockData.students[year][section]) mockData.students[year][section] = [];
    
    mockData.students[year][section].push({ rollNo, name });
    saveMockData();
    
    closeModal();
    renderView('teacher-attendance', { year, section, session: sessionId });
    showToast("Student added successfully!");
}

function showAdminAddStudentModal() {
    let yearOptions = ['Year 1', 'Year 2'].map(y => `<option value="${y}" ${adminSelectedYear === y ? 'selected' : ''}>${y}</option>`).join('');
    let secOptions = ['Sec A', 'Sec B', 'Sec C', 'Sec D'].map(s => `<option value="${s}" ${adminSelectedSection === s ? 'selected' : ''}>${s}</option>`).join('');

    const content = `
        <h3 class="mb-3">Add Student</h3>
        <p class="text-muted mb-4">Add a new student to a specific year and section.</p>
        
        <div class="flex gap-4 mb-3">
            <div class="input-group" style="flex: 1">
                <label>Year</label>
                <select id="new-admin-year" class="input-control">
                    ${yearOptions}
                </select>
            </div>
            <div class="input-group" style="flex: 1">
                <label>Section</label>
                <select id="new-admin-sec" class="input-control">
                    ${secOptions}
                </select>
            </div>
        </div>
        
        <div class="input-group text-left mb-3">
            <label>Roll Number</label>
            <input type="text" id="new-admin-roll" class="input-control" placeholder="e.g. 109">
        </div>
        <div class="input-group text-left mb-4">
            <label>Student Name</label>
            <input type="text" id="new-admin-name" class="input-control" placeholder="e.g. John Doe">
        </div>
        <div class="flex gap-2 justify-center">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveAdminNewStudent()">Save Student</button>
        </div>
    `;
    
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content" style="max-width: 450px;">
                ${content}
            </div>
        </div>
    `;
}

function saveAdminNewStudent() {
    const year = document.getElementById('new-admin-year').value;
    const section = document.getElementById('new-admin-sec').value;
    const rollNo = document.getElementById('new-admin-roll').value.trim();
    const name = document.getElementById('new-admin-name').value.trim();
    
    if (!rollNo || !name) {
        showToast("Please enter both Roll Number and Name.");
        return;
    }
    
    if (!mockData.students[year]) mockData.students[year] = {};
    if (!mockData.students[year][section]) mockData.students[year][section] = [];
    
    const existing = mockData.students[year][section].find(s => s.rollNo === rollNo);
    if (existing) {
        showToast("Roll number already exists in this class.");
        return;
    }
    
    mockData.students[year][section].push({ rollNo, name });
    saveMockData();
    
    closeModal();
    renderView('admin-dashboard', { tab: 'master-list' });
    showToast("Student added successfully to " + year + " " + section + "!");
}

function showAddWardenStudentModal(roomId, roomName) {
    const content = `
        <h3 class="mb-3">Add Student</h3>
        <p class="text-muted mb-4">${selectedHostel} - ${roomName}</p>
        <div class="input-group text-left mb-3">
            <label>Roll Number</label>
            <input type="text" id="new-roll" class="input-control" placeholder="e.g. 109">
        </div>
        <div class="input-group text-left mb-4">
            <label>Student Name</label>
            <input type="text" id="new-name" class="input-control" placeholder="e.g. John Doe">
        </div>
        <div class="flex gap-2 justify-center">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveWardenStudent('${roomId}', '${roomName}')">Save Student</button>
        </div>
    `;
    
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content">
                ${content}
            </div>
        </div>
    `;
}

function saveWardenStudent(roomId, roomName) {
    const rollNo = document.getElementById('new-roll').value.trim();
    const name = document.getElementById('new-name').value.trim();
    
    if (!rollNo || !name) {
        showToast("Please enter both Roll Number and Name.");
        return;
    }
    
    if (!mockData.wardenStudents[roomId]) mockData.wardenStudents[roomId] = [];
    
    mockData.wardenStudents[roomId].push({ rollNo, name });
    saveMockData();
    
    closeModal();
    renderView('warden-attendance', { roomId, roomName });
    showToast("Student added successfully to " + roomName + "!");
}

function showAssignTeacherModal() {
    const content = `
        <h3 class="mb-3">Assign New Teacher</h3>
        <div class="input-group text-left mb-2">
            <label>Name</label>
            <input type="text" id="new-staff-name" class="input-control" placeholder="e.g. John Smith">
        </div>
        <div class="input-group text-left mb-2">
            <label>Username</label>
            <input type="text" id="new-staff-username" class="input-control" placeholder="e.g. jsmith">
        </div>
        <div class="input-group text-left mb-2">
            <label>Password</label>
            <input type="password" id="new-staff-password" class="input-control" placeholder="Enter password">
        </div>
        <div class="input-group text-left mb-4">
            <label>Assigned Domain</label>
            <select id="new-staff-domain" class="input-control">
                <option value="Year 1 - Sec A">Year 1 - Sec A</option>
                <option value="Year 1 - Sec B">Year 1 - Sec B</option>
                <option value="Year 1 - Sec C">Year 1 - Sec C</option>
                <option value="Year 1 - Sec D">Year 1 - Sec D</option>
                <option value="Year 2 - Sec A">Year 2 - Sec A</option>
                <option value="Year 2 - Sec B">Year 2 - Sec B</option>
                <option value="Year 2 - Sec C">Year 2 - Sec C</option>
                <option value="Year 2 - Sec D">Year 2 - Sec D</option>
            </select>
        </div>
        <div class="flex gap-2 justify-center">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveNewStaff('teacher')">Assign Teacher</button>
        </div>
    `;
    
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content">
                ${content}
            </div>
        </div>
    `;
}

function showAssignWardenModal() {
    const content = `
        <h3 class="mb-3">Assign New Warden</h3>
        <div class="input-group text-left mb-2">
            <label>Name</label>
            <input type="text" id="new-staff-name" class="input-control" placeholder="e.g. Jane Doe">
        </div>
        <div class="input-group text-left mb-2">
            <label>Username</label>
            <input type="text" id="new-staff-username" class="input-control" placeholder="e.g. jdoe">
        </div>
        <div class="input-group text-left mb-2">
            <label>Password</label>
            <input type="password" id="new-staff-password" class="input-control" placeholder="Enter password">
        </div>
        <div class="input-group text-left mb-4">
            <label>Assigned Domain</label>
            <select id="new-staff-domain" class="input-control">
                <option value="Boys Hostel">Boys Hostel</option>
                <option value="Girls Hostel">Girls Hostel</option>
            </select>
        </div>
        <div class="flex gap-2 justify-center">
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveNewStaff('warden')">Assign Warden</button>
        </div>
    `;
    
    overlayContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-panel modal-content">
                ${content}
            </div>
        </div>
    `;
}

function saveNewStaff(role) {
    const name = document.getElementById('new-staff-name').value.trim();
    const username = document.getElementById('new-staff-username').value.trim();
    const password = document.getElementById('new-staff-password').value.trim();
    const domain = document.getElementById('new-staff-domain').value;
    
    if (!name || !username || !password) {
        showToast("Please fill in all fields.");
        return;
    }
    
    // Check if username already exists
    if (mockData.users.find(u => u.username === username)) {
        showToast("Username already exists!");
        return;
    }
    
    mockData.users.push({
        username,
        password,
        role,
        name,
        domain
    });
    saveMockData();
    
    closeModal();
    renderView('admin-dashboard', {tab: 'staff-allocation'});
    showToast(role.charAt(0).toUpperCase() + role.slice(1) + " assigned successfully!");
}

function downloadMasterListCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Roll No,Name,Class,Hostel Room,Date,Session,Status\r\n";
    
    const wardenMap = {};
    for (const [roomId, students] of Object.entries(mockData.wardenStudents)) {
        for (const st of students) {
            wardenMap[st.rollNo] = roomId;
        }
    }
    
    for (const [key, sub] of Object.entries(submissions)) {
        const parts = key.split('-');
        if (parts.length < 5) continue;
        
        const dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
        let isWarden = parts[3] === 'Warden';
        
        let className = 'N/A';
        let roomId = 'N/A';
        let sessionName = '';
        
        if (isWarden) {
            roomId = parts[4];
            sessionName = parts.slice(5).join('-');
        } else {
            className = `${parts[3]}-${parts[4]}`;
            sessionName = parts.slice(5).join('-');
        }
        
        for (const [rollNo, status] of Object.entries(sub.records)) {
            let studentName = 'Unknown';
            let studentClass = className;
            let studentRoom = roomId;
            
            let found = false;
            for (const y in mockData.students) {
                for (const sec in mockData.students[y]) {
                    const st = mockData.students[y][sec].find(s => s.rollNo === rollNo);
                    if (st) {
                        studentName = st.name;
                        studentClass = `${y}-${sec}`;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
            if (!found) {
                for (const r in mockData.wardenStudents) {
                    const st = mockData.wardenStudents[r].find(s => s.rollNo === rollNo);
                    if (st) {
                        studentName = st.name;
                        studentRoom = r;
                        break;
                    }
                }
            }
            
            if (studentRoom === 'N/A' && wardenMap[rollNo]) {
                studentRoom = wardenMap[rollNo];
            }
            
            csvContent += `${rollNo},${studentName},${studentClass},${studentRoom},${dateStr},${sessionName},${status}\r\n`;
        }
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_track_record_${getCurrentDateKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Init
const savedView = localStorage.getItem('erp_currentView') || 'login';
if (currentUser && savedView !== 'login') {
    resetInactivityTimer();
    renderView(savedView, currentViewParams);
} else {
    renderView('login');
}
