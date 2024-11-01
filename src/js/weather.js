let currentWeatherData = null;

// Add search handling function
async function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const location = searchInput.value.trim();
    
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    await loadWeatherData(location);
}

// Add keyboard event listener for search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    // Initialize the page with just the search bar visible
    const weatherDetails = document.getElementById('weatherDetails');
    if (weatherDetails) {
        weatherDetails.classList.add('hidden');
    }
});

async function loadWeatherData(location) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const weatherDetails = document.getElementById('weatherDetails');
    
    if (!loadingIndicator || !errorMessage || !weatherDetails) {
        console.error('Required DOM elements not found');
        return;
    }

    try {
        loadingIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        weatherDetails.classList.add('hidden');
        
        const data = await window.api.getWeather(location);
        if (!data) {
            throw new Error('No weather data received');
        }
        
        currentWeatherData = data;
        
        // Update all displays
        updateWeatherDisplay(data);
        updateForecastDisplay(data);
        updateClothingRecommendations(data);
        
        weatherDetails.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('Unable to find weather data for this location. Please try again.');
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

function updateWeatherDisplay(data) {
    if (!data || !data.location || !data.current || !data.forecast) {
        console.error('Invalid weather data structure');
        return;
    }

    try {
        const elements = {
            locationName: document.getElementById('locationName'),
            regionCountry: document.getElementById('regionCountry'),
            localTime: document.getElementById('localTime'),
            currentTemp: document.getElementById('currentTemp'),
            feelsLike: document.getElementById('feelsLike'),
            weatherDesc: document.getElementById('weatherDesc'),
            humidity: document.getElementById('humidity'),
            windSpeed: document.getElementById('windSpeed'),
            sunrise: document.getElementById('sunrise'),
            sunset: document.getElementById('sunset'),
            weatherIcon: document.getElementById('weatherIcon')
        };

        // Check if all elements exist
        for (const [key, element] of Object.entries(elements)) {
            if (!element) {
                console.error(`Element not found: ${key}`);
                return;
            }
        }

        // Location Information
        elements.locationName.textContent = data.location.name;
        elements.regionCountry.textContent = 
            `${data.location.region || ''}, ${data.location.country}`;
        
        // Time Information
        const localTime = new Date(data.location.localtime);
        elements.localTime.textContent = 
            `Local Time: ${localTime.toLocaleTimeString()}`;
        
        // Current Weather
        elements.currentTemp.textContent = 
            `${Math.round(data.current.temp_c)}°C`;
        elements.feelsLike.textContent = 
            `Feels like: ${Math.round(data.current.feelslike_c)}°C`;
        elements.weatherDesc.textContent = 
            data.current.condition.text;
        
        // Weather Details
        elements.humidity.textContent = 
            `${data.current.humidity}%`;
        elements.windSpeed.textContent = 
            `${Math.round(data.current.wind_kph)} km/h`;
        
        // Astronomy Data
        if (data.forecast.forecastday && data.forecast.forecastday[0]) {
            const astronomy = data.forecast.forecastday[0].astro;
            elements.sunrise.textContent = astronomy.sunrise;
            elements.sunset.textContent = astronomy.sunset;
        }
        
        // Weather Icon
        elements.weatherIcon.src = `https:${data.current.condition.icon}`;
        elements.weatherIcon.alt = data.current.condition.text;
    } catch (error) {
        console.error('Error updating weather display:', error);
        showError('Error displaying weather data');
    }
}

function updateForecastDisplay(data) {
    try {
        const forecastContainer = document.getElementById('forecastContainer');
        forecastContainer.innerHTML = ''; // Clear existing forecast

        data.forecast.forecastday.forEach(day => {
            const date = new Date(day.date);
            const forecastCard = document.createElement('div');
            forecastCard.className = 'forecast-card';
            
            forecastCard.innerHTML = `
                <div class="forecast-date">${date.toLocaleDateString()}</div>
                <img src="https:${day.day.condition.icon}" 
                     alt="${day.day.condition.text}" 
                     class="forecast-icon">
                <div class="forecast-temps">
                    <span class="max-temp">${Math.round(day.day.maxtemp_c)}°C</span>
                    <span class="min-temp">${Math.round(day.day.mintemp_c)}°C</span>
                </div>
                <div class="forecast-condition">${day.day.condition.text}</div>
            `;
            
            forecastContainer.appendChild(forecastCard);
        });
    } catch (error) {
        console.error('Error updating forecast display:', error);
    }
}

function updateClothingRecommendations(data) {
    const temp = data.current.temp_c;
    const isRaining = data.current.condition.text.toLowerCase().includes('rain');
    let recommendation = '';

    if (temp < 10) {
        recommendation = 'Heavy winter clothing recommended: Warm coat, scarf, gloves, and winter boots.';
    } else if (temp < 20) {
        recommendation = 'Light jacket or sweater recommended. Long pants advised.';
    } else {
        recommendation = 'Light clothing suitable. Short sleeves and light pants/shorts recommended.';
    }

    if (isRaining) {
        recommendation += ' Don\'t forget an umbrella or raincoat!';
    }

    document.getElementById('clothingAdvice').textContent = recommendation;
}