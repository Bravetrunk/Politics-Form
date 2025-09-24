import { database } from './firebase-config.js';
import { ref, onValue, remove } from '<https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js>';

// Global variables
let allSubmissions = [];
let currentPage = 1;
const itemsPerPage = 10;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadData();
});

// Initialize dashboard
function initializeDashboard() {
    updateLastUpdated();
    setInterval(updateLastUpdated, 60000); // Update every minute
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);

    // Search
    document.getElementById('searchInput').addEventListener('input', filterTable);

    // Filter
    document.getElementById('filterSelect').addEventListener('change', filterTable);

    // Select all checkbox
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);

    // Delete selected
    document.getElementById('deleteSelected').addEventListener('click', deleteSelectedSubmissions);

    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));

    // Export buttons
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);
    document.getElementById('exportJSON').addEventListener('click', exportToJSON);
    document.getElementById('exportPDF').addEventListener('click', exportToPDF);
    document.getElementById('printData').addEventListener('click', printData);

    // Modal close
    document.querySelector('.close-modal').addEventListener('click', closeModal);
}

// Load data from Firebase
function loadData() {
    const submissionsRef = ref(database, 'submissions');

    onValue(submissionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allSubmissions = Object.entries(data).map(([id, submission]) => ({
                id,
                ...submission
            }));

            updateDashboard();
            updateCharts();
            populateTable();
            updateAnalytics();
        } else {
            allSubmissions = [];
            updateDashboard();
        }
    });
}

// Update dashboard stats
function updateDashboard() {
    // Total submissions
    document.getElementById('totalSubmissions').textContent = allSubmissions.length;

    // Today's submissions
    const today = new Date().toDateString();
    const todayCount = allSubmissions.filter(s =>
        new Date(s.timestamp).toDateString() === today
    ).length;
    document.getElementById('todaySubmissions').textContent = todayCount;

    // This week's submissions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = allSubmissions.filter(s =>
        new Date(s.timestamp) > weekAgo
    ).length;
    document.getElementById('weekSubmissions').textContent = weekCount;

    // Response rate (mock data for demo)
    document.getElementById('responseRate').textContent = '87%';
    document.getElementById('avgResponse').textContent = '2.5h';

    // Recent activity
    updateRecentActivity();
}

// Update recent activity
function updateRecentActivity() {
    const recentActivity = document.getElementById('recentActivity');
    const recent = allSubmissions.slice(-5).reverse();

    recentActivity.innerHTML = recent.map(submission => `
        <div class="activity-item">
            <strong>${submission.name}</strong> submitted a form
            <br>Subject: ${submission.subject}
            <br><span class="activity-time">${formatDate(submission.timestamp)}</span>
        </div>
    `).join('');
}

// Update charts
function updateCharts() {
    // Line chart - Submissions over time
    const ctx1 = document.getElementById('lineChart').getContext('2d');
    const dailyData = getDailySubmissions();

    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: dailyData.labels,
            datasets: [{
                label: 'Submissions',
                data: dailyData.data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Bar chart - Submissions by day of week
    const ctx2 = document.getElementById('barChart').getContext('2d');
    const weekdayData = getWeekdaySubmissions();

    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Submissions',
                data: weekdayData,
                backgroundColor: '#764ba2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Get daily submissions data
function getDailySubmissions() {
    const last7Days = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        last7Days.push(dateStr);

        const count = allSubmissions.filter(s =>
            new Date(s.timestamp).toDateString() === date.toDateString()
        ).length;
        counts.push(count);
    }

    return { labels: last7Days, data: counts };
}

// Get weekday submissions data
function getWeekdaySubmissions() {
    const weekdays = new Array(7).fill(0);

    allSubmissions.forEach(submission => {
        const day = new Date(submission.timestamp).getDay();
        weekdays[day === 0 ? 6 : day - 1]++;
    });

    return weekdays;
}

// Populate table
function populateTable() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageSubmissions = allSubmissions.slice(start, end);

    tbody.innerHTML = pageSubmissions.map(submission => `
        <tr>
            <td><input type="checkbox" class="select-item" data-id="${submission.id}"></td>
            <td>${formatDate(submission.timestamp)}</td>
            <td>${submission.name}</td>
            <td>${submission.email}</td>
            <td>${submission.subject}</td>
            <td>${submission.message.substring(0, 50)}...</td>
            <td>
                <button class="action-btn view-btn" onclick="viewSubmission('${submission.id}')">View</button>
                <button class="action-btn delete-btn" onclick="deleteSubmission('${submission.id}')">Delete</button>
            </td>
        </tr>
    `).join('');

    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(allSubmissions.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
}

// Change page
function changePage(direction) {
    currentPage += direction;
    populateTable();
}

// Filter table
function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterValue = document.getElementById('filterSelect').value;

    let filtered = allSubmissions;

    // Apply time filter
    if (filterValue !== 'all') {
        const now = new Date();
        filtered = filtered.filter(submission => {
            const submissionDate = new Date(submission.timestamp);

            switch(filterValue) {
                case 'today':
                    return submissionDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return submissionDate > weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return submissionDate > monthAgo;
                default:
                    return true;
            }
        });
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(submission =>
            submission.name.toLowerCase().includes(searchTerm) ||
            submission.email.toLowerCase().includes(searchTerm) ||
            submission.subject.toLowerCase().includes(searchTerm) ||
            submission.message.toLowerCase().includes(searchTerm)
        );
    }

    allSubmissions = filtered;
    currentPage = 1;
    populateTable();
}

// Update analytics
function updateAnalytics() {
    // Pie chart - Top subjects
    const subjects = {};
    allSubmissions.forEach(s => {
        subjects[s.subject] = (subjects[s.subject] || 0) + 1;
    });

    const ctx3 = document.getElementById('pieChart').getContext('2d');
    new Chart(ctx3, {
        type: 'pie',
        data: {
            labels: Object.keys(subjects).slice(0, 5),
            datasets: [{
                data: Object.values(subjects).slice(0, 5),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f39c12',
                    '#e74c3c',
                    '#2ecc71'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Email domains
    const domains = {};
    allSubmissions.forEach(s => {
        const domain = s.email.split('@')[1];
        domains[domain] = (domains[domain] || 0) + 1;
    });

    const domainsList = document.getElementById('domainsList');
    domainsList.innerHTML = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => `
            <div class="domain-item">
                <span>${domain}</span>
                <span>${count} submissions</span>
            </div>
        `).join('');

    // Insights
    generateInsights();
}

// Generate insights
function generateInsights() {
    const insights = [];

    // Peak submission time
    const hours = new Array(24).fill(0);
    allSubmissions.forEach(s => {
        const hour = new Date(s.timestamp).getHours();
        hours[hour]++;
    });
    const peakHour = hours.indexOf(Math.max(...hours));
    insights.push(`📊 Peak submission time is ${peakHour}:00 - ${peakHour + 1}:00`);

    // Average message length
    const avgLength = Math.round(
        allSubmissions.reduce((sum, s) => sum + s.message.length, 0) / allSubmissions.length
    );
    insights.push(`📝 Average message length is ${avgLength} characters`);

    // Most active day
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayData = getWeekdaySubmissions();
    const mostActiveDay = weekdayNames[weekdayData.indexOf(Math.max(...weekdayData)) + 1];
    insights.push(`📅 Most active day is ${mostActiveDay}`);

    // Growth rate
    const thisWeek = allSubmissions.filter(s => {
        const date = new Date(s.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date > weekAgo;
    }).length;

    const lastWeek = allSubmissions.filter(s => {
        const date = new Date(s.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        return date <= weekAgo && date > twoWeeksAgo;
    }).length;

    const growthRate = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
    insights.push(`📈 Week-over-week growth: ${growthRate > 0 ? '+' : ''}${growthRate}%`);

    document.getElementById('insightsList').innerHTML =
        insights.map(insight => `<li>${insight}</li>`).join('');
}

// Export functions
function exportToCSV() {
    const headers = ['Date', 'Name', 'Email', 'Subject', 'Message'];
    const rows = allSubmissions.map(s => [
        formatDate(s.timestamp),
        s.name,
        s.email,
        s.subject,
        s.message.replace(/,/g, ';')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
    downloadFile(csv, 'submissions.csv', 'text/csv');
}

function exportToJSON() {
    const json = JSON.stringify(allSubmissions, null, 2);
    downloadFile(json, 'submissions.json', 'application/json');
}

function exportToPDF() {
    alert('PDF export would require a library like jsPDF. For now, use Print Preview.');
    window.print();
}

function printData() {
    window.print();
}

// Helper functions
function switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function updateLastUpdated() {
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function toggleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.select-item').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

function deleteSelectedSubmissions() {
    const selected = document.querySelectorAll('.select-item:checked');
    if (selected.length === 0) {
        alert('Please select submissions to delete');
        return;
    }

    if (confirm(`Delete ${selected.length} submissions?`)) {
        selected.forEach(checkbox => {
            deleteSubmission(checkbox.dataset.id);
        });
    }
}

// Global functions for inline onclick
window.viewSubmission = function(id) {
    const submission = allSubmissions.find(s => s.id === id);
    if (submission) {
        const modal = document.getElementById('submissionModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <p><strong>Name:</strong> ${submission.name}</p>
            <p><strong>Email:</strong> ${submission.email}</p>
            <p><strong>Subject:</strong> ${submission.subject}</p>
            <p><strong>Message:</strong> ${submission.message}</p>
            <p><strong>Date:</strong> ${formatDate(submission.timestamp)}</p>
        `;

        modal.style.display = 'block';
    }
};

window.deleteSubmission = async function(id) {
    if (confirm('Are you sure you want to delete this submission?')) {
        try {
            const submissionRef = ref(database, `submissions/${id}`);
            await remove(submissionRef);
            loadData();
        } catch (error) {
            console.error('Error deleting submission:', error);
        }
    }
};

function closeModal() {
    document.getElementById('submissionModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('submissionModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
