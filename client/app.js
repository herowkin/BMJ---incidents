const apiBase = '/api';

//Elements
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const userArea = document.getElementById('user-area');
const loginArea = document.getElementById('login-area');
const userNameEl = document.getElementById('user-name');
const userRoleEl = document.getElementById('user-role');
const createSection = document.getElementById('create-ticket');
const titleEl = document.getElementById('title');
const descriptionEl = document.getElementById('description');
const categoryEl = document.getElementById('category');
const priorityEl = document.getElementById('priority');
const btnCreate = document.getElementById('btn-create');
const ticketsSection = document.getElementById('tickets');
const ticketsList = document.getElementById('tickets-list');
const btnRefresh = document.getElementById('btn-refresh');
const msgEl = document.getElementById('message');

function showMessage(text, type = 'info', timeout = 4000) {
    msgEl.textContent = text;
    msgEl.className = `message ${type}`;
    if (timeout) setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'message'; }, timeout);
}

function setToken(token) { localStorage.setItem('bmj_token', token); }
function getToken() { return localStorage.getItem('bmj_token'); }
function setUser(user) { localStorage.setItem('bmj_user', JSON.stringify(user)); }
function getUser() { const t = localStorage.getItem('bmj_user'); return t ? JSON.parse(t) : null; }
function clearAuth() { localStorage.removeItem('bmj_token'); localStorage.removeItem('bmj_user'); }

function authHeaders() {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

//Controls visabilty based on of user is logged in, logged in as admin, or logged out
function updateUIForAuth() {
    const user = getUser();
    if (user && getToken()) {
        userNameEl.textContent = user.name || user.email || 'User';
        if (user.role) {
            userRoleEl.textContent = user.role === 'admin' ? 'admin' : user.role;
            userRoleEl.classList.toggle('is-admin', user.role === 'admin');
        } 
        else {
            userRoleEl.textContent = '';
            userRoleEl.classList.remove('is-admin');
        }

        userArea.classList.remove('hidden');
        loginArea.classList.add('hidden');
        createSection.classList.remove('hidden');
        ticketsSection.classList.remove('hidden');
        fetchTickets();
    } 
    else {
        userArea.classList.add('hidden');
        loginArea.classList.remove('hidden');
        createSection.classList.add('hidden');
        ticketsSection.classList.add('hidden');
        ticketsList.innerHTML = '';
    }
}

//Login button
async function login() {
    const email = emailEl.value.trim();
    const password = passwordEl.value;
    if (!email || !password) 
        return showMessage('Email and password required', 'error');

    try {
        const res = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) 
            return showMessage(data.message || 'Login failed', 'error');

        setToken(data.token);
        setUser(data.user);
        showMessage('Logged in', 'success');
        updateUIForAuth();
    } 
    catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Register button There isint normally a field for name so I use a popup
//Currently no way to register as admin
async function register() {
    const name = prompt('Name for new account:');
    const email = emailEl.value.trim();
    const password = passwordEl.value;

    if (!name || !email || !password) 
        return showMessage('Name, email, password required', 'error');

    try {
        const res = await fetch(`${apiBase}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) 
            return showMessage(data.message || 'Register failed', 'error');

        setToken(data.token);
        setUser(data.user);
        showMessage('Registered and logged in', 'success');
        updateUIForAuth();
    } 
    catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Create a ticket when button is pressed
async function createTicket() {
    const title = titleEl.value.trim();
    const description = descriptionEl.value.trim();
    const category = categoryEl ? categoryEl.value.trim() : undefined;
    const priority = priorityEl ? priorityEl.value : undefined;
    
    if (!title || !description) 
        return showMessage('Title and description required', 'error');

    try {
        const res = await fetch(`${apiBase}/incidents`, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
            body: JSON.stringify({ title, description, category, priority }),
        });
        const data = await res.json();

        if (!res.ok) 
            return showMessage(data.message || 'Create failed', 'error');

        showMessage('Ticket created', 'success');

        //prepend to list
        prependTicket(data);
        titleEl.value = '';
        descriptionEl.value = '';
        if (categoryEl) categoryEl.value = 'General';
        if (priorityEl) priorityEl.value = 'Medium';
    } 
    catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Display for a single ticket
function renderTicket(item) {
    const d = document.createElement('div');
    d.className = 'ticket';
    const category = item.category || 'General';
    const priority = item.priority || 'Medium';
    const status = item.status || 'Open';

    const currentUser = getUser();
    const userId = currentUser && (currentUser.id || currentUser._id);
    const isAdmin = currentUser && currentUser.role === 'admin';

    const assignedName = item.assignedTo?.name || item.assignedTo?.email || (item.assignedTo ? String(item.assignedTo) : null);
    const assignedId = item.assignedTo && (item.assignedTo._id || item.assignedTo);

    const createdId = item.createdBy && (item.createdBy._id || item.createdBy);
    const canDelete = userId && (isAdmin || String(createdId) === String(userId));

    //use innerHTML to build ticket
    d.innerHTML = `<h3>${item.title} <span class="status">${status}</span></h3>
    <div class="meta">By ${item.createdBy?.name || item.createdBy?.email || 'Unknown'} - ${new Date(item.createdAt).toLocaleString()}</div>
    <div class="meta">Category: ${category} &nbsp;|&nbsp; Priority: ${priority}</div>
    <div class="meta">Assigned to: ${assignedName ? assignedName : '<em>Unassigned</em>'}</div>
    <p class="desc">${item.description}</p>`;

    // controls container (admin actions + delete)
    const controls = document.createElement('div');
    controls.className = 'admin-controls';

    if (isAdmin) {
        //Assign button only if unassigned
        if (!item.assignedTo) {
            const assignBtn = document.createElement('button');
            assignBtn.textContent = 'Assign to me';
            assignBtn.className = 'btn-assign';
            assignBtn.addEventListener('click', () => assignToMe(item._id, d));
            controls.appendChild(assignBtn);
        }

        //Edit button (only if ticket assigned to this admin)
        if (assignedId && String(assignedId) === String(userId)) {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'btn-edit';
            editBtn.addEventListener('click', () => openEditForm(item, d));
            controls.appendChild(editBtn);
        }
    }

    // Delete button – admin OR creator
    if (canDelete) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'btn-delete';
        deleteBtn.addEventListener('click', () => deleteTicket(item._id, d));
        controls.appendChild(deleteBtn);
    }

    // only append controls if there’s at least one button
    if (controls.children.length > 0) {
        d.appendChild(controls);
    }

    return d;
}

//Button to assign ticket to admin
async function assignToMe(id, node) {
    const user = getUser();
    if (!user) 
        return showMessage('Not authenticated', 'error');
    try {
        const res = await fetch(`${apiBase}/incidents/${id}`, {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
            body: JSON.stringify({ assignedTo: user.id || user._id || user.id }),
        });

        const data = await res.json();
        if (!res.ok) 
            return showMessage(data.message || 'Assign failed', 'error');
        showMessage('Assigned to you', 'success');
        fetchTickets();
    } 
    catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Delete ticket (admin or creator)
async function deleteTicket(id, node) {
    const ok = confirm('Are you sure you want to delete this ticket?');
    if (!ok) return;

    try {
        const res = await fetch(`${apiBase}/incidents/${id}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });

        let data = null;
        try {
            data = await res.json();
        } catch {
            // might be empty body (204), that’s fine
        }

        if (!res.ok) {
            return showMessage(
                (data && data.message) || 'Delete failed',
                'error'
            );
        }

        showMessage('Ticket deleted', 'success');

        // remove from UI
        if (node && node.parentNode) {
            node.parentNode.removeChild(node);
        }
    } catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Open ticket for editing
function openEditForm(item, node) {
    //Replace description/category/priority area with editable inputs
    const descEl = node.querySelector('.desc');
    const metaEls = node.querySelectorAll('.meta');
    //Create form elements
    const form = document.createElement('div');
    form.className = 'edit-form';
    
    //InnerHTML for incident
    form.innerHTML = `
        <label>Title: <input name="title" value="${item.title || ''}" /></label>
        <label>Status: 
            <select name="status">
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
            </select>
        </label>

        <label> Category: <input name="category" value="${item.category || 'General'}" /></label>

        <label>Priority: 
            <select name="priority">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
            </select>
        </label>

        <label>Description:<br/><textarea name="description">${item.description || ''}</textarea></label>

        <div class="edit-actions">
            <button class="btn-save">Save</button>
            <button class="btn-cancel">Cancel</button>
        </div>
    `;

    //set priority and status
    form.querySelector('select[name="priority"]').value = item.priority || 'Medium';
    form.querySelector('select[name="status"]').value = item.status || 'Open';

    //hide current description and append form
    if (descEl) 
        descEl.style.display = 'none';
    node.appendChild(form);

    const btnSave = form.querySelector('.btn-save');
    const btnCancel = form.querySelector('.btn-cancel');
    btnCancel.addEventListener('click', () => { form.remove(); if (descEl) descEl.style.display = ''; });
    
    btnSave.addEventListener('click', async () => {
        const title = form.querySelector('input[name="title"]').value.trim();
        const status = form.querySelector('select[name="status"]').value;
        const category = form.querySelector('input[name="category"]').value.trim();
        const priority = form.querySelector('select[name="priority"]').value;
        const description = form.querySelector('textarea[name="description"]').value.trim();
        try {
            const res = await fetch(`${apiBase}/incidents/${item._id}`, {
                method: 'PATCH',
                headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
                body: JSON.stringify({ title, status, category, priority, description }),
            });

            const data = await res.json();
        
            if (!res.ok) 
                return showMessage(data.message || 'Update failed', 'error');
            
            showMessage('Ticket updated', 'success');
            //refresh tickets to reflect changes
            fetchTickets();
        }
        catch (err) {
            console.error(err);
            showMessage('Network error', 'error');
        }
    });
}

function prependTicket(item) {
    const node = renderTicket(item);
    ticketsList.insertBefore(node, ticketsList.firstChild);
}

//Get all tickets for user
async function fetchTickets() {
    try {
        const res = await fetch(`${apiBase}/incidents`, { headers: authHeaders() });
        const data = await res.json();
        
        if (!res.ok) 
            return showMessage(data.message || 'Loading tickets failed', 'error');
    
        ticketsList.innerHTML = '';
        const items = data.items || data;
    
        if (!items || items.length === 0) {
            ticketsList.textContent = 'No tickets yet';
            return;
        }

        items.forEach(it => ticketsList.appendChild(renderTicket(it)));
    } 
    catch (err) {
        console.error(err);
        showMessage('Network error', 'error');
    }
}

//Logout button
function logout() {
    clearAuth();
    updateUIForAuth();
    showMessage('Logged out', 'info');
}

//Event bindings
btnLogin.addEventListener('click', login);
btnRegister.addEventListener('click', register);
btnLogout.addEventListener('click', logout);
btnCreate.addEventListener('click', createTicket);
btnRefresh.addEventListener('click', fetchTickets);

//Initialize
updateUIForAuth();
