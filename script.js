// LifeDrop: Firebase Firestore version
// Replace the Firebase config values with your own.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJP5klJCOKERWmUo5ezpA32QOhfvdqxsI",
  authDomain: "life-drop326.firebaseapp.com",
  projectId: "life-drop326",
  storageBucket: "life-drop326.firebasestorage.app",
  messagingSenderId: "383053839156",
  appId: "1:383053839156:web:282ff099abeefdf9390361",
  measurementId: "G-PLRG8XDVY5"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let donors = [];
let bookings = [];

const donorCollection = collection(db, "donors");
const bookingCollection = collection(db, "bookings");

function element(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function updateDropdowns() {
  const options =
    '<option value="">Select Donor</option>' +
    donors.map(d =>
      `<option value="${escapeHTML(d.id)}">${escapeHTML(d.name)}</option>`
    ).join("");

  if (element("donorSelect")) {
    element("donorSelect").innerHTML = options;
  }

  if (element("eligibilityDonor")) {
    element("eligibilityDonor").innerHTML = options;
  }
}

function updateWebsite() {
  updateDropdowns();

  if (element("total")) {
    element("total").textContent = donors.length;
  }

  if (element("booked")) {
    element("booked").textContent = bookings.length;
  }

  if (element("pending")) {
    element("pending").textContent =
      donors.filter(d => d.screening === "Pending").length;
  }

  if (element("completed")) {
    element("completed").textContent =
      donors.filter(d => d.donation === "Completed").length;
  }

  if (element("screeningTable")) {
    element("screeningTable").innerHTML = donors.map(d => `
      <tr>
        <td>${escapeHTML(d.name)}</td>
        <td>${escapeHTML(d.blood)}</td>
        <td class="status">${escapeHTML(d.screening)}</td>
        <td>
          <select onchange="changeScreening('${escapeHTML(d.id)}', this.value)">
            <option ${d.screening === "Pending" ? "selected" : ""}>Pending</option>
            <option ${d.screening === "Approved" ? "selected" : ""}>Approved</option>
            <option ${d.screening === "Not Eligible" ? "selected" : ""}>Not Eligible</option>
          </select>
        </td>
      </tr>
    `).join("") ||
    '<tr><td colspan="4">No donors registered yet.</td></tr>';
  }

  if (element("queueTable")) {
    element("queueTable").innerHTML = bookings.map(b => {
      const donor = donors.find(d => d.id === b.donorId);
      const donorName = donor ? donor.name : "Donor record unavailable";

      return `
        <tr>
          <td>${escapeHTML(b.token)}</td>
          <td>${escapeHTML(donorName)}</td>
          <td>${escapeHTML(b.date)}<br>${escapeHTML(b.time)}</td>
          <td>
            <select onchange="changeQueue('${escapeHTML(b.donorId)}', this.value)">
              <option ${b.queue === "Waiting" ? "selected" : ""}>Waiting</option>
              <option ${b.queue === "Called" ? "selected" : ""}>Called</option>
              <option ${b.queue === "Finished" ? "selected" : ""}>Finished</option>
            </select>
          </td>
        </tr>
      `;
    }).join("") ||
    '<tr><td colspan="4">No bookings available.</td></tr>';
  }

  if (element("donationTable")) {
    element("donationTable").innerHTML = donors.map(d => `
      <tr>
        <td>${escapeHTML(d.name)}</td>
        <td class="status">${escapeHTML(d.donation)}</td>
        <td>
          <select onchange="changeDonation('${escapeHTML(d.id)}', this.value)">
            <option ${d.donation === "Not Started" ? "selected" : ""}>Not Started</option>
            <option ${d.donation === "In Progress" ? "selected" : ""}>In Progress</option>
            <option ${d.donation === "Completed" ? "selected" : ""}>Completed</option>
          </select>
        </td>
      </tr>
    `).join("") ||
    '<tr><td colspan="3">No donors available.</td></tr>';
  }
}

async function registerDonor(event) {
  event.preventDefault();

  const donor = {
    name: element("name").value.trim(),
    email: element("email").value.trim(),
    phone: element("phone").value.trim(),
    blood: element("blood").value,
    screening: "Pending",
    donation: "Not Started",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(donorCollection, donor);

    element("donorForm").reset();

    alert("Donor registered and saved to Firebase!");
  } catch (error) {
    console.error("Donor save failed:", error);

    alert("Could not save donor. Check the browser Console and Firestore rules.");
  }
}

async function bookSlot(event) {
  event.preventDefault();

  const donorId = element("donorSelect").value;
  const date = element("date").value;
  const time = element("time").value;

  const donor = donors.find(d => d.id === donorId);

  if (!donor) {
    alert("Please select a donor.");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (new Date(date + "T00:00:00") < today) {
    alert("Please select today or a future date.");
    return;
  }

  if (bookings.some(b => b.donorId === donorId)) {
    alert("This donor already has a booking.");
    return;
  }

  if (bookings.some(b => b.date === date && b.time === time)) {
    alert("This time slot is already booked. Please choose another slot.");
    return;
  }

  const booking = {
    donorId,
    date,
    time,
    token: bookings.length + 1,
    queue: "Waiting",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(bookingCollection, booking);

    element("bookingForm").reset();

    alert("Slot booked and saved to Firebase!");
  } catch (error) {
    console.error("Booking save failed:", error);

    alert("Could not save booking. Check the browser Console and Firestore rules.");
  }
}

async function submitEligibility(event) {
  event.preventDefault();

  if (
    !element("q1").checked ||
    !element("q2").checked ||
    !element("q3").checked
  ) {
    alert("Please confirm all three statements.");
    return;
  }

  const donorId = element("eligibilityDonor")?.value;

  if (donorId) {
    try {
      await updateDoc(doc(db, "donors", donorId), {
        eligibilityQuestionnaire: "Submitted",
        eligibilitySubmittedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Eligibility save failed:", error);

      alert("Questionnaire could not be saved. Check the browser Console.");
      return;
    }
  }

  alert("Questionnaire submitted. Please visit medical staff for actual eligibility screening.");

  element("eligibilityForm").reset();
}

async function changeScreening(id, value) {
  try {
    await updateDoc(doc(db, "donors", id), {
      screening: value
    });
  } catch (error) {
    console.error("Screening update failed:", error);

    alert("Could not update screening status.");
  }
}

async function changeDonation(id, value) {
  try {
    await updateDoc(doc(db, "donors", id), {
      donation: value
    });
  } catch (error) {
    console.error("Donation update failed:", error);

    alert("Could not update donation status.");
  }
}

async function changeQueue(donorId, value) {
  const booking = bookings.find(b => b.donorId === donorId);

  if (!booking) return;

  try {
    await updateDoc(doc(db, "bookings", booking.id), {
      queue: value
    });
  } catch (error) {
    console.error("Queue update failed:", error);

    alert("Could not update queue status.");
  }
}

// Make these functions available to the HTML dropdowns.
window.changeScreening = changeScreening;
window.changeDonation = changeDonation;
window.changeQueue = changeQueue;

async function startLifeDrop() {
  try {
    await signInAnonymously(auth);

    // Load donors and update the website automatically.
    onSnapshot(donorCollection, snapshot => {
      donors = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      updateWebsite();
    }, error => {
      console.error("Donor loading failed:", error);

      alert("Could not load donors from Firebase. Check Firestore rules.");
    });

    // Load bookings and update the website automatically.
    onSnapshot(bookingCollection, snapshot => {
      bookings = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      }));

      updateWebsite();
    }, error => {
      console.error("Booking loading failed:", error);

      alert("Could not load bookings from Firebase. Check Firestore rules.");
    });

    if (element("donorForm")) {
      element("donorForm").addEventListener("submit", registerDonor);
    }

    if (element("bookingForm")) {
      element("bookingForm").addEventListener("submit", bookSlot);
    }

    if (element("eligibilityForm")) {
      element("eligibilityForm").addEventListener("submit", submitEligibility);
    }

    if (element("date")) {
      element("date").min = new Date().toISOString().split("T")[0];
    }

  } catch (error) {
    console.error("Firebase startup failed:", error);

    alert("Firebase connection failed. Check your config and Anonymous Authentication.");
  }
}

startLifeDrop();