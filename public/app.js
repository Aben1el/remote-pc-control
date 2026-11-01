const socket = io();

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const buttons = document.querySelectorAll('.btn');

function setConnectionState(isOnline) {
    if (isOnline) {
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusText.textContent = 'Online';
        buttons.forEach(btn => btn.disabled = false);
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusText.textContent = 'Offline';
        buttons.forEach(btn => btn.disabled = true);
    }
}

socket.on('connect', () => setConnectionState(true));
socket.on('disconnect', () => setConnectionState(false));
socket.on('pc_status', (data) => {
    if (data.status === 'online') setConnectionState(true);
});

// Handle button clicks
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const actionText = btn.textContent.trim();
        const action = actionText.toLowerCase().replace(' ', '_');
        
        // Safety check for dangerous buttons
        if (action === 'shut_down' || action === 'restart') {
            if (!confirm(`Are you sure you want to ${actionText} your PC?`)) return;
        }

        // Send command to PC
        socket.emit('power_action', action);
        
        // Visual feedback on phone
        const originalText = btn.textContent;
        btn.textContent = 'Sending...';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
    });
});