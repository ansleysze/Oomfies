const supabaseUrl = 'https://xvwafkmjztchhroqwsjn.supabase.co';
const supabaseKey = 'sb_publishable_R9Nc-IE0BNsEDliq3MBM1w_wdlmH5hA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (btnId === 'login-btn') btn.textContent = loading ? 'Signing in...' : 'Sign In';
    if (btnId === 'add-btn') btn.textContent = loading ? 'Adding...' : '+ Add';
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setLoading('login-btn', true);

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    setLoading('login-btn', false);

    if (error) {
        alert(error.message);
        return;
    }

    await showPanel();
}

async function logout() {
    await supabaseClient.auth.signOut();
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}

async function showPanel() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';

    const { data: { user } } = await supabaseClient.auth.getUser();
    document.getElementById('user-email').textContent = user.email;

    loadUsers();
}

async function loadUsers() {
    const container = document.getElementById('user-list');
    container.innerHTML = `<div class="loading"><div class="spinner"></div><p>Loading users...</p></div>`;

    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('fan_count', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="empty"><p>Error</p><span>${error.message}</span></div>`;
        return;
    }

    if (!data.length) {
        container.innerHTML = `<div class="empty"><p>No users yet</p><span>Add someone above to get started</span></div>`;
        return;
    }

    container.innerHTML = data.map(user => `
        <div class="user-item">
            <div class="user-info">
                <span class="name">${user.username}</span>
                <span class="fans">${user.fan_count.toLocaleString()} fans</span>
            </div>
            <div class="user-actions">
                <input type="number" class="fan-input" id="fans-${user.uuid_id}" placeholder="+fans">
                <button onclick="addFans('${user.uuid_id}')">+ Fans</button>
                <button onclick="editUser('${user.uuid_id}', '${user.username}', ${user.fan_count})">Edit</button>
                <button class="delete-btn" onclick="deleteUser('${user.uuid_id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addUser() {
    const username = document.getElementById('username').value.trim();
    const fanCount = parseInt(document.getElementById('count').value);

    if (!username || isNaN(fanCount)) {
        alert('Fill all fields');
        return;
    }

    setLoading('add-btn', true);

    const { error } = await supabaseClient
        .from('users')
        .insert([{ username, fan_count: fanCount }]);

    setLoading('add-btn', false);

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById('username').value = '';
    document.getElementById('count').value = '';
    loadUsers();
}

async function addFans(userId) {
    const input = document.getElementById(`fans-${userId}`);
    const amount = parseInt(input.value);

    if (!amount || isNaN(amount)) {
        alert('Enter a fan amount');
        return;
    }

    const { error } = await supabaseClient.rpc('add_fans', {
        user_id: userId,
        amount: amount
    });

    if (error) {
        alert(error.message);
    } else {
        input.value = '';
        loadUsers();
    }
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;

    const { error } = await supabaseClient.from('users').delete().eq('uuid_id', id);
    if (error) alert(error.message);
    else loadUsers();
}

async function editUser(id, currentName, currentCount) {
    const newName = prompt('Username:', currentName);
    if (newName === null) return;

    const newCount = prompt('Fan Count:', currentCount);
    if (newCount === null) return;

    const { data, error } = await supabaseClient
        .from('users')
        .update({
            username: newName.trim(),
            fan_count: parseInt(newCount)
        })
        .eq('uuid_id', id);

    if (error) {
        console.log(error);
        alert(error.message);
    } else {
        loadUsers();
    }
}

// Realtime: auto-refresh on any DB change
supabaseClient
    .channel('users')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers();
    })
    .subscribe();

// Auto-login if session exists
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) showPanel();
});