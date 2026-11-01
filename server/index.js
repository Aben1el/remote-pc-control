const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec } = require('child_process'); // Allows running Windows commands

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));

// Helper function to safely run Windows commands
function runCommand(command) {
    exec(command, (error) => {
        if (error) console.error(`Command error: ${error.message}`);
        else console.log(`Executed: ${command}`);
    });
}

io.on('connection', (socket) => {
    console.log('Mobile device connected.');
    socket.emit('pc_status', { status: 'online' });

    // Listen for power commands from your phone
    socket.on('power_action', (action) => {
        console.log(`Received action: ${action}`);
        switch(action) {
            case 'sleep':
                runCommand('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
                break;
            case 'shutdown':
                runCommand('shutdown /s /t 0');
                break;
            case 'restart':
                runCommand('shutdown /r /t 0');
                break;
            case 'lock':
                runCommand('rundll32.exe user32.dll,LockWorkStation');
                break;
            default:
                console.log('Unknown action');
        }
    });

    socket.on('disconnect', () => console.log('Disconnected.'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Companion server running on port ${PORT}`);
});