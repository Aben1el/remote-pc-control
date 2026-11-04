// FILE PATH: server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const workspaceFile = path.join(__dirname, 'workspaces.json');

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json()); // Allow receiving JSON data

// Helper: Load workspaces from file, or create default if it doesn't exist
function getWorkspaces() {
    if (!fs.existsSync(workspaceFile)) {
        const defaults = {
            "WORK": ["spotify", "https://github.com", "https://mail.google.com"],
            "STUDY": ["notepad", "https://google.com"],
            "GAMING": ["steam", "discord"],
            "PERSONAL": ["spotify", "https://youtube.com"]
        };
        fs.writeFileSync(workspaceFile, JSON.stringify(defaults, null, 2));
        return defaults;
    }
    return JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
}

// Helper: Safely run Windows commands
function runCommand(command) {
    exec(command, (error) => {
        if (error) console.error(`Command error: ${error.message}`);
    });
}

io.on('connection', (socket) => {
    console.log('Mobile device connected.');
    socket.emit('pc_status', { status: 'online' });

    // 1. Power Actions
    socket.on('power_action', (action) => {
        console.log(`Received action: ${action}`);
        switch(action) {
                        case 'sleep': 
                runCommand('rundll32.exe powrprof.dll,SetSuspendState 0,1,0'); 
                break;
            case 'shutdown': runCommand('shutdown /s /t 0'); break;
            case 'restart': runCommand('shutdown /r /t 0'); break;
            case 'lock': runCommand('rundll32.exe user32.dll,LockWorkStation'); break;
        }
    });

    // 2. Workspace Launching
    socket.on('launch_workspace', (workspaceName) => {
        console.log(`Launching workspace: ${workspaceName}`);
        const workspaces = getWorkspaces();
        const items = workspaces[workspaceName];

        if (items && Array.isArray(items)) {
            items.forEach((item, index) => {
                // Add a small delay between each launch to prevent PC lag
                setTimeout(() => {
                    // The Windows 'start' command handles both URLs and app names perfectly
                    runCommand(`start "" "${item}"`);
                }, 800 * index); // 800ms delay between each item
            });
            socket.emit('command_status', { success: true, message: `Launched ${workspaceName}` });
        } else {
            socket.emit('command_status', { success: false, message: 'Workspace not found' });
        }
    });

    // 3. Get current workspaces (for the phone to display)
    socket.on('get_workspaces', () => {
        socket.emit('workspaces_list', getWorkspaces());
    });

    // 4. Save updated workspaces from the phone
    socket.on('save_workspaces', (newWorkspaces) => {
        try {
            fs.writeFileSync(workspaceFile, JSON.stringify(newWorkspaces, null, 2));
            socket.emit('command_status', { success: true, message: 'Workspaces saved!' });
        } catch (error) {
            socket.emit('command_status', { success: false, message: 'Failed to save' });
        }
    });

    socket.on('disconnect', () => console.log('Disconnected.'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Companion server running on port ${PORT}`);
});