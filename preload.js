// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge } = require('electron');
const fs = require('fs').promises; // Use promises version
const path = require('path');

const ITINERARIES_DIR = 'D:\\travel-advisor\\txt';

// Create directory if it doesn't exist
async function ensureDirectoryExists() {
    try {
        await fs.access(ITINERARIES_DIR);
    } catch {
        await fs.mkdir(ITINERARIES_DIR, { recursive: true });
        console.log('Created directory:', ITINERARIES_DIR);
    }
}

// Initialize directory when app starts
ensureDirectoryExists().catch(console.error);

contextBridge.exposeInMainWorld('api', {
    getWeather: async (location) => {
        const API_KEY = '32804b24a847407391c53709241010';
        const response = await fetch(
            `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${location}`
        );
        return response.json();
    },
    
    // File operations for itineraries
    saveItinerary: async (data) => {
        try {
            await ensureDirectoryExists(); // Ensure directory exists before saving
            const fileName = `${Date.now()}_${data.tripName.replace(/[^a-z0-9]/gi, '_')}.txt`;
            const filePath = path.join(ITINERARIES_DIR, fileName);
            
            // Add timestamp to data
            const itineraryWithTimestamp = {
                ...data,
                createdAt: new Date().toISOString(),
                id: fileName
            };
            
            await fs.writeFile(
                filePath, 
                JSON.stringify(itineraryWithTimestamp, null, 2),
                'utf8'
            );
            console.log('Saved itinerary to:', filePath);
            return itineraryWithTimestamp;
        } catch (error) {
            console.error('Error saving itinerary:', error);
            throw error;
        }
    },

    getItineraries: async () => {
        try {
            await ensureDirectoryExists();
            const files = await fs.readdir(ITINERARIES_DIR);
            const itineraries = await Promise.all(
                files
                    .filter(file => file.endsWith('.txt'))
                    .map(async file => {
                        try {
                            const content = await fs.readFile(
                                path.join(ITINERARIES_DIR, file),
                                'utf8'
                            );
                            return JSON.parse(content);
                        } catch (error) {
                            console.error(`Error reading file ${file}:`, error);
                            return null;
                        }
                    })
            );
            return itineraries.filter(item => item !== null);
        } catch (error) {
            console.error('Error reading itineraries:', error);
            return [];
        }
    },

    updateItinerary: async (id, data) => {
        try {
            const filePath = path.join(ITINERARIES_DIR, id);
            const updatedData = {
                ...data,
                id,
                updatedAt: new Date().toISOString()
            };
            await fs.writeFile(
                filePath,
                JSON.stringify(updatedData, null, 2),
                'utf8'
            );
            console.log('Updated itinerary:', filePath);
            return true;
        } catch (error) {
            console.error('Error updating itinerary:', error);
            throw error;
        }
    },

    deleteItinerary: async (id) => {
        try {
            const filePath = path.join(ITINERARIES_DIR, id);
            await fs.unlink(filePath);
            console.log('Deleted itinerary:', filePath);
            return true;
        } catch (error) {
            console.error('Error deleting itinerary:', error);
            throw error;
        }
    }
});