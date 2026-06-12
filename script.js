const supabaseUrl = 'https://xvwafkmjztchhroqwsjn.supabase.co';
const supabaseKey = 'sb_publishable_R9Nc-IE0BNsEDliq3MBM1w_wdlmH5hA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function loadData() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('fan_count', { ascending: false });

    const chartLoading = document.getElementById('chart-loading');
    const canvas = document.getElementById('chart');
    const leaderboard = document.getElementById('leaderboard');
    const emptyState = document.getElementById('empty-state');

    chartLoading.style.display = 'none';

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

    // Show chart
    canvas.style.display = 'block';
    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: data.map(u => u.username),
            datasets: [{
                label: 'Fan Count',
                data: data.map(u => u.fan_count),
                backgroundColor: data.map((_, i) =>
                    i === 0 ? '#f5c518' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : '#e0e0e0'
                ),
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

    // Show leaderboard cards
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

loadData();

supabaseClient
    .channel('users')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadData();
    })
    .subscribe();
