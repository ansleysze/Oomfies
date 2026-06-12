const supabaseUrl = 'https://xvwafkmjztchhroqwsjn.supabase.co';
const supabaseKey = 'sb_publishable_R9Nc-IE0BNsEDliq3MBM1w_wdlmH5hA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const LINE_COLORS = ['#f5c518', '#6366f1', '#10b981', '#ef4444', '#f97316', '#8b5cf6', '#06b6d4'];

let lineChartInstance = null;
let barChartInstance = null;

function getWeekLabel(dateStr) {
    const d = new Date(dateStr);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadLineChart() {
    const lineLoading = document.getElementById('line-loading');
    const lineCanvas = document.getElementById('line-chart');

    const { data, error } = await supabaseClient
        .from('fan_history')
        .select(`user_id, created_at, change_amount, users (username)`)
        .order('created_at', { ascending: true });

    lineLoading.style.display = 'none';

    if (error || !data || !data.length) return;

    // Group by user and week
    const userWeeks = {};
    const allWeeks = new Set();

    data.forEach(entry => {
        const username = entry.users?.username || entry.user_id;
        const week = getWeekLabel(entry.created_at);
        allWeeks.add(week);

        if (!userWeeks[username]) userWeeks[username] = {};
        if (!userWeeks[username][week]) userWeeks[username][week] = 0;
        userWeeks[username][week] += entry.change_amount;
    });

    const weeks = [...allWeeks];
    const datasets = Object.keys(userWeeks).map((username, i) => ({
        label: username,
        data: weeks.map(w => userWeeks[username][w] || 0),
        borderColor: LINE_COLORS[i % LINE_COLORS.length],
        backgroundColor: LINE_COLORS[i % LINE_COLORS.length] + '20',
        tension: 0.3,
        fill: false,
        pointRadius: 4
    }));

    lineCanvas.style.display = 'block';

    if (lineChartInstance) lineChartInstance.destroy();
    lineChartInstance = new Chart(lineCanvas, {
        type: 'line',
        data: { labels: weeks, datasets },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f5f5f5' } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function loadBarChart() {
    const barLoading = document.getElementById('bar-loading');
    const barCanvas = document.getElementById('bar-chart');
    const leaderboard = document.getElementById('leaderboard');
    const emptyState = document.getElementById('empty-state');

    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('fan_count', { ascending: false });

    barLoading.style.display = 'none';

    if (error) {
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = 'Failed to load data';
        emptyState.querySelector('span').textContent = error.message;
        return;
    }

    if (!data.length) {
        emptyState.style.display = 'block';
        return;
    }

    barCanvas.style.display = 'block';

    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(barCanvas, {
        type: 'bar',
        data: {
            labels: data.map(u => u.username),
            datasets: [{
                label: 'Total Fans',
                data: data.map(u => u.fan_count),
                backgroundColor: data.map((_, i) => {
                    if (i === 0) return '#f5c518';
                    if (i === 1) return '#a8a8a8';
                    if (i === 2) return '#cd7f32';
                    return '#e0e0e0';
                }),
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f5f5f5' } },
                x: { grid: { display: false } }
            }
        }
    });

    leaderboard.innerHTML = data.map((user, i) => `
        <div class="leader-card">
            <div class="rank">#${i + 1}</div>
            <div class="leader-info">
                <div class="leader-name">${user.username}</div>
                <div class="leader-count">${user.fan_count.toLocaleString()} fans</div>
            </div>
        </div>
    `).join('');
}

function loadData() {
    loadLineChart();
    loadBarChart();
}

loadData();

supabaseClient
    .channel('users')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadData();
    })
    .subscribe();

supabaseClient
    .channel('fan_history')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fan_history' }, () => {
        loadLineChart();
    })
    .subscribe();
