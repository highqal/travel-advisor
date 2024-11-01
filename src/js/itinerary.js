let itineraries = [];
let currentEditingId = null;
let isLoading = false;
let modalCallback = null;

document.addEventListener('DOMContentLoaded', () => {
    // Verify API is available
    if (!window.api) {
        console.error('API not available. Check preload script configuration.');
        showError('Application initialization failed. Please restart the application.');
        return;
    }

    loadItineraries();
    setupEventListeners();
    setupFormValidation();
});

function setupEventListeners() {
    document.getElementById('newItineraryBtn').addEventListener('click', showItineraryForm);
    document.getElementById('cancelBtn').addEventListener('click', hideItineraryForm);
    document.getElementById('createItineraryForm').addEventListener('submit', handleItinerarySubmit);

    // Add loading spinner to buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function() {
            if (this.dataset.loading) {
                addLoadingState(this);
            }
        });
    });
}

function setupFormValidation() {
    const form = document.getElementById('createItineraryForm');
    
    // Validate dates
    form.querySelector('#endDate').addEventListener('change', function() {
        const startDate = new Date(form.querySelector('#startDate').value);
        const endDate = new Date(this.value);
        
        if (endDate < startDate) {
            this.setCustomValidity('End date must be after start date');
        } else {
            this.setCustomValidity('');
        }
    });
}

async function loadItineraries() {
    showLoadingState();
    try {
        const loadedItineraries = await window.api.getItineraries();
        console.log('Loaded itineraries:', loadedItineraries); // Debug log
        
        if (Array.isArray(loadedItineraries)) {
            itineraries = loadedItineraries;
            displayItineraries();
        } else {
            throw new Error('Invalid itineraries data received');
        }
    } catch (error) {
        console.error('Error loading itineraries:', error);
        showError('Failed to load itineraries: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

function displayItineraries() {
    const itineraryList = document.getElementById('itineraryList');
    itineraryList.innerHTML = '';

    if (itineraries.length === 0) {
        itineraryList.innerHTML = `
            <div class="empty-state">
                <img src="assets/empty-list.svg" alt="No itineraries">
                <p>No itineraries yet. Create your first travel plan!</p>
            </div>
        `;
        return;
    }

    itineraries.forEach(itinerary => {
        const itineraryElement = createItineraryElement(itinerary);
        itineraryList.appendChild(itineraryElement);
    });
}

function createItineraryElement(itinerary) {
    const div = document.createElement('div');
    div.className = 'itinerary-card';
    
    const createdDate = new Date(itinerary.createdAt).toLocaleDateString();
    const scheduledDate = new Date(itinerary.dateTime).toLocaleDateString();
    const scheduledTime = new Date(itinerary.dateTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Create weather HTML if weather data exists
    const weatherHTML = itinerary.weatherForecast ? `
        <div class="weather-info">
            <h4>Weather Forecast</h4>
            <div class="weather-details">
                <img src="${itinerary.weatherForecast.icon}" alt="${itinerary.weatherForecast.condition}" class="weather-icon">
                <div>
                    <p>${itinerary.weatherForecast.condition}</p>
                    <p>High: ${itinerary.weatherForecast.maxTemp}°C</p>
                    <p>Low: ${itinerary.weatherForecast.minTemp}°C</p>
                </div>
            </div>
        </div>
    ` : '';
    
    div.innerHTML = `
        <div class="itinerary-header">
            <h3>${itinerary.tripName}</h3>
            <div class="header-actions">
                <span class="created-date">Created: ${createdDate}</span>
                <button onclick="toggleItineraryDetails(this)" class="btn btn-view">
                    Details
                </button>
            </div>
        </div>
        <div class="itinerary-content hidden">
            <p><strong>Destination:</strong> ${itinerary.destination}</p>
            <p><strong>Date:</strong> ${scheduledDate}</p>
            <p><strong>Time:</strong> ${scheduledTime}</p>
            ${weatherHTML}
            <p><strong>Activities:</strong></p>
            <p class="activities">${itinerary.activities}</p>
            <div class="itinerary-actions">
                <button onclick="editItinerary('${itinerary.id}')" class="btn btn-edit">
                    Edit
                </button>
                <button onclick="deleteItinerary('${itinerary.id}')" class="btn btn-delete">
                    Delete
                </button>
            </div>
        </div>
    `;
    return div;
}

function toggleItineraryDetails(button) {
    const content = button.closest('.itinerary-card').querySelector('.itinerary-content');
    content.classList.toggle('hidden');
    
    // Toggle the expand/collapse icon
    const icon = button.querySelector('.material-icons');
    if (content.classList.contains('hidden')) {
        icon.textContent = 'Details';
    } else {
        icon.textContent = 'Close';
    }
}

async function handleItinerarySubmit(event) {
    event.preventDefault();
    showLoadingState();
    
    try {
        const date = document.getElementById('date').value;
        const time = document.getElementById('time').value;
        const dateTime = `${date}T${time}`;
        const destination = document.getElementById('destination').value;

        const itineraryData = {
            tripName: document.getElementById('tripName').value,
            destination: destination,
            dateTime: dateTime,
            activities: document.getElementById('activities').value
        };

        if (currentEditingId) {
            // For editing, also update weather data
            const updatedItinerary = await updateItineraryWeather(itineraryData);
            await window.api.updateItinerary(currentEditingId, updatedItinerary);
            showToast('Itinerary updated successfully');
        } else {
            // For new itineraries, include weather data
            const itineraryWithWeather = await updateItineraryWeather(itineraryData);
            const savedItinerary = await window.api.saveItinerary(itineraryWithWeather);
            itineraries.push(savedItinerary);
            showToast('Itinerary saved successfully');
        }

        await loadItineraries();
        hideItineraryForm();
        document.getElementById('createItineraryForm').reset();
        currentEditingId = null;
    } catch (error) {
        console.error('Error saving itinerary:', error);
        showError('Failed to save itinerary: ' + error.message);
    } finally {
        hideLoadingState();
    }
}

async function editItinerary(id) {
    const itinerary = itineraries.find(i => i.id === id);
    if (!itinerary) return;

    currentEditingId = id;
    const form = document.getElementById('createItineraryForm');
    
    // Split datetime into date and time
    const dateTime = new Date(itinerary.dateTime);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().slice(0, 5);
    
    // Populate form with existing data
    form.querySelector('#tripName').value = itinerary.tripName;
    form.querySelector('#destination').value = itinerary.destination;
    form.querySelector('#date').value = date;
    form.querySelector('#time').value = time;
    form.querySelector('#activities').value = itinerary.activities;

    // Change form submit button text
    form.querySelector('button[type="submit"]').textContent = 'Update Itinerary';
    showItineraryForm();
}

async function deleteItinerary(id) {
    modalCallback = async () => {
        showLoadingState();
        try {
            await window.api.deleteItinerary(id);
            await loadItineraries();
            showToast('Itinerary deleted successfully');
        } catch (error) {
            console.error('Error deleting itinerary:', error);
            showError('Failed to delete itinerary');
        } finally {
            hideLoadingState();
        }
    };

    showModal(
        'Confirm Deletion',
        'Are you sure you want to delete this itinerary? This action cannot be undone.',
        'confirm'
    );
}

// UI Helper functions
function showItineraryForm() {
    document.getElementById('itineraryForm').classList.remove('hidden');
    document.getElementById('newItineraryBtn').classList.add('hidden');
    
    // Reset form title and button text if not editing
    const formTitle = document.querySelector('#itineraryForm h3');
    const submitButton = document.querySelector('#createItineraryForm button[type="submit"]');
    
    if (!currentEditingId) {
        formTitle.textContent = 'New Itinerary';
        submitButton.textContent = 'Save Itinerary';
    } else {
        formTitle.textContent = 'Edit Itinerary';
        submitButton.textContent = 'Update Itinerary';
    }
}

function hideItineraryForm() {
    document.getElementById('itineraryForm').classList.add('hidden');
    document.getElementById('newItineraryBtn').classList.remove('hidden');
    document.getElementById('createItineraryForm').reset();
    
    // Reset editing state and form text
    currentEditingId = null;
    const formTitle = document.querySelector('#itineraryForm h3');
    const submitButton = document.querySelector('#createItineraryForm button[type="submit"]');
    formTitle.textContent = 'New Itinerary';
    submitButton.textContent = 'Save Itinerary';
}

function showLoadingState() {
    isLoading = true;
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoadingState() {
    isLoading = false;
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showError(message) {
    showModal('Error', message);
}

function showToast(message) {
    showModal('Success', message);
}

function showModal(title, message, type = 'alert') {
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (type === 'confirm') {
        cancelBtn.style.display = 'block';
        confirmBtn.textContent = 'Confirm';
        if (title === 'Confirm Deletion') {
            confirmBtn.style.backgroundColor = '#dc3545';
        } else {
            confirmBtn.style.backgroundColor = '#007bff';
        }
    } else {
        cancelBtn.style.display = 'none';
        confirmBtn.textContent = 'OK';
        confirmBtn.style.backgroundColor = '#007bff';
    }

    modalOverlay.classList.remove('hidden');
}

function closeModal(confirmed = false) {
    const modalOverlay = document.getElementById('modalOverlay');
    modalOverlay.classList.add('hidden');
    
    if (modalCallback && confirmed) {
        modalCallback();
    }
    modalCallback = null;
}

function handleModalConfirm() {
    closeModal(true);
}

async function getWeatherForecast(location, date) {
    try {
        const data = await window.api.getWeather(location);
        const forecast = data.forecast.forecastday.find(day => 
            day.date === date.split('T')[0]
        );
        return forecast;
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

async function updateItineraryWeather(itinerary) {
    const forecast = await getWeatherForecast(itinerary.destination, itinerary.dateTime);
    if (forecast) {
        return {
            ...itinerary,
            weatherForecast: {
                maxTemp: forecast.day.maxtemp_c,
                minTemp: forecast.day.mintemp_c,
                condition: forecast.day.condition.text,
                icon: forecast.day.condition.icon
            }
        };
    }
    return itinerary;
}