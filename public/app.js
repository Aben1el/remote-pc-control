const socket = io();

const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const workspaceContainer = document.getElementById('workspace-buttons');
const editBtn = document.getElementById('edit-btn');
const modal = document.getElementById('editor-modal');
const editorContainer = document.getElementById('workspace-editor-container');

let currentWorkspaces = {};

function setConnectionState(isOnline) {
    if (isOnline) {
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusText.textContent = 'Online';
        document.querySelectorAll('.btn:not(.btn-wake)').forEach(btn => btn.disabled = false);
        editBtn.disabled = false;
        socket.emit('get_workspaces');
    } else {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusText.textContent = 'Offline';
        document.querySelectorAll('.btn').forEach(btn => btn.disabled = true);
        editBtn.disabled = true;
        workspaceContainer.innerHTML = '';
    }
}

socket.on('connect', () => setConnectionState(true));
socket.on('disconnect', () => setConnectionState(false));
socket.on('pc_status', (data) => { if (data.status === 'online') setConnectionState(true); });

socket.on('workspaces_list', (workspaces) => {
    currentWorkspaces = workspaces;
    workspaceContainer.innerHTML = '';
    
    Object.keys(workspaces).forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-workspace';
        btn.textContent = name;
        btn.onclick = () => {
            btn.textContent = 'Launching...';
            btn.disabled = true;
            socket.emit('launch_workspace', name);
            setTimeout(() => { 
                btn.textContent = name; 
                btn.disabled = false; 
            }, 2000);
        };
        workspaceContainer.appendChild(btn);
    });
});

socket.on('command_status', (data) => {
    if (data.success) {
        if (data.message.includes('saved')) {
            modal.classList.add('hidden');
            socket.emit('get_workspaces');
        }
    } else {
        alert('Error: ' + data.message);
    }
});

// --- Visual Editor Logic ---

function renderEditor() {
    editorContainer.innerHTML = '';
    
    Object.keys(currentWorkspaces).forEach(workspaceName => {
        const workspaceDiv = document.createElement('div');
        workspaceDiv.className = 'workspace-editor';
        
        // Header with name input and delete button
        const headerDiv = document.createElement('div');
        headerDiv.className = 'workspace-header';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'workspace-name-input';
        nameInput.value = workspaceName;
        nameInput.placeholder = 'Workspace Name';
        nameInput.dataset.originalName = workspaceName;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-workspace';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            if (confirm(`Delete ${workspaceName}?`)) {
                delete currentWorkspaces[workspaceName];
                renderEditor();
            }
        };
        
        headerDiv.appendChild(nameInput);
        headerDiv.appendChild(deleteBtn);
        workspaceDiv.appendChild(headerDiv);
        
        // Items list
        const itemList = document.createElement('div');
        itemList.className = 'item-list';
        
        currentWorkspaces[workspaceName].forEach((item, index) => {
            const itemRow = createItemRow(item, index);
            itemList.appendChild(itemRow);
        });
        
        workspaceDiv.appendChild(itemList);
        
        // Add item button
        const addItemBtn = document.createElement('button');
        addItemBtn.className = 'btn-add-item';
        addItemBtn.textContent = '+ Add App or Website';
        addItemBtn.onclick = () => {
            currentWorkspaces[workspaceName].push('');
            renderEditor();
        };
        workspaceDiv.appendChild(addItemBtn);
        
        editorContainer.appendChild(workspaceDiv);
    });
}

function createItemRow(value, index) {
    const row = document.createElement('div');
    row.className = 'item-input-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item-input';
    input.value = value;
    input.placeholder = 'App name (e.g., chrome) or URL (e.g., https://...)';
    input.onchange = (e) => {
        const workspaceName = row.closest('.workspace-editor').querySelector('.workspace-name-input').value;
        currentWorkspaces[workspaceName][index] = e.target.value;
    };
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-item';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
        const workspaceName = row.closest('.workspace-editor').querySelector('.workspace-name-input').value;
        currentWorkspaces[workspaceName].splice(index, 1);
        renderEditor();
    };
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    return row;
}

editBtn.onclick = () => {
    renderEditor();
    modal.classList.remove('hidden');
};

document.getElementById('close-modal').onclick = () => {
    modal.classList.add('hidden');
};

document.getElementById('cancel-edit').onclick = () => {
    modal.classList.add('hidden');
    socket.emit('get_workspaces'); // Reload original data
};

document.getElementById('add-workspace-btn').onclick = () => {
    const newName = `Workspace ${Object.keys(currentWorkspaces).length + 1}`;
    currentWorkspaces[newName] = [''];
    renderEditor();
};

document.getElementById('save-workspaces').onclick = () => {
    // Update workspace names based on inputs
    const updatedWorkspaces = {};
    document.querySelectorAll('.workspace-editor').forEach(editor => {
        const nameInput = editor.querySelector('.workspace-name-input');
        const oldName = nameInput.dataset.originalName;
        const newName = nameInput.value.trim();
        
        if (newName && oldName) {
            updatedWorkspaces[newName] = currentWorkspaces[oldName] || [];
        }
    });
    
    currentWorkspaces = updatedWorkspaces;
    socket.emit('save_workspaces', currentWorkspaces);
};

// --- Power Button Logic ---
document.querySelectorAll('.btn-sleep, .btn-shutdown, .btn-restart, .btn-lock').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.textContent.trim().toLowerCase().replace(' ', '_');
        if (action === 'shut_down' || action === 'restart') {
            if (!confirm(`Are you sure you want to ${btn.textContent.trim()} your PC?`)) return;
        }
        socket.emit('power_action', action);
        btn.textContent = 'Executing...';
        setTimeout(() => { 
            btn.textContent = btn.className.replace('btn ', '').replace('-', ' ').toUpperCase(); 
        }, 2000);
    });
});