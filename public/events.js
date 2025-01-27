// Main script for handling Eventbrite events
const EVENTBRITE_API_KEY = 'AJ3R6N6WA5XJSNTNKE';
const CAIRO_VENUE = 'Cairo, Egypt';

// Fetch events from Eventbrite API
async function fetchEventbriteEvents() {
    try {
        const response = await fetch(`https://www.eventbriteapi.com/v3/events/search/?token=${EVENTBRITE_API_KEY}&location.address=${encodeURIComponent(CAIRO_VENUE)}&expand=venue,category`, {
            headers: {
                'Authorization': `Bearer ${EVENTBRITE_API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        return data.events;
    } catch (error) {
        console.error('Error fetching Eventbrite events:', error);
        return [];
    }
}

// Create event card
function createEventCard(event) {
    const startDate = new Date(event.start.local);
    const endDate = new Date(event.end.local);
    
    // Format date and time
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    const formattedDate = startDate.toLocaleDateString('en-US', dateOptions);
    const formattedTime = `${startDate.toLocaleTimeString('en-US', timeOptions)} - ${endDate.toLocaleTimeString('en-US', timeOptions)}`;

    return `
        <div class="event-item" data-aos="fade-up" data-category="${event.category_id || 'uncategorized'}">
            <div class="event-image">
                ${event.logo ? 
                    `<img src="${event.logo.url}" alt="${event.name.text}" loading="lazy">` :
                    `<img src="/api/placeholder/400/200" alt="Event placeholder" loading="lazy">`
                }
            </div>
            <div class="event-content">
                <div class="event-status ${event.status}">${event.status.toUpperCase()}</div>
                <h3>${event.name.text}</h3>
                <div class="event-details">
                    <p><i class="far fa-calendar"></i> ${formattedDate}</p>
                    <p><i class="far fa-clock"></i> ${formattedTime}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${event.venue ? event.venue.name : 'Location TBA'}</p>
                    ${event.category ? 
                        `<p><i class="fas fa-tag"></i> ${event.category.name}</p>` : 
                        ''
                    }
                </div>
                <p class="event-description">${event.description.text.slice(0, 150)}...</p>
                <div class="event-price">
                    ${event.is_free ? 
                        '<p><i class="fas fa-ticket-alt"></i> Free Event</p>' :
                        '<p><i class="fas fa-ticket-alt"></i> Paid Event</p>'
                    }
                </div>
                <a href="${event.url}" target="_blank" class="book-btn">Get Tickets</a>
            </div>
        </div>
    `;
}

// Initialize filter controls
function initializeFilters(events) {
    const categories = new Set();
    events.forEach(event => {
        if (event.category) {
            categories.add(event.category.name);
        }
    });

    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-controls';
    filterContainer.innerHTML = `
        <h3>Filter Events</h3>
        <div class="filter-buttons" data-aos="fade-up">
            <button class="filter-btn active" data-category="all">All Events</button>
            ${Array.from(categories).map(category => `
                <button class="filter-btn" data-category="${category}">${category}</button>
            `).join('')}
        </div>
    `;

    return filterContainer;
}

// Initialize search functionality
function initializeSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <div class="search-box" data-aos="fade-up">
            <input type="text" id="event-search" placeholder="Search events...">
            <button class="search-btn"><i class="fas fa-search"></i></button>
        </div>
    `;

    return searchContainer;
}

// Main function to display events
async function displayEventbriteEvents() {
    const eventList = document.querySelector('.event-list');
    
    // Show loading state
    eventList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading events...</p>
        </div>
    `;

    try {
        const events = await fetchEventbriteEvents();
        
        if (!events || events.length === 0) {
            eventList.innerHTML = `
                <div class="no-events">
                    <h3>No Events Found</h3>
                    <p>There are currently no events listed in Cairo. Please check back later.</p>
                </div>
            `;
            return;
        }

        // Clear loading state
        eventList.innerHTML = '';

        // Add search functionality
        const searchContainer = initializeSearch();
        eventList.parentElement.insertBefore(searchContainer, eventList);

        // Add filter controls
        const filterControls = initializeFilters(events);
        eventList.parentElement.insertBefore(filterControls, eventList);

        // Display events
        events.forEach(event => {
            eventList.innerHTML += createEventCard(event);
        });

        // Initialize filtering and search functionality
        initializeEventListeners(events);

    } catch (error) {
        console.error('Error:', error);
        eventList.innerHTML = `
            <div class="error-message">
                <h3>Oops! Something went wrong</h3>
                <p>We couldn't load the events at this time. Please try again later.</p>
            </div>
        `;
    }
}

// Initialize event listeners
function initializeEventListeners(events) {
    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('event-search');
    const eventItems = document.querySelectorAll('.event-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filterEvents();
        });
    });

    searchInput.addEventListener('input', filterEvents);

    function filterEvents() {
        const selectedCategory = document.querySelector('.filter-btn.active').dataset.category;
        const searchTerm = searchInput.value.toLowerCase();

        eventItems.forEach(item => {
            const event = events.find(e => e.name.text === item.querySelector('h3').textContent);
            const matchesCategory = selectedCategory === 'all' || 
                                  (event.category && event.category.name === selectedCategory);
            const matchesSearch = event.name.text.toLowerCase().includes(searchTerm) ||
                                event.description.text.toLowerCase().includes(searchTerm);

            if (matchesCategory && matchesSearch) {
                item.style.display = 'block';
                item.dataset.aos = 'fade-up';
            } else {
                item.style.display = 'none';
                item.dataset.aos = '';
            }
        });

        AOS.refresh();
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    displayEventbriteEvents();
});