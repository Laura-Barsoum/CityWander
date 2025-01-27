const eventList = document.getElementById("events-container");

// Replace 'YOUR_API_TOKEN' with your actual Eventbrite API token
fetch('https://www.eventbriteapi.com/v3/events/search/?location.address=Cairo&token=D6OPE4DWYUDGV4X4IDZ4')
  .then(response => {
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    const events = data.events; // Eventbrite returns events in `data.events`
    if (events && events.length > 0) {
      events.forEach(event => {
        const listItem = document.createElement("div");
        listItem.classList.add("event-item");
        listItem.innerHTML = `
          <h3>${event.name.text}</h3>
          <p>${event.description.text || "No description available."}</p>
          <p>Date: ${new Date(event.start.local).toLocaleDateString()}</p>
        `;
        eventList.appendChild(listItem);
      });
    } else {
      eventList.innerHTML = "<p>No events found in Cairo.</p>";
    }
  })
  .catch(error => console.error("Error fetching events:", error));
