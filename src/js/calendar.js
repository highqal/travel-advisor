let currentDate = new Date();
let selectedDate = null;
let itineraries = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.api) {
        console.error('API not available');
        return;
    }

    await loadItineraries();
    setupCalendar();
    setupEventListeners();
    renderCalendar();
    
    // Show initial message by default
    document.getElementById('eventDetails').classList.add('hidden');
    document.getElementById('initialMessage').style.display = 'block';
});

async function loadItineraries() {
    try {
        itineraries = await window.api.getItineraries();
    } catch (error) {
        console.error('Error loading itineraries:', error);
    }
}

function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

function setupCalendar() {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdaysContainer = document.querySelector('.weekdays');
    weekdaysContainer.innerHTML = weekdays.map(day => `<div>${day.slice(0, 3)}</div>`).join('');
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('currentMonthYear').textContent = 
        new Date(year, month).toLocaleDateString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
        daysContainer.appendChild(createDayElement(''));
    }

    // Create calendar days
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = createDayElement(day, date);
        
        // Check if there are any itineraries for this date
        const dayItineraries = getItinerariesForDate(date);
        if (dayItineraries.length > 0) {
            dayElement.classList.add('has-events');
            dayElement.setAttribute('data-events', dayItineraries.length);
        }

        daysContainer.appendChild(dayElement);
    }
}

function createDayElement(day, date) {
    const div = document.createElement('div');
    div.className = 'calendar-day';
    div.textContent = day;

    if (date) {
        div.addEventListener('click', () => showEventDetails(date));
        
        // Highlight current day
        if (isToday(date)) {
            div.classList.add('today');
        }
        
        // Highlight selected day
        if (selectedDate && isSameDay(date, selectedDate)) {
            div.classList.add('selected');
        }
    } else {
        div.classList.add('empty');
    }

    return div;
}

function getItinerariesForDate(date) {
    return itineraries.filter(itinerary => {
        const itineraryDate = new Date(itinerary.dateTime);
        return isSameDay(itineraryDate, date);
    });
}

function showEventDetails(date) {
    selectedDate = date;
    const dayItineraries = getItinerariesForDate(date);
    const eventDetails = document.getElementById('eventDetails');
    const selectedDateElement = document.getElementById('selectedDate');
    const eventsList = document.getElementById('eventsList');
    const initialMessage = document.getElementById('initialMessage');

    // Hide initial message
    initialMessage.style.display = 'none';

    selectedDateElement.textContent = date.toLocaleDateString();
    eventsList.innerHTML = '';

    if (dayItineraries.length === 0) {
        eventsList.innerHTML = '<p class="no-events">No itineraries for this date</p>';
    } else {
        dayItineraries.forEach(itinerary => {
            const time = new Date(itinerary.dateTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const eventElement = document.createElement('div');
            eventElement.className = 'event-item';
            eventElement.innerHTML = `
                <div class="event-time">${time}</div>
                <div class="event-content">
                    <div class="event-title">${itinerary.tripName}</div>
                    <div class="event-location">Location: ${itinerary.destination}</div>
                </div>
            `;
            eventsList.appendChild(eventElement);
        });
    }

    eventDetails.classList.remove('hidden');
    eventDetails.classList.add('visible');
    renderCalendar();
}

function closeEventDetails() {
    selectedDate = null;
    const eventDetails = document.getElementById('eventDetails');
    const initialMessage = document.getElementById('initialMessage');

    eventDetails.classList.remove('visible');
    eventDetails.classList.add('hidden');
    initialMessage.style.display = 'block';
    
    renderCalendar(); // Re-render to remove selected day highlighting
}

function isToday(date) {
    const today = new Date();
    return isSameDay(date, today);
}

function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
} 