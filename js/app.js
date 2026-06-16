const form = document.getElementById("eventForm");
const eventsContainer = document.getElementById("eventsContainer");
const searchInput = document.getElementById("searchInput");
const exportButton = document.getElementById("exportButton");
const importFile = document.getElementById("importFile");
const nextMajlisSection = document.getElementById("nextMajlisSection");

let events = JSON.parse(localStorage.getItem("majalisEvents")) || [];
let editingIndex = null;

function getOrdinal(day) {
  if (day > 3 && day < 21) return day + "th";

  switch (day % 10) {
    case 1:
      return day + "st";
    case 2:
      return day + "nd";
    case 3:
      return day + "rd";
    default:
      return day + "th";
  }
}

function formatDate(dateValue) {
  const date = new Date(dateValue + "T00:00:00");

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long"
  });

  const month = date.toLocaleDateString("en-US", {
    month: "long"
  });

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

function getEventDateTime(event) {
  return new Date(`${event.date}T${event.time}`);
}

function cleanPhone(phone) {
  return phone.replace(/\D/g, "");
}

function saveEvents() {
  localStorage.setItem("majalisEvents", JSON.stringify(events));
}

function resetForm() {
  form.reset();
  document.getElementById("eventName").value = "Annual Majlis";
  editingIndex = null;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = "Add Majlis";

  const cancelButton = document.getElementById("cancelEditButton");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function getFilteredEvents() {
  const searchTerm = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  if (!searchTerm) {
    return [...events];
  }

  return events.filter((event) => {
    const searchableText = `
      ${event.eventName}
      ${event.venue}
      ${event.date}
      ${event.time}
      ${event.speaker}
      ${event.address}
      ${event.host}
      ${event.phone}
      ${event.notes}
    `.toLowerCase();

    return searchableText.includes(searchTerm);
  });
}

function buildWhatsAppMessage(event) {
  const speaker = event.speaker.trim() || "To Be Announced";

  const phoneSection = event.phone.trim()
    ? `Contact: ${event.phone}\n`
    : "";

  const notesSection = event.notes.trim()
    ? `Notes: ${event.notes}\n`
    : "";

  return `*${event.eventName}*
${event.venue}

${formatDate(event.date)}
Time: ${formatTime(event.time)}

Speaker: ${speaker}

Address:
${event.address}

Requested By: ${event.host}
${phoneSection}${notesSection}
DFW Hyderabadi Azadari
Moharram 2026 - 1448 Hijri`;
}

function getWhatsAppUrl(event) {
  const message = buildWhatsAppMessage(event);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function renderNextMajlis() {
  if (!nextMajlisSection) {
    return;
  }

  nextMajlisSection.innerHTML = "";

  if (events.length === 0) {
    return;
  }

  const now = new Date();

  const upcomingEvents = [...events]
    .filter((event) => getEventDateTime(event) >= now)
    .sort((a, b) => getEventDateTime(a) - getEventDateTime(b));

  if (upcomingEvents.length === 0) {
    return;
  }

  const nextEvent = upcomingEvents[0];
  const speaker = nextEvent.speaker.trim() || "To Be Announced";
  const mapUrl =
    `https://maps.google.com/?q=${encodeURIComponent(nextEvent.address)}`;
  const whatsappUrl = getWhatsAppUrl(nextEvent);

  const callButton = nextEvent.phone.trim()
    ? `
      <a href="tel:${cleanPhone(nextEvent.phone)}">
        Call
      </a>
    `
    : "";

  nextMajlisSection.innerHTML = `
    <div class="next-label">
      Next Majlis
    </div>

    <div class="next-title">
      ${nextEvent.eventName}
    </div>

    <div class="next-venue">
      ${nextEvent.venue}
    </div>

    <div class="next-details">
      <div><strong>Day:</strong> ${formatDate(nextEvent.date)}</div>
      <div><strong>Time:</strong> ${formatTime(nextEvent.time)}</div>
      <div><strong>Speaker:</strong> ${speaker}</div>
      <div><strong>Address:</strong> ${nextEvent.address}</div>
    </div>

    <div class="card-actions">
      <a href="${mapUrl}" target="_blank">
        Directions
      </a>

      ${callButton}

      <a href="${whatsappUrl}" target="_blank">
        WhatsApp
      </a>
    </div>
  `;
}

function renderEvents() {
  eventsContainer.innerHTML = "";

  renderNextMajlis();

  const filteredEvents = getFilteredEvents();

  const countElement = document.getElementById("majlisCount");

  if (countElement) {
    if (searchInput && searchInput.value.trim()) {
      countElement.textContent =
        `${filteredEvents.length} of ${events.length} Majalis Showing`;
    } else {
      countElement.textContent =
        `${events.length} Majalis Scheduled`;
    }
  }

  if (events.length === 0) {
    eventsContainer.innerHTML =
      '<p class="empty-message">No Majalis added yet.</p>';
    return;
  }

  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML =
      '<p class="empty-message">No matching Majalis found.</p>';
    return;
  }

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return getEventDateTime(a) - getEventDateTime(b);
  });

  sortedEvents.forEach((event) => {
    const originalIndex = events.indexOf(event);
    const speaker = event.speaker.trim() || "To Be Announced";
    const whatsappUrl = getWhatsAppUrl(event);

    const notesHtml = event.notes.trim()
      ? `
        <div class="event-row">
          <span class="event-label">Notes</span>
          ${event.notes}
        </div>
      `
      : "";

    const phoneHtml = event.phone.trim()
      ? `
        <div class="event-row">
          <span class="event-label">Phone</span>
          ${event.phone}
        </div>
      `
      : "";

    const callButton = event.phone.trim()
      ? `
        <a href="tel:${cleanPhone(event.phone)}">
          Call
        </a>
      `
      : "";

    const mapUrl =
      `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;

    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <div class="event-title">
        ${event.eventName}
      </div>

      <div class="event-venue">
        ${event.venue}
      </div>

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
        <a href="${mapUrl}" target="_blank">
          Directions
        </a>

        ${callButton}

        <a href="${whatsappUrl}" target="_blank">
          WhatsApp
        </a>

        <button
          type="button"
          onclick="editEvent(${originalIndex})"
        >
          Edit
        </button>

        <button
          type="button"
          class="delete-button"
          onclick="deleteEvent(${originalIndex})"
        >
          Delete
        </button>
      </div>
    `;

    eventsContainer.appendChild(card);
  });
}

function editEvent(index) {
  const event = events[index];

  document.getElementById("eventName").value = event.eventName;
  document.getElementById("venue").value = event.venue;
  document.getElementById("date").value = event.date;
  document.getElementById("time").value = event.time;
  document.getElementById("speaker").value = event.speaker;
  document.getElementById("address").value = event.address;
  document.getElementById("host").value = event.host;
  document.getElementById("phone").value = event.phone;
  document.getElementById("notes").value = event.notes;

  editingIndex = index;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = "Update Majlis";

  if (!document.getElementById("cancelEditButton")) {
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.id = "cancelEditButton";
    cancelButton.textContent = "Cancel Edit";
    cancelButton.onclick = resetForm;

    form.appendChild(cancelButton);
  }

  window.scrollTo({
    top: form.offsetTop - 20,
    behavior: "smooth"
  });
}

function deleteEvent(index) {
  if (!confirm("Delete this Majlis?")) {
    return;
  }

  events.splice(index, 1);
  saveEvents();

  if (editingIndex === index) {
    resetForm();
  }

  renderEvents();
}

function exportEvents() {
  const data = JSON.stringify(events, null, 2);

  const blob = new Blob([data], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "moharram-2026-majalis.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importEvents(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const importedEvents = JSON.parse(event.target.result);

      if (!Array.isArray(importedEvents)) {
        alert("Invalid JSON file.");
        return;
      }

      events = importedEvents;
      saveEvents();
      resetForm();
      renderEvents();

      if (searchInput) {
        searchInput.value = "";
      }

      alert("Majalis imported successfully.");
    } catch (error) {
      alert("Could not import JSON file.");
    }
  };

  reader.readAsText(file);
}

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const eventData = {
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

  if (editingIndex !== null) {
    events[editingIndex] = eventData;
  } else {
    events.push(eventData);
  }

  saveEvents();
  resetForm();
  renderEvents();
});

if (searchInput) {
  searchInput.addEventListener("input", renderEvents);
}

if (exportButton) {
  exportButton.addEventListener("click", exportEvents);
}

if (importFile) {
  importFile.addEventListener("change", function (e) {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    importEvents(file);
    importFile.value = "";
  });
}

renderEvents();