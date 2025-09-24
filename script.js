import { database } from './firebase-config.js';
import { ref, push, onValue, remove, get } from '<https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js>';

// Form submission handler
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Clear previous errors
    clearErrors();

    // Get form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const message = document.getElementById('message').value.trim();

    // Validate form
    let isValid = true;

    if (name.length < 2) {
        showError('nameError', 'Name must be at least 2 characters long');
        isValid = false;
    }

    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    }

    if (message.length < 10) {
        showError('messageError', 'Message must be at least 10 characters long');
        isValid = false;
    }

    if (isValid) {
        // Disable submit button
        const submitBtn = document.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            // Save to Firebase
            await saveToFirebase({
                name: name,
                email: email,
                subject: subject,
                message: message,
                timestamp: Date.now()
            });

            // Show success message
            showSuccess('Thank you! Your message has been saved to Firebase.');

            // Reset form
            document.getElementById('contactForm').reset();
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            showSuccess('Error saving message. Please try again.', true);
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Message';
        }
    }
});

// Save data to Firebase
async function saveToFirebase(formData) {
    try {
        const submissionsRef = ref(database, 'submissions');
        await push(submissionsRef, formData);
        console.log('Data saved successfully!');
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

// Read data from Firebase
function loadSubmissions() {
    const submissionsRef = ref(database, 'submissions');

    onValue(submissionsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            displaySubmissions(data);
        } else {
            document.getElementById('submissionsContainer').innerHTML =
                '<p>No submissions yet.</p>';
        }
    });
}

// Display submissions
function displaySubmissions(submissions) {
    const container = document.getElementById('submissionsContainer');
    container.innerHTML = '<h3>All Submissions</h3>';

    const submissionsList = document.createElement('div');
    submissionsList.className = 'submissions-list';

    // Convert object to array and sort by timestamp
    const sortedSubmissions = Object.entries(submissions)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.timestamp - a.timestamp);

    sortedSubmissions.forEach(submission => {
        const submissionCard = document.createElement('div');
        submissionCard.className = 'submission-card';

        const date = new Date(submission.timestamp).toLocaleString();

        submissionCard.innerHTML = `
            <div class="submission-header">
                <strong>${submission.name}</strong>
                <button class="delete-btn" data-id="${submission.id}">Delete</button>
            </div>
            <p><strong>Email:</strong> ${submission.email}</p>
            <p><strong>Subject:</strong> ${submission.subject}</p>
            <p><strong>Message:</strong> ${submission.message}</p>
            <p class="submission-date">${date}</p>
        `;

        submissionsList.appendChild(submissionCard);
    });

    container.appendChild(submissionsList);

    // Add delete functionality
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteSubmission(this.dataset.id);
        });
    });
}

// Delete submission from Firebase
async function deleteSubmission(submissionId) {
    if (confirm('Are you sure you want to delete this submission?')) {
        try {
            const submissionRef = ref(database, `submissions/${submissionId}`);
            await remove(submissionRef);
            showSuccess('Submission deleted successfully!');
        } catch (error) {
            console.error('Error deleting submission:', error);
            showSuccess('Error deleting submission.', true);
        }
    }
}

// View submissions button
document.getElementById('viewSubmissions').addEventListener('click', function() {
    const container = document.getElementById('submissionsContainer');
    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        loadSubmissions();
        this.textContent = 'Hide Submissions';
    } else {
        container.style.display = 'none';
        this.textContent = 'View All Submissions';
    }
});

// Helper functions
function showError(elementId, message) {
    document.getElementById(elementId).textContent = message;
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

function showSuccess(message, isError = false) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.backgroundColor = isError ? '#f8d7da' : '#d4edda';
    successDiv.style.color = isError ? '#721c24' : '#155724';
    successDiv.classList.add('show');

    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);
}
// Export data as CSV
function exportToCSV() {
    const submissionsRef = ref(database, 'submissions');
    get(submissionsRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const csv = convertToCSV(data);
            downloadCSV(csv, 'submissions.csv');
        }
    });
}

// Search functionality
function searchSubmissions(searchTerm) {
    const submissionsRef = ref(database, 'submissions');
    onValue(submissionsRef, (snapshot) => {
        const data = snapshot.val();
        const filtered = Object.entries(data)
            .filter(([id, submission]) =>
                submission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                submission.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        displaySubmissions(Object.fromEntries(filtered));
    });
}
