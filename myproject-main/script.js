


const supabaseUrl = "https://xxnrletnimdnyoezdbaw.supabase.co";  
const supabaseKey = "sb_publishable_WFkzTdZXcwsCADIP814onw_EnBAbf5p";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
let selectedRole = null;// default






function setRole(role) {
  selectedRole = role;

  // ✅ SAVE IN LOCAL STORAGE
  localStorage.setItem("selectedRole", role);

  // UI highlight
  document.getElementById("seekerBtn").classList.remove("active");
  document.getElementById("providerBtn").classList.remove("active");

  if (role === "seeker") {
    document.getElementById("seekerBtn").classList.add("active");
  } else {
    document.getElementById("providerBtn").classList.add("active");
  }
}


async function handleUserAfterLogin(user) {

  console.log("Logged in user:", user);

 // 🔍 FIRST get user from DB
const { data: existingUser } = await supabaseClient
  .from("users")
  .select("*")
  .eq("id", user.id)
  .single();

// ✅ PRIORITY 1: DB role (existing user)
let role = existingUser?.role;

// ✅ PRIORITY 2: selectedRole (new user / Google login)
if (!role) {
  role = localStorage.getItem("selectedRole") || "seeker";
}

  const fullName = user.user_metadata.full_name || "";

  // 🆕 INSERT IF NEW
  if (!existingUser) {
    await supabaseClient.from("users").insert([{
      id: user.id,
      name: fullName,
      email: user.email,
      role: role,
      lat: userLocation.lat || 0,
      lng: userLocation.lng || 0
    }]);
  }

  // 💾 SAVE USER
  localStorage.setItem("user", JSON.stringify(user));

  // 🚀 REDIRECT
  if (role === "provider") {
    window.location.href = "provider_dashboard.html";
  } else {
    window.location.href = "seeker_dashboard.html";
  }

  localStorage.removeItem("selectedRole");
}


async function handleRegister() {

  

  if (!selectedRole) {
  alert("Please select role (Seeker / Provider) ❌");
  return;
}


  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!firstName || !email || !password || !phone) {
    alert("Fill all fields ❌");
    return;
  }

  // 🔐 SIGNUP
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const user = data.user;

  // 👤 FULL NAME
  const fullName = firstName + " " + lastName;

  const lat = userLocation.lat;
  const lng = userLocation.lng;

  // 🔍 CHECK IF USER ALREADY EXISTS
  const { data: existingUser } = await supabaseClient
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  // 💾 INSERT ONLY IF NOT EXISTS
  if (!existingUser) {
    const { error: insertError } = await supabaseClient
      .from("users")
      .insert([
        {
          id: user.id,
          name: fullName,
          email: email,
          phone: phone,
          role: selectedRole,
          lat: lat,
          lng: lng
        }
      ]);

    if (insertError) {
      alert(insertError.message);
      return;
    }
  }

  
  // ✅ SUCCESS
  alert("Account created ✅ Please login");

  showLogin();

  document.getElementById("loginEmail").value = email;
}

let userLocation = { lat: null, lng: null };

function getLocation() {

  if (!navigator.geolocation) {
    alert("Geolocation is not supported ❌");
    return;
  }

  navigator.geolocation.getCurrentPosition(

    (position) => {

      userLocation.lat = position.coords.latitude;
      userLocation.lng = position.coords.longitude;

      // Save current session location
      localStorage.setItem("userLat", userLocation.lat);
      localStorage.setItem("userLng", userLocation.lng);

      console.log("Current Location:", userLocation);

      alert("Location captured ✅");
    },

    () => {
      alert("Location access denied ❌");
    }
  );
}



function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}



function showLogin() {
  document.getElementById("registerForm").classList.add("hidden");
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("topText").innerHTML = "";
}

function showRegister() {
  
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("registerForm").classList.remove("hidden");
   document.getElementById("topText").innerHTML = `
    Already have an account? 
    <span onclick="showLogin()">Sign in</span>
  `;
}


async function handleLogin() {

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Fill all fields ❌");
    return;
  }

  // 🔐 LOGIN
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const user = data.user;
  localStorage.setItem("user", JSON.stringify(user));
  // 📦 FETCH USER FROM DB
  const { data: userData, error: userError } = await supabaseClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  let role;

if (userError || !userData) {

  role = localStorage.getItem("selectedRole") || "seeker";

  await supabaseClient.from("users").insert([{
    id: user.id,
    email: user.email,
    role: role
  }]);

} else {
  role = userData.role;
}

  // 🚀 REDIRECT BASED ON ROLE
  if (role === "seeker") {
    window.location.href = "seeker_dashboard.html";
  } else {
    window.location.href = "provider_dashboard.html";
  }
}
