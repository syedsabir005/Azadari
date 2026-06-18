import { db, auth } from "./firebase.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const COLLECTION_NAME = "majlis";

const allowedAdmins = [
  "syedsabir005@gmail.com",
  "iamraza29@yahoo.com",
  "mohammedali8027@gmail.com"
];

const loginSection = document.getElementById("loginSection");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const adminPanel = document.getElementById("adminPanel");
const logoutButton = document.getElementById("logoutButton");
const showAdminLoginButton = document.getElementById("showAdminLogin");

const form = document.getElementById("eventForm");
const publicEventsContainer = document.getElementById("eventsContainer");
const adminEventsContainer = document.getElementById("adminEventsContainer");
const searchInput = document.getElementById("searchInput");
const exportButton = document.getElementById("exportButton");
const importFile = document.getElementById("importFile");
const nextMajlisSection = document.getElementById("nextMajlisSection");
const showPastButton = document.getElementById("showPastButton");
const pastMajalisSection = document.getElementById("pastMajalisSection");
const pastEventsContainer = document.getElementById("pastEventsContainer");
const publicSearchInput = document.getElementById("publicSearchInput");
const publicMajlisCount = document.getElementById("publicMajlisCount");
const calendarStripSection = document.getElementById("calendarStripSection");

let events = [];
let editingIndex = null;
let isAdminAuthenticated = false;

async function loadEventsFromFirebase() {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));

  events = snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));

  renderEvents();
}

function getMajlisCountText(count) {
  return count === 1
    ? "1 Majlis Scheduled"
    : `${count} Majalis Scheduled`;
}

function getSearchCountText(filteredCount, totalCount) {
  const filteredWord = filteredCount === 1 ? "Majlis" : "Majalis";
  const totalWord = totalCount === 1 ? "Majlis" : "Majalis";

  return `${filteredCount} ${filteredWord} Showing out of ${totalCount} ${totalWord}`;
}

function formatDate(dateValue) {
  const date = new Date(dateValue + "T00:00:00");
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
}

function formatFullDate(dateValue) {
  const date = new Date(dateValue + "T00:00:00");
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${weekday}, ${month} ${day}, ${year}`;
}

function formatDisplayDate(event) {
  const date = new Date(event.date + "T00:00:00");

  const weekday = date.toLocaleDateString("en-US", {
    weekday: "long"
  });

  const month = date.toLocaleDateString("en-US", {
    month: "long"
  });

  const day = date.getDate();
  const year = date.getFullYear();

  const englishDate = `${weekday} • ${month} ${day}, ${year}`;

  if (event.hijriDate && event.hijriDate.trim()) {
    return `${englishDate} • ${event.hijriDate.replace(/ḥ/g, "h").trim()}`;
  }

  return englishDate;
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

function formatDateWithHijri(event) {
  const englishDate = formatDate(event.date);

  if (event.hijriDate && event.hijriDate.trim()) {
    return `${englishDate} | ${event.hijriDate}`;
  }

  return englishDate;
}

async function populateHijriDate() {
  const dateInput = document.getElementById("date");
  const hijriInput = document.getElementById("hijriDate");

  if (!dateInput || !hijriInput || !dateInput.value) {
    return;
  }

  const [year, month, day] = dateInput.value.split("-");
  const formattedDate = `${day}-${month}-${year}`;

  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/gToH?date=${formattedDate}`
    );

    const data = await response.json();

    if (!data || !data.data || !data.data.hijri) {
      return;
    }

    const hijri = data.data.hijri;

    hijriInput.value =
      `${hijri.day} ${hijri.month.en} ${hijri.year}H`;
  } catch (error) {
    console.error("Unable to fetch Hijri date", error);
  }
}

function formatAuditDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getCurrentAdminEmail() {
  return auth.currentUser && auth.currentUser.email
    ? auth.currentUser.email.toLowerCase()
    : "unknown";
}

function getEventDateTime(event) {
  return new Date(`${event.date}T${event.time}`);
}

function isSameDate(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isEventToday(event) {
  return isSameDate(getEventDateTime(event), new Date());
}

function cleanPhone(phone) {
  return phone.replace(/\D/g, "");
}

function resetForm() {
  if (!form) return;

  form.reset();

  document.getElementById("eventName").value = "Annual Majlis";
  document.getElementById("majlisTitle").value = "";
  document.getElementById("hijriDate").value = "";

  editingIndex = null;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = "Add Majlis";

  const cancelButton = document.getElementById("cancelEditButton");
  if (cancelButton) {
    cancelButton.remove();
  }
}

function getSortedEvents(eventList) {
  return [...eventList].sort((a, b) => {
    return getEventDateTime(a) - getEventDateTime(b);
  });
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
      ${event.majlisTitle}
      ${event.hijriDate}
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

function getCityFromAddress(address) {
  if (!address) return "";

  const parts = address.split(",").map((part) => part.trim());

  if (parts.length >= 2) {
    return parts[1];
  }

  return "";
}

function buildWhatsAppMessage(event) {
  const lines = [];

  if (event.eventName && event.eventName.trim()) {
    lines.push(`*${event.eventName.trim()}*`);
  }

  if (event.majlisTitle && event.majlisTitle.trim()) {
    lines.push(`_${event.majlisTitle.trim()}_`);
  }

  if (event.date) {
    lines.push(`*${formatFullDate(event.date)}*`);
  }

  if (event.hijriDate && event.hijriDate.trim()) {
    lines.push(`*${event.hijriDate.trim()}*`);
  }

  if (event.time) {
    lines.push(`*Time: ${formatTime(event.time)}*`);
  }

  if (event.speaker && event.speaker.trim()) {
    lines.push(`Speaker: ${event.speaker.trim()}`);
  }

  if (event.address && event.address.trim()) {
    lines.push(`Address:\n${event.address.trim()}`);
  }

  if (event.host && event.host.trim()) {
    lines.push(`Requested By: ${event.host.trim()}`);
  }

  if (event.phone && event.phone.trim()) {
    lines.push(`Contact: ${event.phone.trim()}`);
  }

  if (event.notes && event.notes.trim()) {
    lines.push(`Notes: ${event.notes.trim()}`);
  }

  return lines.join("\n\n");
}

function getWhatsAppUrl(event) {
  const message = buildWhatsAppMessage(event);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function formatCalendarDateTime(event) {
  const startDate = new Date(`${event.date}T${event.time}`);
  const endDate = new Date(startDate);

  endDate.setHours(endDate.getHours() + 2);

  function toGoogleCalendarString(date) {
    return date
      .toISOString()
      .replace(/[-:]/g, "")
      .split(".")[0] + "Z";
  }

  return {
    startDate,
    endDate,
    googleStart: toGoogleCalendarString(startDate),
    googleEnd: toGoogleCalendarString(endDate)
  };
}

function getCalendarTitle(event) {
  return event.majlisTitle && event.majlisTitle.trim()
    ? event.majlisTitle
    : event.eventName;
}

function getCalendarDetails(event) {
  const speaker = event.speaker && event.speaker.trim()
    ? event.speaker
    : "To Be Announced";

  return `Event: ${event.eventName}
Date: ${formatDateWithHijri(event)}
Time: ${formatTime(event.time)}
Speaker: ${speaker}
Host: ${event.host || ""}
DFW Hyderabadi Azadari`;
}

function getGoogleCalendarUrl(event) {
  const dateTime = formatCalendarDateTime(event);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(getCalendarTitle(event))}&dates=${dateTime.googleStart}/${dateTime.googleEnd}&details=${encodeURIComponent(getCalendarDetails(event))}&location=${encodeURIComponent(event.address)}`;
}

function getICalendarUrl(event) {
  const dateTime = formatCalendarDateTime(event);

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DFW Hyderabadi Azadari//Majalis Schedule//EN
BEGIN:VEVENT
UID:${event.id || Date.now()}@dfwhyderabadiazadari
DTSTAMP:${dateTime.googleStart}
DTSTART:${dateTime.googleStart}
DTEND:${dateTime.googleEnd}
SUMMARY:${getCalendarTitle(event)}
DESCRIPTION:${getCalendarDetails(event).replace(/\n/g, "\\n")}
LOCATION:${event.address}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], {
    type: "text/calendar"
  });

  return URL.createObjectURL(blob);
}

function getActionButtons(event, originalIndex, includeAdminButtons) {
  const mapUrl =
    `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;
  const whatsappUrl = getWhatsAppUrl(event);
  const googleCalendarUrl = getGoogleCalendarUrl(event);
  const iCalendarUrl = getICalendarUrl(event);

  const callButton = includeAdminButtons && event.phone.trim()
    ? `<a href="tel:${cleanPhone(event.phone)}">Call</a>`
    : "";

  const adminButtons = includeAdminButtons
    ? `
        ${callButton}
        <a href="${googleCalendarUrl}" target="_blank">Google Calendar</a>
        <a href="${iCalendarUrl}" download="${getCalendarTitle(event)}.ics">iCal</a>
        <button type="button" onclick="editEvent(${originalIndex})">Edit</button>
        <button type="button" class="delete-button" onclick="deleteEvent(${originalIndex})">Delete</button>
      `
    : "";

  return `
      <div class="card-actions">
        <a href="${mapUrl}" target="_blank">Directions</a>
        <a href="${whatsappUrl}" target="_blank">WhatsApp</a>
        <button type="button" onclick="shareMajlis(${originalIndex})">Share</button>
        ${adminButtons}
      </div>
    `;
}

function renderNextMajlis() {
  if (!nextMajlisSection) return;

  nextMajlisSection.innerHTML = "";

  if (events.length === 0) return;

  const now = new Date();

  const upcomingEvents = getSortedEvents(events)
    .filter((event) => getEventDateTime(event) >= now);

  if (upcomingEvents.length === 0) return;

  const nextEvent = upcomingEvents[0];
  const originalIndex = events.indexOf(nextEvent);
  const speaker = nextEvent.speaker && nextEvent.speaker.trim()
    ? nextEvent.speaker.trim()
    : "";
  
  const nextTodayBadge = isEventToday(nextEvent)
    ? `<span class="today-badge">Today</span>`
    : "";

  nextMajlisSection.innerHTML = `
    <div class="next-top-row">
      <div class="next-indicator">Next Majlis</div>
      <div class="next-top-actions">
        ${nextTodayBadge}
        <div class="countdown" id="countdown"></div>
      </div>
    </div>

    <div class="next-title">
      ${nextEvent.eventName}
    </div>

    ${
      nextEvent.majlisTitle && nextEvent.majlisTitle.trim()
        ? `<div class="next-subtitle">${nextEvent.majlisTitle}</div>`
        : ""
    }

    <div class="next-date-line">
      ${formatDisplayDate(nextEvent)}
    </div>

    <div class="next-meta">
      <div><strong>Time:</strong> ${formatTime(nextEvent.time)}</div>
      ${speaker ? `<div><strong>Speaker:</strong> ${speaker}</div>` : ""}
      ${
        nextEvent.host && nextEvent.host.trim()
          ? `<div><strong>Requested By:</strong> ${nextEvent.host.trim()}</div>`
          : ""
      }
      <div><strong>Address:</strong> ${nextEvent.address}</div>
    </div>

    ${getActionButtons(nextEvent, originalIndex, false)}
  `;

  renderCountdown(nextEvent);
}

function renderCountdown(event) {
  const countdownElement = document.getElementById("countdown");

  if (!countdownElement) return;

  function updateCountdown() {
    const target = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const difference = target.getTime() - now.getTime();

    if (difference <= 0) {
      countdownElement.textContent = "Majlis In Progress";
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    const minutes = Math.floor(
      (difference % (1000 * 60 * 60)) / (1000 * 60)
    );

    countdownElement.textContent =
        `Starts in ${days}d ${hours}h ${minutes}m`; 
  }

  updateCountdown();
  setInterval(updateCountdown, 60000);
}

function buildEventCard(event, includeAdminTools) {
  const originalIndex = events.indexOf(event);
  const speaker = event.speaker && event.speaker.trim()
    ? event.speaker.trim()
    : "";
  const isPastEvent = getEventDateTime(event) < new Date();
  const todayBadge = isEventToday(event)
    ? `<span class="today-badge">Today</span>`
    : "";

  const majlisTitleHtml =
    event.majlisTitle && event.majlisTitle.trim()
      ? `<div class="event-subtitle">${event.majlisTitle}</div>`
      : "";

  const city = getCityFromAddress(event.address);
  
  const phoneLine = includeAdminTools && event.phone.trim()
    ? `<div><strong>Phone:</strong> ${event.phone}</div>`
    : "";

  const hostLine = event.host && event.host.trim()
    ? `<div class="requested-line"><strong>Requested By:</strong> ${event.host.trim()}</div>`
    : "";

  const notesLine = event.notes.trim()
    ? `<div><strong>Notes:</strong> ${event.notes}</div>`
    : "";

  const hasAudit =
    event.createdBy ||
    event.createdAt ||
    event.updatedBy ||
    event.updatedAt;

  const auditHtml = includeAdminTools && hasAudit
    ? `
      <div class="audit-info">
        <div><strong>Created By:</strong> ${event.createdBy || "Not available"}</div>
        <div><strong>Created At:</strong> ${formatAuditDate(event.createdAt)}</div>
        <div><strong>Last Updated By:</strong> ${event.updatedBy || "Not available"}</div>
        <div><strong>Last Updated:</strong> ${formatAuditDate(event.updatedAt)}</div>
      </div>
    `
    : "";

  const publicTitleHtml = `
    <div class="event-title">${event.eventName}</div>
    ${
      event.majlisTitle && event.majlisTitle.trim()
        ? `<div class="event-subtitle">${event.majlisTitle}</div>`
        : ""
    }
  `;

  const adminTitleHtml = `
    <div class="event-title">${event.eventName}</div>
    ${
      event.majlisTitle && event.majlisTitle.trim()
        ? `<div class="event-subtitle">${event.majlisTitle}</div>`
        : ""
    }
  `;

  const publicPastButtons = isPastEvent && !includeAdminTools
    ? ""
    : getActionButtons(event, originalIndex, includeAdminTools);

  const card = document.createElement("div");
  card.className = "event-card compact-event-card schedule-card";
  card.setAttribute("data-event-date", event.date);

  card.innerHTML = `
      <div class="card-title-row">
        <div>
          ${includeAdminTools ? adminTitleHtml : publicTitleHtml}
        </div>
        ${todayBadge}
      </div>

    <div class="compact-date-line">
      ${formatDisplayDate(event)}
    </div>

    <div class="compact-meta">
      <div><strong>Time:</strong> ${formatTime(event.time)}</div>
      ${speaker ? `<div><strong>Speaker:</strong> ${speaker}</div>` : ""}
      ${hostLine}
      ${city ? `<div class="city-line"><strong>Location:</strong> ${city}</div>` : ""}
      <div><strong>Address:</strong> ${event.address}</div>
      ${phoneLine}
      ${notesLine}
    </div>

    ${auditHtml}

    ${publicPastButtons}
  `;

  return card;
}

function renderCalendarStrip() {
  if (!calendarStripSection) return;

  const upcomingEvents = getSortedEvents(events)
    .filter((event) => getEventDateTime(event) >= new Date());

  const dates = [...new Set(
    upcomingEvents.map((event) => event.date)
  )];

  if (dates.length === 0) {
    calendarStripSection.innerHTML = "";
    return;
  }

  calendarStripSection.innerHTML = `
      <div class="calendar-strip-title">
        Moharram Dates
      </div>

      <div class="calendar-strip">
        ${dates.slice(0, 10).map((dateValue) => {
          const date = new Date(dateValue + "T00:00:00");

          const weekday = date.toLocaleDateString(
            "en-US",
            { weekday: "short" }
          );

          const day = date.toLocaleDateString(
            "en-US",
            { day: "numeric" }
          );

          const month = date.toLocaleDateString(
            "en-US",
            { month: "short" }
          );

          return `
            <button
              type="button"
              class="calendar-date ${
                isSameDate(new Date(dateValue + "T00:00:00"), new Date())
                  ? "calendar-date-today"
                  : ""
              }"
              onclick="scrollToDate('${dateValue}')"
            >
              <span>${weekday}</span>
              <strong>${day}</strong>
              <small>${month}</small>
            </button>
          `;
        }).join("")}
      </div>
    `;
}

function getPublicFilteredEvents(eventList) {
  const searchTerm = publicSearchInput
    ? publicSearchInput.value.trim().toLowerCase()
    : "";

  if (!searchTerm) {
    return eventList;
  }

  return eventList.filter((event) => {
    const searchableText = `
      ${event.eventName || ""}
      ${event.majlisTitle || ""}
      ${event.hijriDate || ""}
      ${event.venue || ""}
      ${event.date || ""}
      ${event.time || ""}
      ${event.speaker || ""}
      ${event.address || ""}
      ${event.host || ""}
      ${event.notes || ""}
    `.toLowerCase();

    return searchableText.includes(searchTerm);
  });
}

function renderPublicEvents() {
  if (!publicEventsContainer) return;

  publicEventsContainer.innerHTML = "";

  if (pastEventsContainer) {
    pastEventsContainer.innerHTML = "";
  }

  const now = new Date();

  const upcomingEvents = getSortedEvents(events).filter((event) => {
    return getEventDateTime(event) >= now;
  });

  const pastEvents = getSortedEvents(events).filter((event) => {
    return getEventDateTime(event) < now;
  });

  const filteredUpcomingEvents =
    getPublicFilteredEvents(upcomingEvents);

  if (publicMajlisCount) {
    const upcomingWord =
      filteredUpcomingEvents.length === 1 ? "Majlis" : "Majalis";

    if (publicSearchInput && publicSearchInput.value.trim()) {
      publicMajlisCount.textContent =
        `${filteredUpcomingEvents.length} Upcoming ${upcomingWord} Found`;
    } else {
      publicMajlisCount.textContent =
        `${upcomingEvents.length} Upcoming ${upcomingEvents.length === 1 ? "Majlis" : "Majalis"}`;
    }
  }

  if (upcomingEvents.length === 0) {
    publicEventsContainer.innerHTML =
      '<p class="empty-message">No upcoming Majalis.</p>';
  } else if (filteredUpcomingEvents.length === 0) {
    publicEventsContainer.innerHTML =
      '<p class="empty-message">No matching upcoming Majalis found.</p>';
  } else {
    filteredUpcomingEvents.forEach((event) => {
      publicEventsContainer.appendChild(
        buildEventCard(event, false)
      );
    });
  }

  if (pastEventsContainer) {
    if (pastEvents.length === 0) {
      pastEventsContainer.innerHTML =
        '<p class="empty-message">No past Majalis.</p>';
    } else {
      pastEvents.forEach((event) => {
        pastEventsContainer.appendChild(
          buildEventCard(event, false)
        );
      });
    }
  }

  if (showPastButton) {
    showPastButton.style.display =
      pastEvents.length > 0 ? "inline-block" : "none";

    showPastButton.textContent =
      pastEvents.length === 1
        ? "Show Past Majlis (1)"
        : `Show Past Majalis (${pastEvents.length})`;
  }
}

function renderAdminEvents() {
  if (!adminEventsContainer || !isAdminAuthenticated) return;

  adminEventsContainer.innerHTML = "";

  const filteredEvents = getFilteredEvents();
  const countElement = document.getElementById("majlisCount");

  if (countElement) {
    if (searchInput && searchInput.value.trim()) {
      countElement.textContent =
        getSearchCountText(filteredEvents.length, events.length);
    } else {
      countElement.textContent =
        getMajlisCountText(events.length);
    }
  }

  if (events.length === 0) {
    adminEventsContainer.innerHTML =
      '<p class="empty-message">No Majalis added yet.</p>';
    return;
  }

  if (filteredEvents.length === 0) {
    adminEventsContainer.innerHTML =
      '<p class="empty-message">No matching Majalis found.</p>';
    return;
  }

  getSortedEvents(filteredEvents).forEach((event) => {
    adminEventsContainer.appendChild(
      buildEventCard(event, true)
    );
  });
}

function renderEvents() {
  renderCalendarStrip();
  renderNextMajlis();
  renderPublicEvents();
  renderAdminEvents();
}

window.editEvent = function editEvent(index) {
  if (!isAdminAuthenticated) return;

  const event = events[index];

  document.getElementById("eventName").value = event.eventName;
  document.getElementById("majlisTitle").value = event.majlisTitle || "";
  document.getElementById("hijriDate").value = event.hijriDate || "";
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
};

window.copyInvite = function copyInvite(index) {
  const event = events[index];

  navigator.clipboard.writeText(
    buildWhatsAppMessage(event)
  );
};

window.shareMajlis = async function shareMajlis(index) {
  const event = events[index];
  const shareText = buildWhatsAppMessage(event);

  if (navigator.share) {
    try {
      await navigator.share({
        title: event.majlisTitle || event.eventName,
        text: shareText,
        url: window.location.href
      });
    } catch (error) {
      // Share cancelled
    }
  } else {
    navigator.clipboard.writeText(shareText);
    alert("Majlis details copied");
  }
};

window.scrollToDate = function scrollToDate(dateValue) {
  const target = document.querySelector(`[data-event-date="${dateValue}"]`);

  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};

window.deleteEvent = async function deleteEvent(index) {
  if (!isAdminAuthenticated) return;

  if (!confirm("Delete this Majlis?")) return;

  const event = events[index];

  await deleteDoc(doc(db, COLLECTION_NAME, event.id));

  if (editingIndex === index) {
    resetForm();
  }

  await loadEventsFromFirebase();
};

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

async function importEvents(file) {
  const reader = new FileReader();

  reader.onload = async function (event) {
    try {
      const importedEvents = JSON.parse(event.target.result);

      if (!Array.isArray(importedEvents)) {
        alert("Invalid JSON file.");
        return;
      }

      const now = new Date().toISOString();
      const adminEmail = getCurrentAdminEmail();

      for (const item of importedEvents) {
        const cleanItem = {
          eventName: item.eventName || "",
          majlisTitle: item.majlisTitle || "",
          hijriDate: item.hijriDate || "",
          venue: item.venue || "",
          date: item.date || "",
          time: item.time || "",
          speaker: item.speaker || "",
          address: item.address || "",
          host: item.host || "",
          phone: item.phone || "",
          notes: item.notes || "",
          createdBy: item.createdBy || adminEmail,
          createdAt: item.createdAt || now,
          updatedBy: adminEmail,
          updatedAt: now
        };

        await addDoc(collection(db, COLLECTION_NAME), cleanItem);
      }

      resetForm();

      if (searchInput) {
        searchInput.value = "";
      }

      await loadEventsFromFirebase();
      alert("Majalis imported successfully.");
    } catch (error) {
      alert("Could not import JSON file.");
    }
  };

  reader.readAsText(file);
}

if (form) {
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!isAdminAuthenticated) return;

    const now = new Date().toISOString();
    const adminEmail = getCurrentAdminEmail();

    const eventData = {
      eventName: document.getElementById("eventName").value,
      majlisTitle: document.getElementById("majlisTitle").value,
      hijriDate: document.getElementById("hijriDate").value,
      venue: document.getElementById("venue").value,
      date: document.getElementById("date").value,
      time: document.getElementById("time").value,
      speaker: document.getElementById("speaker").value,
      address: document.getElementById("address").value,
      host: document.getElementById("host").value,
      phone: document.getElementById("phone").value,
      notes: document.getElementById("notes").value,
      updatedBy: adminEmail,
      updatedAt: now
    };

    if (editingIndex !== null) {
      const event = events[editingIndex];

      await updateDoc(
        doc(db, COLLECTION_NAME, event.id),
        eventData
      );
    } else {
      await addDoc(
        collection(db, COLLECTION_NAME),
        {
          ...eventData,
          createdBy: adminEmail,
          createdAt: now
        }
      );
    }

    resetForm();
    await loadEventsFromFirebase();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", renderAdminEvents);
}

if (exportButton) {
  exportButton.addEventListener("click", exportEvents);
}

if (importFile) {
  importFile.addEventListener("change", function (e) {
    const file = e.target.files[0];

    if (!file) return;

    importEvents(file);
    importFile.value = "";
  });
}

const dateInput = document.getElementById("date");

if (dateInput) {
  dateInput.addEventListener("change", populateHijriDate);
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      loginError.textContent = "";

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (error) {
      loginError.textContent = "Invalid email or password.";
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async function () {
    await signOut(auth);
  });
}

if (showAdminLoginButton) {
  showAdminLoginButton.addEventListener("click", function (e) {
    e.preventDefault();

    if (loginSection) loginSection.style.display = "block";
    if (showAdminLoginButton) showAdminLoginButton.style.display = "none";
  });
}

onAuthStateChanged(auth, async function (user) {
  const userEmail = user ? user.email.toLowerCase() : "";

  if (!user || !allowedAdmins.includes(userEmail)) {
    isAdminAuthenticated = false;

    if (loginSection) loginSection.style.display = "none";
    if (adminPanel) adminPanel.style.display = "none";
    if (showAdminLoginButton) {
      showAdminLoginButton.style.display = "inline";
    }

    if (user && !allowedAdmins.includes(userEmail)) {
      loginError.textContent = "You are not authorized to access admin.";
      await signOut(auth);
    }

    renderEvents();
    return;
  }

  isAdminAuthenticated = true;

  if (loginSection) loginSection.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
  if (showAdminLoginButton) {
    showAdminLoginButton.style.display = "none";
  }

  await loadEventsFromFirebase();
});

function initAddressAutocomplete() {
  const addressInput = document.getElementById("address");

  if (!addressInput || !window.google) return;

  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    types: ["address"],
    componentRestrictions: {
      country: "us"
    }
  });

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();

    if (place && place.formatted_address) {
      addressInput.value = place.formatted_address;
    }
  });
}

window.initAddressAutocomplete = initAddressAutocomplete;

if (showPastButton) {
  showPastButton.addEventListener("click", function () {
    const pastCount = pastEventsContainer
      ? pastEventsContainer.children.length
      : 0;

    if (pastMajalisSection.style.display === "none") {
      pastMajalisSection.style.display = "block";

      showPastButton.textContent = 
        pastCount === 1
          ? "Hide Past Majlis (1)"
          : `Hide Past Majalis (${pastCount})`;
    } else {
      pastMajalisSection.style.display = "none";

      showPastButton.textContent = 
        pastCount === 1
          ? "Show Past Majlis (1)"
          : `Show Past Majalis (${pastCount})`;
    }
  });
}

loadEventsFromFirebase();