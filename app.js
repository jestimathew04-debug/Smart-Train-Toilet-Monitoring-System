// Data Models
const COORD = {
  issues: ['High Odour', 'Low Water', 'Foul Surface', 'Maintenance Due']
};

const state = {
  role: 'passenger', // 'passenger' or 'worker'
  workerName: null,
  activeTrainId: null,
  activeCoachId: 'A1',
  trains: [
    {
      id: 'Rajdhani-12951',
      name: 'Rajdhani Express (12951)',
      coaches: [] // Populated below
    },
    {
      id: 'Shatabdi-12009',
      name: 'Shatabdi Express (12009)',
      coaches: []
    },
    {
      id: 'VandeBharat-22436',
      name: 'Vande Bharat Express (22436)',
      coaches: []
    },
    {
      id: 'Duronto-12270',
      name: 'Duronto Express (12270)',
      coaches: []
    },
    {
      id: 'GaribRath-12203',
      name: 'Garib Rath Express (12203)',
      coaches: []
    },
    {
      id: 'Tejas-82902',
      name: 'Tejas Express (82902)',
      coaches: []
    },
    {
      id: 'Gatimaan-12050',
      name: 'Gatimaan Express (12050)',
      coaches: []
    }
  ],
  alerts: [],
  tasks: [],
  history: [], // Completed tasks log
  stats: {
    totalCleanings: 0,
    waterSaved: 0
  },
  tickCount: 0
};

// Initialize Coach Data for all trains
function initializeData() {
  const coachTypes = ['A1', 'A2', 'B1', 'B2', 'S1', 'S2'];
  state.trains.forEach(train => {
    coachTypes.forEach(id => {
      train.coaches.push({
        id,
        hygieneScore: Math.floor(Math.random() * 40) + 60,
        odourLevel: Math.floor(Math.random() * 30),
        waterLevel: Math.floor(Math.random() * 20) + 80,
        usageCount: Math.floor(Math.random() * 50),
        status: 'Good'
      });
    });
  });
  
  state.activeTrainId = state.trains[0].id;
  
  // Generate some initial pending tasks
  state.trains[0].coaches[0].hygieneScore = 30;
  state.trains[0].coaches[0].status = 'Critical';
  checkThresholds(state.trains[0].id, state.trains[0].coaches[0]);
  
  state.trains[1].coaches[2].odourLevel = 85;
  state.trains[1].coaches[2].status = 'Critical';
  checkThresholds(state.trains[1].id, state.trains[1].coaches[2]);

  // Add 10 mock completed tasks to history
  const dummyTrains = [state.trains[0].id, state.trains[1].id, state.trains[2].id];
  const dummyCoaches = ['A1', 'B2', 'S1', 'S2', 'A2'];
  const dummyTypes = ['Foul Surface Detected', 'High Odour Alert', 'Critically Low Water'];
  for(let i = 0; i < 10; i++) {
     state.history.push({
        id: 'hist-' + i,
        time: new Date(Date.now() - (10 - i) * 15 * 60000).toISOString(),
        trainId: dummyTrains[Math.floor(Math.random() * dummyTrains.length)],
        coachId: dummyCoaches[Math.floor(Math.random() * dummyCoaches.length)],
        type: dummyTypes[Math.floor(Math.random() * dummyTypes.length)],
        workerName: 'Staff-' + (i % 3 + 1)
     });
     state.stats.totalCleanings++;
  }
}

// Global Core
function init() {
  initializeData();
  setupNavigation();
  setupRoles(); // Adjust UI based on initial role
  setupTrainSelector();
  setupChatbot();
  setupSearch();
  
  // Set default view based on role
  document.querySelector('.nav-btn[data-view="map"]').click();
  
  // Start simulation loop
  setInterval(simulationTick, 3000);

  // Welcome user
  showToast('System Online', 'Monitoring logic running in background.', 'info');
}

// ----------------------------------------------------
// Authentication & Roles Phase 3
// ----------------------------------------------------
function setupRoles() {
  const authBtns = document.querySelectorAll('.auth-worker');
  const loginBtn = document.getElementById('auth-btn');
  
  if (state.role === 'worker') {
    authBtns.forEach(btn => btn.classList.remove('hidden'));
    loginBtn.innerText = 'Log Out (' + state.workerName + ')';
    loginBtn.style.color = 'var(--status-red)';
    document.querySelector('.nav-btn[data-view="dashboard"]').click();
  } else {
    authBtns.forEach(btn => btn.classList.add('hidden'));
    loginBtn.innerText = 'Staff Login';
    loginBtn.style.color = '';
    // If attempting to stay on a worker page as a passenger, boot to Map
    const activeView = document.querySelector('.view-container.active').id;
    if (activeView === 'view-dashboard' || activeView === 'view-worker' || activeView === 'view-insights') {
        document.querySelector('.nav-btn[data-view="map"]').click();
    }
  }
}

function toggleLogin(show) {
  if (state.role === 'worker') {
    // Log out action
    state.role = 'passenger';
    state.workerName = null;
    showToast('Logged Out', 'Successfully signed out of the worker portal.', 'info', true);
    setupRoles();
    return;
  }
  
  const layer = document.getElementById('login-overlay');
  if (show) {
    layer.classList.remove('hidden');
    document.getElementById('login-name').focus();
  } else {
    layer.classList.add('hidden');
  }
}

function handleLogin() {
  const name = document.getElementById('login-name').value;
  const pass = document.getElementById('login-pass').value;
  
  if(name.length < 2 || pass.length < 3) {
      alert("Invalid credentials. Please enter a valid name and password.");
      return;
  }
  
  state.role = 'worker';
  state.workerName = name;
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('login-name').value = '';
  document.getElementById('login-pass').value = '';
  
  showToast('Access Granted', 'Welcome back, ' + name, 'success', true);
  setupRoles();
}


// ----------------------------------------------------
// Multi-Train Data Handling
// ----------------------------------------------------
function setupTrainSelector() {
  const select = document.getElementById('global-train-select');
  select.innerHTML = state.trains.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  
  select.addEventListener('change', (e) => {
    state.activeTrainId = e.target.value;
    state.activeCoachId = 'A1'; // Reset coach context
    refreshViewsIfNeeded();
  });
}

function getActiveTrain() {
  return state.trains.find(t => t.id === state.activeTrainId);
}
function getActiveCoach() {
  return getActiveTrain().coaches.find(c => c.id === state.activeCoachId);
}

// ----------------------------------------------------
// Navigation & Rendering
// ----------------------------------------------------
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const views = document.querySelectorAll('.view-container');
  
  navBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      navBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      const targetView = e.target.getAttribute('data-view');
      document.getElementById('view-title').innerText = e.target.innerText;
      
      views.forEach(v => {
        v.classList.remove('active');
        if(v.id === `view-${targetView}`) v.classList.add('active');
      });
      
      renderView(targetView);
    });
  });
}

function refreshViewsIfNeeded() {
  const activeBtn = document.querySelector('.nav-btn.active');
  if(activeBtn) renderView(activeBtn.getAttribute('data-view'));
}

function renderView(viewName) {
  if (viewName === 'dashboard') renderDashboard();
  if (viewName === 'map') renderMapView();
  if (viewName === 'worker') renderWorkerTasks();
  if (viewName === 'passenger') renderPassengerView();
  if (viewName === 'insights') renderInsights();
}

// View: Dashboard
function renderDashboard() {
  const activeTrain = getActiveTrain();
  const container = document.getElementById('view-dashboard');
  
  const totalCoaches = activeTrain.coaches.length;
  const avgHygiene = Math.round(activeTrain.coaches.reduce((sum, c) => sum + c.hygieneScore, 0) / totalCoaches);
  const avgOdour = Math.round(activeTrain.coaches.reduce((sum, c) => sum + c.odourLevel, 0) / totalCoaches);
  
  // Find top maintained coach for Gamification
  const topCoach = activeTrain.coaches.reduce((prev, current) => (prev.hygieneScore > current.hygieneScore) ? prev : current);
  
  let html = `
    <div class="stats-row mb-4">
      <div class="card glass-panel shadow-sm">
        <div class="card-title">Network Avg Hygiene</div>
        <div class="score-display">
          ${avgHygiene}% <span>overall</span>
        </div>
      </div>
      <div class="card glass-panel shadow-sm">
        <div class="card-title">Active Alerts</div>
        <div class="score-display" style="color: var(--status-red)">
          ${state.alerts.length} <span>pending</span>
        </div>
      </div>
      <div class="card glass-panel shadow-sm">
        <div class="card-title">Staff Output</div>
        <div class="score-display" style="color: var(--status-green)">
          ${state.stats.totalCleanings} <span>cleans</span>
        </div>
      </div>
      <div class="card glass-panel shadow-sm" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(255, 255, 255, 1)); border-color: rgba(234, 179, 8, 0.3);">
        <div class="card-title" style="color: #ca8a04; font-weight: 600;">🏆 Top Maintained</div>
        <div class="score-display" style="color: #ca8a04;">
          ${topCoach.id} <span style="color: #a16207;">@ ${topCoach.hygieneScore} Score</span>
        </div>
      </div>
    </div>
    
    <div class="two-col">
      <div class="dashboard-grid h-full">
  `;
  
  // Render Coach Cards
  activeTrain.coaches.forEach(coach => {
    let statColor = coach.hygieneScore > 70 ? 'var(--status-green)' : (coach.hygieneScore > 40 ? 'var(--status-yellow)' : 'var(--status-red)');
    
    html += `
      <div class="card glass-panel shadow-sm">
        <div class="card-header">
          <h3>Coach ${coach.id} <span class="badge ${coach.id === topCoach.id ? 'gold' : ''}">${coach.id === topCoach.id ? 'TOP RATED' : coach.status}</span></h3>
        </div>
        
        <div class="progress-group">
          <div class="progress-label"><span>Hygiene Score</span> <span>${coach.hygieneScore}%</span></div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${coach.hygieneScore}%; background-color: ${statColor}"></div>
          </div>
        </div>
        
        <div class="progress-group">
          <div class="progress-label"><span>Odour Level</span> <span>${coach.odourLevel}%</span></div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${coach.odourLevel}%; background-color: ${coach.odourLevel > 60 ? 'var(--status-red)' : 'var(--primary)'}"></div>
          </div>
        </div>
        
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 5px;">
          Water Level: ${coach.waterLevel}% | Usages: ${coach.usageCount}
        </div>
      </div>
    `;
  });
  
  html += `</div>
    <div class="glass-panel shadow-sm p-4" style="padding: 20px;">
      <h3 style="margin-bottom: 16px; font-family: var(--font-heading)">Recent Activity Logs</h3>
      <div class="alerts-list">
        ${state.history.slice().reverse().slice(0, 5).map(log => `
          <div style="font-size: 0.85rem; padding: 10px; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between;">
             <span><span style="color:var(--status-green)">✓</span> ${log.type} - Train ${log.trainId} Coach ${log.coachId}</span>
             <span style="color: var(--text-muted)">${new Date(log.time).toLocaleTimeString()}</span>
          </div>
        `).join('')}
        ${state.history.length === 0 ? '<div style="color:var(--text-muted); font-size:0.9rem;">No completions yet.</div>' : ''}
      </div>
    </div>
  </div>`;
  
  container.innerHTML = html;
}

// View: Live Map
function renderMapView() {
  const activeTrain = getActiveTrain();
  const container = document.getElementById('view-map');
  
  let html = `
    <div class="glass-panel shadow-sm" style="padding: 24px; position: relative;">
       <h2 style="font-family: var(--font-heading); margin-bottom: 8px;">Train Sensor Telemetry Visualizer</h2>
       <p style="color: var(--text-muted); font-size: 0.95rem;">Real-time layout of ${activeTrain.name}. Click a coach to focus data context.</p>
       
       <div class="train-map-container">
         <!-- Engine block -->
         <div class="train-engine">ENGINE</div>
  `;
  
  activeTrain.coaches.forEach(coach => {
    let cssState = 'good';
    if(coach.hygieneScore <= 40) cssState = 'critical';
    else if(coach.hygieneScore <= 70) cssState = 'warning';
    
    html += `
       <div class="map-coach ${cssState}" onclick="state.activeCoachId='${coach.id}'; refreshViewsIfNeeded();">
         <div class="map-coach-link"></div>
         <div class="map-coach-title">${coach.id}</div>
         <div style="font-size: 0.85rem; display:flex; justify-content: space-between;">
           <span style="color:var(--text-muted)">Hyg:</span> <span style="font-weight:600">${coach.hygieneScore}%</span>
         </div>
         <div style="font-size: 0.85rem; display:flex; justify-content: space-between;">
           <span style="color:var(--text-muted)">Wat:</span> <span style="font-weight:600">${coach.waterLevel}%</span>
         </div>
         <div style="font-size: 0.85rem; display:flex; justify-content: space-between;">
           <span style="color:var(--text-muted)">Odr:</span> <span style="font-weight:600">${coach.odourLevel}%</span>
         </div>
       </div>
    `;
  });
  
  html += `
       </div>
    </div>
    
    ${state.activeCoachId ? `
      <div class="glass-panel shadow-sm" style="padding: 24px; margin-top: 20px;">
        <h3 style="font-family: var(--font-heading); margin-bottom: 12px; display:flex; align-items:center; gap:8px;">
           Selected: Coach ${state.activeCoachId} 
           <span class="badge ${getActiveCoach().hygieneScore > 40 ? 'good' : 'critical'}">Live Data</span>
        </h3>
        <div style="display:flex; gap: 40px; align-items:center;">
           <div class="lcd-score" style="font-size: 3rem; color: var(--primary); margin:0;">${getActiveCoach().hygieneScore}% <span style="font-size:1rem;color:var(--text-muted)">Score</span></div>
           <button class="glass-btn primary-btn" onclick="document.querySelector('.nav-btn[data-view=\\'passenger\\']').click()">Open Passenger Kiosk Mode for ${state.activeCoachId}</button>
        </div>
      </div>
    ` : ''}
  `;
  container.innerHTML = html;
}

// View: Worker Tasks
function renderWorkerTasks() {
  const container = document.getElementById('view-worker');
  const activeAlerts = state.alerts;
  const isWorker = state.role === 'worker';
  
  let html = `<div class="glass-panel shadow-sm" style="padding: 20px; margin-bottom: 20px;">
    <h3 style="font-family: var(--font-heading); margin-bottom: 16px;">Active Action Items (${activeAlerts.length})</h3>
    <div class="alerts-list">
  `;
  
  if (activeAlerts.length === 0) {
    html += `<div style="padding: 20px; text-align: center; color: var(--status-green); background: rgba(5,150,105,0.05); border-radius: 8px;">All coaches are clean! No pending tasks.</div>`;
  } else {
    activeAlerts.sort((a,b) => b.priorityLevel - a.priorityLevel).forEach(alert => {
      let badge = alert.priority === 'High' ? 'critical' : (alert.priority === 'Medium' ? 'warning' : 'good');
      
      html += `
        <div class="alert-item ${badge}">
          <div class="alert-details">
            <div class="alert-title">${alert.type} 
              <span class="badge ${badge}" style="margin-left: 8px">${alert.priority} Priority</span>
            </div>
            <div class="alert-meta">${alert.trainId} | Coach ${alert.coachId} | Auto-generated ${new Date(alert.timestamp).toLocaleTimeString()}</div>
            ${alert.priority === 'High' ? '<div style="color:var(--status-red); font-size:0.8rem; font-weight:600; margin-top:4px;">Escalated due to extended decay time!</div>' : ''}
          </div>
          <div>
            ${alert.assignedTo 
              ? `<span style="font-size: 0.85rem; color: var(--primary); margin-right: 12px;">Assigned to ${alert.assignedTo}</span>
                 <button class="glass-btn primary-btn" onclick="completeTask('${alert.id}')">Complete Task</button>` 
              : `<button class="glass-btn" onclick="assignTask('${alert.id}')">Accept Task</button>`}
          </div>
        </div>
      `;
    });
  }
  
  html += `</div></div>
  
  <div class="glass-panel shadow-sm" style="padding: 20px;">
    <h3 style="font-family: var(--font-heading); margin-bottom: 16px;">Shift Cleaning Log</h3>
    <div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">
      <table class="history-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Train</th>
            <th>Coach</th>
            <th>Issue Resolved</th>
            <th>Worker</th>
          </tr>
        </thead>
        <tbody>
          ${state.history.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No history available</td></tr>' : ''}
          ${state.history.slice().reverse().map(log => `
            <tr>
              <td>${new Date(log.time).toLocaleTimeString()}</td>
              <td>${log.trainId}</td>
              <td>${log.coachId}</td>
              <td style="color:var(--status-green); font-weight:500;">${log.type}</td>
              <td>${log.workerName}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
  
  container.innerHTML = html;
}

// View: Passenger Interface
function renderPassengerView() {
  const coach = getActiveCoach();
  const train = getActiveTrain();
  const container = document.getElementById('view-passenger');
  
  let html = `
    <div class="train-banner">
      <h2>Passenger Experience View</h2>
    </div>
    
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <select class="glass-select" style="max-width: 200px;" onchange="state.activeCoachId = this.value; refreshViewsIfNeeded();">
        ${train.coaches.map(c => `<option value="${c.id}" ${c.id === coach.id ? 'selected' : ''}>${train.id} - Coach ${c.id}</option>`).join('')}
      </select>
    </div>

    <!-- LCD Display Simulation Removed per req -->

    <div style="text-align: center; margin-top: 40px;">
      <h3 style="color: var(--text-muted); font-size: 1.2rem;">Live Feedback Terminal</h3>
      <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 4px;">Tap honestly to instantly report conditions.</p>
      
      <div class="feedback-container">
        <button class="feedback-btn clean" onclick="submitFeedback('clean')">
          <div style="font-size: 1.5rem; color: var(--status-green)">✓</div>
          Looks Good!
        </button>
        <button class="feedback-btn moderate" onclick="submitFeedback('moderate')">
          <div style="font-size: 1.5rem; color: var(--status-yellow)">—</div>
          Needs Attention
        </button>
        <button class="feedback-btn dirty" onclick="submitFeedback('dirty')">
          <div style="font-size: 1.5rem; color: var(--status-red)">⚠</div>
          Terrible
        </button>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// View: Insights
function renderInsights() {
  const container = document.getElementById('view-insights');
  let html = `
    <div class="glass-panel shadow-sm" style="padding: 24px;">
      <h3 style="font-family: var(--font-heading); margin-bottom: 20px;">Virtual Utilities Engine</h3>
      
      <div class="stats-row" style="margin-bottom: 30px;">
        <div class="card glass-panel" style="background: rgba(37,99,235,0.02)">
          <div class="card-title">Predictive Maintenance</div>
          <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 10px;">Based on simulated decay rates, the engine automatically schedules pre-emptive cleaning alerts before coaches hit critical thresholds.</p>
        </div>
        <div class="card glass-panel" style="background: rgba(37,99,235,0.02)">
          <div class="card-title">Water Conservation Array</div>
          <div class="score-display" style="color: var(--primary)">${state.stats.waterSaved}L <span style="font-size: 0.9rem">saved</span></div>
        </div>
        <div class="card glass-panel" style="background: rgba(37,99,235,0.02)">
          <div class="card-title">AI Worker Efficiency</div>
          <div class="score-display" style="color: var(--status-green)">12m <span style="font-size: 0.9rem">avg response</span></div>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ----------------------------------------------------
// UI Interactions & Tasks
// ----------------------------------------------------
function assignTask(alertId) {
  const alert = state.alerts.find(a => a.id === alertId);
  if(alert) {
    alert.assignedTo = state.workerName || 'A Worker';
    refreshViewsIfNeeded();
  }
}

function completeTask(alertId) {
  const alertIndex = state.alerts.findIndex(a => a.id === alertId);
  if(alertIndex > -1) {
    const alert = state.alerts[alertIndex];
    
    const train = state.trains.find(t => t.id === alert.trainId);
    if(train) {
      const targetCoach = train.coaches.find(c => c.id === alert.coachId);
      if(targetCoach) {
        targetCoach.hygieneScore = 100;
        targetCoach.odourLevel = 0;
        targetCoach.waterLevel = 100;
        targetCoach.status = 'Good';
        state.stats.totalCleanings++;
        
        // Log to history
        state.history.push({
          id: Date.now(),
          time: new Date().toISOString(),
          trainId: alert.trainId,
          coachId: alert.coachId,
          type: alert.type,
          workerName: state.workerName || 'System Override'
        });
      }
    }
    
    state.alerts.splice(alertIndex, 1);
    refreshViewsIfNeeded();
  }
}

function submitFeedback(rating) {
  const coach = getActiveCoach();
  const train = getActiveTrain();
  
  if (rating === 'clean') {
    coach.hygieneScore = Math.min(100, coach.hygieneScore + 10);
    coach.odourLevel = Math.max(0, coach.odourLevel - 5);
    showToast('Feedback Logged', 'Thanks! Real-time score increased.', 'success', true);
  } else if (rating === 'moderate') {
    coach.hygieneScore = Math.max(0, coach.hygieneScore - 15);
    coach.odourLevel = Math.min(100, coach.odourLevel + 10);
    showToast('Feedback Logged', 'Thanks! We will monitor this coach.', 'info', true);
  } else if (rating === 'dirty') {
    coach.hygieneScore = Math.max(0, coach.hygieneScore - 30);
    coach.odourLevel = Math.min(100, coach.odourLevel + 20);
    showToast('Critical Feedback!', 'Auto-alert triggered for immediate cleaning.', 'critical', true);
    checkThresholds(train.id, coach);
  }
  
  refreshViewsIfNeeded();
}

function showToast(title, message, type = 'info', forceShow = false) {
  // Passengers only see success feedback or forced messages (like login/logout)
  if (!forceShow && state.role !== 'worker' && type !== 'success') {
      return; 
  }
    
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<h4>${title}</h4><p>${message}</p>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOutRight 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------------------------------------------
// Chatbot Logic
// ----------------------------------------------------
function setupChatbot() {
  const toggle = document.getElementById('chatbot-toggle');
  const panel = document.getElementById('chatbot-panel');
  const btnClose = document.getElementById('chatbot-close');
  const btnSend = document.getElementById('chat-send');
  const input = document.getElementById('chat-input');
  const body = document.getElementById('chat-body');

  toggle.addEventListener('click', () => panel.classList.remove('hidden'));
  btnClose.addEventListener('click', () => panel.classList.add('hidden'));

  const appendMsg = (text, isUser) => {
    const d = document.createElement('div');
    d.className = `msg ${isUser ? 'user' : 'bot'}`;
    d.innerText = text;
    body.appendChild(d);
    body.scrollTop = body.scrollHeight;
  };

  window.sendQuickReply = (text) => {
    input.value = text;
    btnSend.click();
  };

  const processAI = (query) => {
    console.log("User Input:", query);
    try {
      let text = query.toLowerCase().replace(/[?!.]/g, '');

      let response = "";
      if (text.includes("worker")) {
        response = "Worker Task List:\n1. Clean Coach B2 (High Priority)\n2. Refill water in A1\n3. Resolve odour issue in B2\n\nRecommended Actions:\n- Use disinfectant spray\n- Check ventilation system";
      }
      else if (text.includes("clean")) {
        response = "Coach B2 requires cleaning (High Priority)";
      } 
      else if (text.includes("water")) {
        response = "Water level is LOW in Coach A1 ⚠️";
      } 
      else if (text.includes("odour") || text.includes("smell")) {
        response = "🚨 High odour detected in Coach B2. Immediate cleaning required.";
      } 
      else if (text.includes("alert")) {
        response = "⚠️ Cleaning required in B2, Water low in A1, High odour in B2";
      } 
      else if (text.includes("status")) {
        response = "System operational with minor issues";
      } 
      else if (text.includes("future") || text.includes("predict")) {
        response = "Odour may increase in next 2 hours in B2";
      } 
      else {
        response = "Try: cleaning, water, odour, alerts";
      }

      return appendMsg(response, false);

    } catch (error) {
      console.error("Error:", error);
      return appendMsg("System error.", false);
    }
  };

  btnSend.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) {
      appendMsg(val, true);
      input.value = '';
      setTimeout(() => processAI(val), 600);
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnSend.click();
  });
}

// ----------------------------------------------------
// Simulation Logic
// ----------------------------------------------------
function checkThresholds(trainId, coach) {
  // Check if alert already exists for this coach/issue
  const addAlert = (type, priority, pLevel) => {
    if(!state.alerts.find(a => a.coachId === coach.id && a.trainId === trainId && a.type === type)) {
      state.alerts.push({
        id: Date.now() + Math.random().toString(),
        trainId: trainId,
        coachId: coach.id,
        type: type,
        priority: priority,
        priorityLevel: pLevel, // 3 High, 2 Medium, 1 Low,
        timestamp: Date.now(),
        tickCreated: state.tickCount,
        assignedTo: null
      });
      // Do not force UI toasts for this rule check since it runs continuously
      if(coach.status !== 'Critical') {
         coach.status = 'Critical';
      }
      showToast('A.I. Dispatch Action Generated', `${type} in ${trainId} - Coach ${coach.id}`, 'warning');
    }
  };

  if (coach.hygieneScore < 40) addAlert('Foul Surface Detected', 'High', 3);
  if (coach.odourLevel > 70) addAlert('High Odour Alert', 'Medium', 2);
  if (coach.waterLevel < 20) addAlert('Critically Low Water', 'High', 3);
}

// Global Simulation Engine
function simulationTick() {
  state.tickCount++;
  let needsRender = false;

  state.trains.forEach(train => {
    train.coaches.forEach(coach => {
      // Simulate passenger usage randomness
      if (Math.random() > 0.8) {
        coach.usageCount++;
        coach.hygieneScore = Math.max(0, coach.hygieneScore - Math.floor(Math.random() * 3));
        coach.odourLevel = Math.min(100, coach.odourLevel + Math.floor(Math.random() * 4));
        coach.waterLevel = Math.max(0, coach.waterLevel - Math.floor(Math.random() * 2));
        needsRender = true;
      }
      checkThresholds(train.id, coach);
    });
  });

  // Escalate unassigned alerts
  state.alerts.forEach(alert => {
    if(!alert.assignedTo) {
      if(state.tickCount - alert.tickCreated > 4 && alert.priority === 'Medium') {
        alert.priority = 'High';
        alert.priorityLevel = 3;
        showToast('Auto-Escalation Protocol', `${alert.trainId} Coach ${alert.coachId} ${alert.type} has been escalated to HIGH PRIORITY due to slow dispatch response.`, 'critical');
        needsRender = true;
      }
    }
  });

  if(needsRender) refreshViewsIfNeeded();
}

// Boot application
init();
