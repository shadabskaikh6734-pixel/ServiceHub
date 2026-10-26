

let isBookingView = false; 

function updateUI() {

  const user = JSON.parse(localStorage.getItem("user"));

  const logoutBtn = document.getElementById("logoutBtn");
  const notificationBtn = document.getElementById("notificationBtn");

  if (!logoutBtn || !notificationBtn) return;

  if (user) {
    logoutBtn.style.display = "block";
    notificationBtn.style.display = "block";
  } else {
    logoutBtn.style.display = "none";
    notificationBtn.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {

  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    alert("Please login first ❌");
    window.location.href = "index.html";
    return;
  }

  updateUI();

  // Get location saved on index.html
  const userLat = localStorage.getItem("userLat");
  const userLng = localStorage.getItem("userLng");

  if (!userLat || !userLng) {
    alert("Location not available. Please go back to the home page.");
    window.location.href = "index.html";
    return;
  }

  console.log("Using saved location:", userLat, userLng);

  // Load services using saved location
  applyFilters(true);

});


window.addEventListener("storage", () => {
  updateUI();
});


function closeAllPopups() {
  closePopup();
  closeAddress();
}


function getUserLocation() {

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "📍 Detecting your location...";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(

            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                console.log("User Location:", lat, lng);

                // ✅ save real location
                localStorage.setItem("userLat", lat);
                localStorage.setItem("userLng", lng);

                applyFilters();
            },

            (error) => {
                console.log("Location denied or blocked ❌");

                

                resultsDiv.innerHTML = `
                    <p>⚠ Please enable location</p>
                    <button onclick="getUserLocation()">📍 Try Again</button>
                `;
            }
        );
    } else {
        alert("Geolocation not supported");
    }
}


function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in KM

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in KM
}

function getServiceIcon(category) {
  switch(category) {
    case "Cleaning":
      return "img/cleaner.jpeg";

    case "Plumbing":
      return "img/plumber.jpeg";

    case "Repair":
      return "img/repair.jpeg";

    case "Electrical":
      return "img/electrician.jpeg";

    default:
      return "img/cleaner.jpeg";
  }
}




const supabaseUrl = "https://xxnrletnimdnyoezdbaw.supabase.co";  
const supabaseKey = "sb_publishable_WFkzTdZXcwsCADIP814onw_EnBAbf5p";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

async function loadNearbyServices(userLat, userLng) {
    const { data, error } = await supabaseClient
        .from("services")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    data.forEach(service => {
        const distance = getDistance(
            userLat,
            userLng,
            service.lat,
            service.lng
        );

        if (distance <= 2) { // 🔥 0–2 KM filter
            const div = document.createElement("div");
           div.classList.add("service-card");

div.innerHTML = `
<img src="${getServiceIcon(service.category)}" class="service-icon">
    <h3>${service.service_name}</h3>

    <p><strong>Category:</strong> ${service.category}</p>
    <p><strong>Area:</strong> ${service.area}</p>

    <p>📍 ${distance.toFixed(2)} km away</p>

   <span class="status ${service.availability.toLowerCase().replace(/\s+/g, "-")}">
  ${service.availability}
</span>

    <div class="card-actions">
            <button onclick="bookService('${service.provider_id}', '${service.id}')">Book Now</button>

            <button onclick="whatsappProvider('${service.phone}')">WhatsApp</button>
    </div>
`;

            resultsDiv.appendChild(div);
        }
    });
}
let currentPage = 1;
const itemsPerPage = 12;

async function applyFilters(resetPage = false) {
  document.getElementById("topSearchBar").style.display = "flex";
closeAllPopups();
document.getElementById("quickTitle").innerText = "";

  document.getElementById("results").classList.remove("booking-mode");
  isBookingView = false;
    const userLat = parseFloat(localStorage.getItem("userLat"));
const userLng = parseFloat(localStorage.getItem("userLng"));

if (!userLat || !userLng) {
    document.getElementById("results").innerHTML = "📍 Getting your location...";
    return;
}

    if (resetPage) currentPage = 1;

    const category = document.getElementById("filterCategory").value;
    const search = document.getElementById("searchInput").value.toLowerCase();
    const area = document.getElementById("filterArea").value.trim().toLowerCase();


    const MAX_DISTANCE = 100;

    const { data, error } = await supabaseClient
        .from("services")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    const servicesWithDistance = data.map(service => {
        const distance = getDistance(
            userLat,
            userLng,
            service.lat,
            service.lng
        );

        return { ...service, distance };
    });

    const filtered = servicesWithDistance.filter(service => {
        return (
            service.distance <= MAX_DISTANCE &&
            (category === "" || service.category === category) &&
            (search === "" || (service.service_name || "").toLowerCase().includes(search)) &&
            (area === "" || (service.area || "").toLowerCase().includes(area))
        );
    });

    filtered.sort((a, b) => a.distance - b.distance);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (filtered.length === 0) {
        resultsDiv.innerHTML = `<p>No services found nearby 😕</p>`;
        return;
    }

    // 🔥 PAGINATION LOGIC
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedData = filtered.slice(start, end);

    // 🔥 DISPLAY SERVICES
    paginatedData.forEach(service => {
        const div = document.createElement("div");
        div.classList.add("service-card");

        div.innerHTML = `
        <img src="${getServiceIcon(service.category)}" class="service-icon">
            <h3>${service.service_name}</h3>
             <span class="rating">
  ⭐ ${service.rating ? service.rating : "No rating"}
</span>
            ${service.is_verified 
                ? `<span class="verified">✔ Verified</span>` 
                : ""
            }

            <p><strong>Category:</strong> ${service.category}</p>
            <p><strong>Area:</strong> ${service.area}</p>

            <p>📍 ${service.distance.toFixed(2)} km away</p>

          <span class="status ${service.availability.toLowerCase().replace(/\s+/g, "-")}">
  ${service.availability}
</span>
            <div class="card-actions">
            <button onclick="bookService('${service.provider_id}', '${service.id}')">
  Book Now
</button>

                <button onclick="whatsappProvider('${service.phone}')">
                    WhatsApp
                </button>
            </div>
        `;

        resultsDiv.appendChild(div);
    });

    // PAGINATION BUTTONS
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const paginationDiv = document.createElement("div");
paginationDiv.classList.add("pagination");

// PREV BUTTON
if (currentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "←";
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationDiv.appendChild(prevBtn);
}

// PAGE NUMBERS


for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.innerText = i;

    if (i === currentPage) {
        pageBtn.classList.add("active");
    }

    pageBtn.onclick = () => changePage(i);
    paginationDiv.appendChild(pageBtn);
}

// NEXT BUTTON
if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "→";
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationDiv.appendChild(nextBtn);
}

document.getElementById("pagination").innerHTML = "";
document.getElementById("pagination").appendChild(paginationDiv);
}



function whatsappProvider(phone) {
    if (!phone) {
        alert("No phone number available");
        return;
    }

    // remove spaces, +, etc
    phone = phone.toString().replace(/\D/g, "");

    // add India code if missing
    if (phone.length === 10) {
        phone = "91" + phone;
    }

    // open WhatsApp
    window.location.href = `https://wa.me/${phone}`;
}



function changePage(page) {
    currentPage = page;
    applyFilters();
}

async function loadAllServices() {
  document.getElementById("topSearchBar").style.display = "flex";
  closeAllPopups();
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterArea").value = "";
  document.getElementById("searchInput").value = "";

  document.getElementById("quickTitle").innerText = "";
  document.getElementById("pagination").innerHTML = "";
  isBookingView = false;
  document.getElementById("results").classList.remove("booking-mode");

    const userLat = parseFloat(localStorage.getItem("userLat"));
    const userLng = parseFloat(localStorage.getItem("userLng"));

    const { data, error } = await supabaseClient
        .from("services")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    // add distance
    const servicesWithDistance = data.map(service => ({
        ...service,
        distance: getDistance(userLat, userLng, service.lat, service.lng)
    }));

    // sort by nearest
    servicesWithDistance.sort((a, b) => a.distance - b.distance);

    // group by category
    const grouped = {};

    servicesWithDistance.forEach(service => {
        if (!grouped[service.category]) {
            grouped[service.category] = [];
        }
        grouped[service.category].push(service);
    });

    // take 2 from each category
    let finalList = [];

    Object.keys(grouped).forEach(cat => {
        finalList.push(...grouped[cat].slice(0, 2));
    });

    // sort again by distance
    finalList.sort((a, b) => a.distance - b.distance);

    renderServices(finalList);
}

function renderServices(list) {
  document.getElementById("results").classList.remove("booking-mode");

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    if (list.length === 0) {
        resultsDiv.innerHTML = `<p>No services found 😕</p>`;
        return;
    }

    list.forEach(service => {
        const div = document.createElement("div");
        div.classList.add("service-card");

        div.innerHTML = `
        <img src="${getServiceIcon(service.category)}" class="service-icon">
            <h3>${service.service_name}</h3>
            <span class="rating">
  ⭐ ${service.rating ? service.rating : "No rating"}
</span>
           


            ${service.is_verified ? `<span class="verified">✔ Verified</span>` : ""}

            <p><strong>Category:</strong> ${service.category}</p>
            <p><strong>Area:</strong> ${service.area}</p>

            <p>📍 ${service.distance.toFixed(2)} km away</p>

           <span class="status ${service.availability.toLowerCase().replace(/\s+/g, "-")}">
  ${service.availability}
</span>
            <div class="card-actions">
            <button onclick="bookService('${service.provider_id}', '${service.id}')">
  Book Now
</button>

                <button onclick="whatsappProvider('${service.phone}')">
                    WhatsApp
                </button>
            </div>
        `;

        resultsDiv.appendChild(div);
    });
}


async function filterQuick() {
    document.getElementById("topSearchBar").style.display = "none";

  closeAllPopups();
  document.getElementById("filterCategory").value = "";
  document.getElementById("filterArea").value = "";
  document.getElementById("searchInput").value = "";

  document.getElementById("pagination").innerHTML = "";
  isBookingView = false;
    const userLat = parseFloat(localStorage.getItem("userLat"));
    const userLng = parseFloat(localStorage.getItem("userLng"));

    const MAX_DISTANCE = 2; // tighter = better UX

    const { data, error } = await supabaseClient
        .from("services")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    const servicesWithDistance = data.map(service => ({
        ...service,
        distance: getDistance(userLat, userLng, service.lat, service.lng)
    }));

    //  MAIN FILTER
    const filtered = servicesWithDistance.filter(service =>
        service.distance <= MAX_DISTANCE &&
        service.availability === "Available"
    );

    // nearest first
    filtered.sort((a, b) => a.distance - b.distance);

    //  LIMIT (important UX)
    const limited = filtered.slice(0, 20);

    renderServices(limited);

    //  SHOW COUNT
    const resultsDiv = document.getElementById("results");
    document.getElementById("quickTitle").innerText =
  `⚡ ${limited.length} quick services found`;
}

function bookService(providerId, serviceId) {


    event.stopPropagation();

  // 👇 CLOSE existing popup first
  closeAllPopups();
  const user = JSON.parse(localStorage.getItem("user"))?.id;

  if (!user) {
    document.getElementById("authModal").classList.remove("hidden");
    return;
  }

  const address = localStorage.getItem("user_address");

  // ❌ No address → open address popup + show warning
  if (!address) {
    openAddress();

    document.getElementById("addressWarning").style.display = "block"; 

    return;
  }

  // ✅ save selected service
  localStorage.setItem("providerId", providerId);
  localStorage.setItem("serviceId", serviceId);

  openBooking();
}

function openBooking() {
  closeAddress();

  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("bookingPopup");

  // ✅ show overlay
  overlay.style.display = "block";

  
  popup.style.display = "block";
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -60%) scale(0.9)";


  setTimeout(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  }, 10);
}


function closePopup() {
  document.getElementById("bookingPopup").style.display = "none";
   document.getElementById("overlay").style.display = "none";
}

async function submitBooking() {
  const providerId = localStorage.getItem("providerId");
  const serviceId = localStorage.getItem("serviceId");

  const { error } = await supabaseClient
    .from("bookings")
    .insert([{
      provider_id: providerId,
      service_id: serviceId,
      user_id: JSON.parse(localStorage.getItem("user"))?.id,
      address: localStorage.getItem("user_address"),
      status: "pending"
    }]);

  if (error) {
    alert("Error booking");
  } else {
    alert("Booking successful ✅");
    closePopup();
  }
}






function openAddress() {
  closePopup();

  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("addressPopup");

  // ✅ show overlay
  overlay.style.display = "block";

  // ✅ reset popup state
  popup.classList.remove("error-shake");

  // 🔥 start hidden animation state
  popup.style.display = "block";
  popup.style.opacity = "0";
  popup.style.transform = "translate(-50%, -60%) scale(0.9)";

  // 🔥 animate in
  setTimeout(() => {
    popup.style.opacity = "1";
    popup.style.transform = "translate(-50%, -50%) scale(1)";
  }, 10);

  // ✅ hide warning
  document.getElementById("addressWarning").style.display = "none";

  // ✅ focus input (pro UX)
  document.getElementById("newAddress").focus();
}

function closeAddress() {
  document.getElementById("addressPopup").style.display = "none";
  document.getElementById("overlay").style.display = "none";
}

function saveAddress() {
  const addressInput = document.getElementById("newAddress");
  const address = addressInput.value;

  if (!address) {
    addressInput.classList.add("error-shake");

    setTimeout(() => {
      addressInput.classList.remove("error-shake");
    }, 400);

    return;
  }

  localStorage.setItem("user_address", address);

  // 👇 ADD THIS (IMPORTANT)
  document.getElementById("addressWarning").style.display = "none";

  alert("Address saved ✅");
  closeAddress();
}





async function logout() {
  await supabaseClient.auth.signOut(); // 🔥 IMPORTANT
  localStorage.clear();
  localStorage.removeItem("user_address");

  // 🔥 ADD THESE (IMPORTANT)
  localStorage.removeItem("userLat");
  localStorage.removeItem("userLng");

  alert("Logged out successfully");

  // update UI
  updateUI();

  window.location.href = "index.html";
}


let isLogin = false;

function toggleAuth() {
  isLogin = !isLogin;

  const title = document.getElementById("authTitle");
  const button = document.getElementById("authBtn");
  const toggleText = document.getElementById("toggleText");

  if (isLogin) {
  title.innerText = "Seeker Login";
  button.innerText = "Login";
  toggleText.innerHTML = `Don't have an account? <b>Register</b>`;
} else {
  title.innerText = "Seeker Register";
  button.innerText = "Register";
  toggleText.innerHTML = `Already have an account? <b>Login</b>`;
}

  document.getElementById("authName").value = "";
document.getElementById("authPhone").value = "";
}



async function handleAuth() {

  const name = document.getElementById("authName").value;
  const phone = document.getElementById("authPhone").value;

  if (!name || !phone) {
    alert("Fill all fields");
    return;
  }

  // check user
  let { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("phone", phone)
    .single();

  // 🔵 LOGIN MODE
  if (isLogin) {

    if (!data) {
      alert("User not found. Please register.");
      
      return;
    }

  } 
  // 🟢 REGISTER MODE
  else {

    if (data) {
      alert("User already exists. Please login.");
      return;
    }

    const { data: newUser, error: insertError } = await supabaseClient
      .from("users")
      .insert([{ name, phone }])
      .select()
      .single();

    if (insertError) {
      alert("Error creating user");
      console.log(insertError);
      return;
    }

    data = newUser;
  }

  // ✅ SAVE SESSION
 

  // ✅ REDIRECT
  window.location.href = "seeker_dashboard.html";
}

async function loadUserBookings() {

  isBookingView = true;
  document.getElementById("topSearchBar").style.display = "none";

  document.getElementById("quickTitle").innerText = "";
  document.getElementById("pagination").innerHTML = "";

  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "Loading bookings...";

  const userId = JSON.parse(localStorage.getItem("user"))?.id;

  const { data, error } = await supabaseClient
    .from("bookings")
   .select(`
  id,
  service_id,
  rating,
  status,
  address,
  services!bookings_service_id_fkey(service_name),
  provider:users!bookings_provider_id_fkey(
  id,
  name,
  phone
)
`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.log(error);
    resultsDiv.innerHTML = "Error loading bookings ❌";
    return;
  }

  displayUserBookings(data);
}

function displayUserBookings(bookings) {

  const resultsDiv = document.getElementById("results");



resultsDiv.innerHTML = `
  <div style="grid-column: 1 / -1;">
    <h2>🔔 Your Bookings</h2>
  </div>
`;
  if (bookings.length === 0) {
    resultsDiv.innerHTML += "<p>No bookings yet</p>";
    return;
  }

  bookings.forEach(b => {

    let statusColor =
      b.status === "accepted" ? "green" :
      b.status === "rejected" ? "red" : "orange";

    const div = document.createElement("div");
    div.classList.add("service-card");

    div.innerHTML = `
  <h3>${b.services?.service_name}</h3>

  <p><strong>Provider:</strong> ${b.provider?.name}</p>
  <p><strong>Phone:</strong> ${b.provider?.phone}</p>
  <p><strong>Address:</strong> ${b.address}</p>

  <p>Status: 
    <b style="color:${statusColor}">
      ${b.status}
    </b>
  </p>

  ${
  b.status === "accepted"
    ? b.rating
      ? `<p>⭐ Your Rating: ${b.rating}</p>`
      : `
      <div class="rating-box">
        ⭐ Rate:
        <span onclick="rateService(${b.id}, 1, '${b.service_id}')">1</span>
        <span onclick="rateService(${b.id}, 2, '${b.service_id}')">2</span>
        <span onclick="rateService(${b.id}, 3, '${b.service_id}')">3</span>
        <span onclick="rateService(${b.id}, 4, '${b.service_id}')">4</span>
        <span onclick="rateService(${b.id}, 5, '${b.service_id}')">5</span>
      </div>
      `
    : ""
}
`;

   resultsDiv.appendChild(div);
  });
}

async function checkNewNotifications() {

  const userId = JSON.parse(localStorage.getItem("user"))?.id;

  const { data } = await supabaseClient
    .from("bookings")
    .select("status")
    .eq("user_id", userId);

  const hasUpdate = data.some(b => b.status !== "pending");

  const btn = document.getElementById("notificationBtn");

  if (hasUpdate) {
    btn.innerText = "🔔 Notifications (New)";
    btn.style.background = "#ff3b3b";
  }
}
async function rateService(bookingId, rating, serviceId) {

  // check already rated
  const { data: existing } = await supabaseClient
    .from("bookings")
    .select("rating")
    .eq("id", bookingId)
    .single();

  if (existing?.rating) {
    alert("Already rated ❌");
    return;
  }

  // save rating
  const { error } = await supabaseClient
    .from("bookings")
    .update({ rating })
    .eq("id", bookingId);

  if (error) {
    console.log(error);
    alert("Error saving rating ❌");
    return;
  }

  // get all ratings
  const { data } = await supabaseClient
    .from("bookings")
    .select("rating")
    .eq("service_id", serviceId)
    .not("rating", "is", null);

  const avg =
    data.reduce((sum, r) => sum + r.rating, 0) / data.length;

  // update service rating
  await supabaseClient
    .from("services")
    .update({ rating: parseFloat(avg.toFixed(1)) })
    .eq("id", serviceId);

  alert("Thanks for rating ⭐");

// 🔥 reload both views properly
if (isBookingView) {
  loadUserBookings();   // stay in bookings page
} else {
  applyFilters();       // refresh services list 
}
}

document.getElementById("overlay").addEventListener("click", () => {
  shakeCancelButton();
});

function shakeCancelButton() {
  const bookingPopup = document.getElementById("bookingPopup");
  const addressPopup = document.getElementById("addressPopup");

  let cancelBtn = null;

  if (bookingPopup.style.display === "block") {
    cancelBtn = bookingPopup.querySelector("button:last-child");
  } else if (addressPopup.style.display === "block") {
    cancelBtn = addressPopup.querySelector("button:last-child");
  }

  if (!cancelBtn) return;

  cancelBtn.classList.add("error-shake");

  setTimeout(() => {
    cancelBtn.classList.remove("error-shake");
  }, 400);
}
