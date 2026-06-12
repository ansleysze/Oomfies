const supabaseUrl = 'https://xvwafkmjztchhroqwsjn.supabase.co';
const supabaseKey = 'sb_publishable_R9Nc-IE0BNsEDliq3MBM1w_wdlmH5hA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
        return;
    }

    showPanel();
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
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('fan_count', { ascending: false });

    const container = document.getElementById('user-list');

    if (error) {
        container.innerHTML = `<div class="empty">${error.message}</div>`;
        return;
    }

    if (!data.length) {
        container.innerHTML = `<div class="empty">No users yet</div>`;
        return;
    }

    container.innerHTML = data.map(user => `
        <div class="user-item">
            <div class="user-info">
                <span class="name">${user.username}</span>
                <span class="fans">${user.fan_count.toLocaleString()} fans</span>
            </div>
            <div class="user-actions">
                <button onclick="editUser('${user.id}', '${user.username}', ${user.fan_count})">Edit</button>
                <button class="delete-btn" onclick="deleteUser('${user.id}')">Delete</button>
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

    const { error } = await supabaseClient
        .from('users')
        .insert([{ username, fan_count: fanCount }]);

    if (error) {
        alert(error.message);
        return;
    }

    document.getElementById('username').value = '';
    document.getElementById('count').value = '';
    loadUsers();
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;

    const { error } = await supabaseClient.from('users').delete().eq('id', id);
    if (error) alert(error.message);
    else loadUsers();
}

async function editUser(id, currentName, currentCount) {
    const newName = prompt('Username:', currentName);
    if (newName === null) return;

    const newCount = prompt('Fan Count:', currentCount);
    if (newCount === null) return;

    const { error } = await supabaseClient
        .from('users')
        .update({ username: newName.trim(), fan_count: parseInt(newCount) })
        .eq('id', id);

    if (error) alert(error.message);
    else loadUsers();
}

supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) showPanel();
});
