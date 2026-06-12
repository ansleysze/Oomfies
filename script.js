const supabaseUrl = 'https://xvwafkmjztchhroqwsjn.supabase.co';
const supabaseKey = 'sb_publishable_R9Nc-IE0BNsEDliq3MBM1w_wdlmH5hA';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function loadChart() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('fan_count', { ascending: false });

    if (error || !data.length) return;

    new Chart(document.getElementById('chart'), {
        type: 'bar',
        data: {
            labels: data.map(u => u.username),
            datasets: [{
                label: 'Fan Count',
                data: data.map(u => u.fan_count),
                backgroundColor: '#111'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

loadChart();
