const API_BASE = 'http://localhost:8080/api';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const callForm = document.getElementById('callForm');
const businessSelect = document.getElementById('businessSelect');
const historyBusinessSelect = document.getElementById('historyBusinessSelect');
const loadHistoryBtn = document.getElementById('loadHistoryBtn');
const activeCallCard = document.getElementById('activeCallCard');

// Status message elements
const registerStatus = document.getElementById('registerStatus');
const callStatus = document.getElementById('callStatus');

// Active call elements
const activeCustomerName = document.getElementById('activeCustomerName');
const activeBusinessName = document.getElementById('activeBusinessName');
const activeCallStatus = document.getElementById('activeCallStatus');
const activeDuration = document.getElementById('activeDuration');
const progressFill = document.getElementById('progressFill');

// State
let currentCallId = null;
let statusCheckInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadBusinesses();
    
    registerForm.addEventListener('submit', handleRegisterBusiness);
    callForm.addEventListener('submit', handleInitiateCall);
    loadHistoryBtn.addEventListener('click', handleLoadHistory);
});

// Register Business
async function handleRegisterBusiness(e) {
    e.preventDefault();
    
    const name = document.getElementById('businessName').value;
    const whatsappNumber = document.getElementById('whatsappNumber').value;
    
    try {
        const response = await fetch(`${API_BASE}/business/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                whatsapp_number: whatsappNumber
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(registerStatus, 'success', `✓ ${data.message}`);
            registerForm.reset();
            loadBusinesses();
        } else {
            showStatus(registerStatus, 'error', `✗ ${data.message}`);
        }
    } catch (error) {
        showStatus(registerStatus, 'error', `✗ Error: ${error.message}`);
    }
}

// Load Businesses
async function loadBusinesses() {
    try {
        const response = await fetch(`${API_BASE}/business/list`);
        const data = await response.json();
        
        if (data.success && data.data) {
            updateBusinessSelects(data.data);
        }
    } catch (error) {
        console.error('Error loading businesses:', error);
    }
}

// Update Business Select Dropdowns
function updateBusinessSelects(businesses) {
    const options = businesses.map(b => 
        `<option value="${b.id}">${b.name} (${b.whatsapp_number})</option>`
    ).join('');
    
    businessSelect.innerHTML = '<option value="">-- Select a business --</option>' + options;
    historyBusinessSelect.innerHTML = '<option value="">-- Select a business --</option>' + options;
}

// Initiate Call
async function handleInitiateCall(e) {
    e.preventDefault();
    
    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const businessId = businessSelect.value;
    
    if (!businessId) {
        showStatus(callStatus, 'error', '✗ Please select a business');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/call/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_name: customerName,
                customer_phone: customerPhone,
                business_id: businessId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatus(callStatus, 'success', `✓ ${data.message}`);
            callForm.reset();
            
            // Show active call card and start monitoring
            currentCallId = data.data.id;
            showActiveCall(data.data);
            startCallStatusMonitoring(currentCallId);
        } else {
            showStatus(callStatus, 'error', `✗ ${data.message}`);
        }
    } catch (error) {
        showStatus(callStatus, 'error', `✗ Error: ${error.message}`);
    }
}

// Show Active Call
function showActiveCall(call) {
    activeCallCard.style.display = 'block';
    activeCustomerName.textContent = call.customer_name;
    activeBusinessName.textContent = call.business_name;
    updateCallStatus(call);
    
    // Scroll to active call card
    activeCallCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Update Call Status
function updateCallStatus(call) {
    activeCallStatus.textContent = call.status;
    activeCallStatus.className = `status-badge ${call.status}`;
    
    if (call.duration > 0) {
        activeDuration.textContent = formatDuration(call.duration);
    } else {
        activeDuration.textContent = '-';
    }
    
    // Update progress bar
    const progress = getProgressByStatus(call.status);
    progressFill.style.width = `${progress}%`;
}

// Get Progress by Status
function getProgressByStatus(status) {
    const progressMap = {
        'pending': 25,
        'ringing': 50,
        'connected': 75,
        'ended': 100,
        'failed': 100
    };
    return progressMap[status] || 0;
}

// Format Duration
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Start Call Status Monitoring
function startCallStatusMonitoring(callId) {
    // Clear any existing interval
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
    
    // Check status every 2 seconds
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/call/status?id=${callId}`);
            const data = await response.json();
            
            if (data.success && data.data) {
                updateCallStatus(data.data);
                
                // Stop monitoring if call has ended
                if (data.data.status === 'ended' || data.data.status === 'failed') {
                    clearInterval(statusCheckInterval);
                    statusCheckInterval = null;
                    
                    // Hide active call card after 5 seconds
                    setTimeout(() => {
                        activeCallCard.style.display = 'none';
                        currentCallId = null;
                    }, 5000);
                }
            }
        } catch (error) {
            console.error('Error checking call status:', error);
        }
    }, 2000);
}

// Load Call History
async function handleLoadHistory() {
    const businessId = historyBusinessSelect.value;
    
    if (!businessId) {
        alert('Please select a business');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/call/history?business_id=${businessId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            displayCallHistory(data.data);
        }
    } catch (error) {
        console.error('Error loading call history:', error);
    }
}

// Display Call History
function displayCallHistory(calls) {
    const historyContainer = document.getElementById('historyContainer');
    
    if (calls.length === 0) {
        historyContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No call history found</p>';
        return;
    }
    
    // Sort by most recent first
    calls.sort((a, b) => new Date(b.initiated_at) - new Date(a.initiated_at));
    
    const historyHTML = calls.map(call => `
        <div class="history-item">
            <div class="history-item-header">
                <span class="history-item-title">${call.customer_name}</span>
                <span class="status-badge ${call.status}">${call.status}</span>
            </div>
            <div class="history-item-details">
                <div>📞 ${call.customer_phone}</div>
                <div>🕒 ${formatDateTime(call.initiated_at)}</div>
                ${call.duration > 0 ? `<div>⏱️ Duration: ${formatDuration(call.duration)}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    historyContainer.innerHTML = historyHTML;
}

// Format Date Time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show Status Message
function showStatus(element, type, message) {
    element.textContent = message;
    element.className = `status-message ${type} show`;
    
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}
