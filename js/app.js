const form = document.getElementById("eventForm");
const eventsContainer = document.getElementById("eventsContainer");

let events = JSON.parse(localStorage.getItem("majalisEvents")) || [];

function getOrdinal(day) {
  if (day > 3 && day < 21) return day + "th";
  switch (day % 10) {
    case 1: return day + "st";
    case 2: return day + "nd";
    case 3: return day + "rd";
    default: return day + "th";
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue + "T00:00:00");
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = getOrdinal(date.getDate());
  const year = date.getFullYear();

  return `${weekday}, ${month} ${day}, ${year}`;
}

function formatTime(timeValue) {
  const [hour, minute] = timeValue.split(":");
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function cleanPhone(phone) {
  return phone.replace(/\D/g, "");
}

function renderEvents() {
  eventsContainer.innerHTML = "";

  if (events.length === 0) {
    eventsContainer.innerHTML = '<p class="empty-message">No Majalis added yet.</p>';
    return;
  }

  events.forEach((event) => {
    const speaker = event.speaker.trim() || "To Be Announced";
    const notesHtml = event.notes.trim()
      ? `<div class="event-row"><span class="event-label">Notes</span>${event.notes}</div>`
      : "";

    const phoneHtml = event.phone.trim()
      ? `<div class="event-row"><span class="event-label">Phone</span>${event.phone}</div>`
      : "";

    const callButton = event.phone.trim()
      ? `<a href="tel:${cleanPhone(event.phone)}">Call</a>`
      : "";

    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;

    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-title">${event.eventName}</div>
      <div class="event-venue">${event.venue}</div>

      <div class="event-row">
        <span class="event-label">Day</span>
        ${formatDate(event.date)}
      </div>

      <div class="event-row">
        <span class="event-label">Time</span>
        ${formatTime(event.time)}
      </div>

      <div class="event-row">
        <span class="event-label">Speaker</span>
        ${speaker}
      </div>

      <div class="event-row">
        <span class="event-label">Address</span>
        ${event.address}
      </div>

      <div class="event-row">
        <span class="event-label">Host</span>
        ${event.host}
      </div>

      ${phoneHtml}
      ${notesHtml}

      <div class="card-actions">
        <a href="${mapUrl}" target="_blank">Directions</a>
        ${callButton}
      </div>
    `;

    eventsContainer.appendChild(card);
  });
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const newEvent = {
    eventName: document.getElementById("eventName").value,
    venue: document.getElementById("venue").value,
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    speaker: document.getElementById("speaker").value,
    address: document.getElementById("address").value,
    host: document.getElementById("host").value,
    phone: document.getElementById("phone").value,
    notes: document.getElementById("notes").value
  };

  events.push(newEvent);
  localStorage.setItem("majalisEvents", JSON.stringify(events));

  form.reset();
  document.getElementById("eventName").value = "Annual Majlis";

  renderEvents();
});

renderEvents();
