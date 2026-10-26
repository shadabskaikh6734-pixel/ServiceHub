let providerLocation = {lat:null,lng:null};
let allBookings = [];
let currentDate = new Date();

const supabaseUrl = "https://xxnrletnimdnyoezdbaw.supabase.co";
const supabaseKey = "sb_publishable_WFkzTdZXcwsCADIP814onw_EnBAbf5p";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", initProviderDashboard);

async function initProviderDashboard(){
  const user = JSON.parse(localStorage.getItem("user"));
  if(!user){
    alert("Please login first ❌");
    window.location.href="index.html";
    return;
  }
  document.getElementById("topProviderName").textContent = user.name || "Provider";
  document.getElementById("topAvatar").textContent = (user.name || "P").charAt(0).toUpperCase();
  getProviderLocation();
  await showDashboard();
}

function getProviderLocation(){
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      p => {
        providerLocation.lat=p.coords.latitude;
        providerLocation.lng=p.coords.longitude;
        localStorage.setItem("userLat",p.coords.latitude);
        localStorage.setItem("userLng",p.coords.longitude);
      },
      () => {}
    );
  }
}

function setActive(page){
  document.querySelectorAll(".nav-btn").forEach(b=>{
    b.classList.toggle("active",b.dataset.page===page);
  });
}

function esc(value){
  return String(value ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
function initials(name){return (name||"U").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();}
function formatDate(d){return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
function formatTime(d){return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});}
function statusClass(s){
  s=(s||"pending").toLowerCase();
  if(s==="accepted"||s==="booked") return "status-booked";
  if(s==="completed"||s==="done") return "status-completed";
  if(s==="rejected"||s==="cancelled"||s==="canceled") return "status-cancelled";
  return "status-pending";
}
function displayStatus(s){
  s=(s||"pending").toLowerCase();
  if(s==="accepted") return "Booked";
  if(s==="rejected"||s==="canceled") return "Cancelled";
  if(s==="done") return "Completed";
  return s.charAt(0).toUpperCase()+s.slice(1);
}
function serviceIcon(category){
  const c=(category||"").toLowerCase();
  if(c.includes("plumb")) return "⚒";
  if(c.includes("elect")) return "ϟ";
  if(c.includes("clean")) return "♨";
  if(c.includes("repair")) return "❄";
  return "◆";
}
function showToast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2600);
}
function showNotice(){showToast("You are up to date.");}

async function logout(){
  await supabaseClient.auth.signOut();
  localStorage.clear();
  window.location.href="index.html";
}

async function showDashboard(){
  setActive("dashboard");
  const content=document.getElementById("contentArea");
  content.innerHTML='<div class="loading">Loading dashboard...</div>';

  const user=JSON.parse(localStorage.getItem("user"));
  const [{data:services,error:serviceError},{data:bookings,error:bookingError}]=await Promise.all([
    supabaseClient.from("services").select("*").eq("provider_id",user.id),
    supabaseClient.from("bookings").select(`id,status,address,created_at,user_id,service_id,users!bookings_user_id_fkey(name,phone),services(service_name,category)`).eq("provider_id",user.id).order("created_at",{ascending:false})
  ]);

  if(serviceError) console.error(serviceError);
  if(bookingError) console.error(bookingError);
  allBookings=bookings||[];

  const counts={
    services:(services||[]).length,
    booked:allBookings.filter(b=>["accepted","booked"].includes((b.status||"").toLowerCase())).length,
    completed:allBookings.filter(b=>["completed","done"].includes((b.status||"").toLowerCase())).length,
    pending:allBookings.filter(b=>(b.status||"").toLowerCase()==="pending").length,
    cancelled:allBookings.filter(b=>["rejected","cancelled","canceled"].includes((b.status||"").toLowerCase())).length
  };

  content.innerHTML=`
    <section class="page-head">
      <div>
        <h1>Good morning, <span>${esc(user.name||"Provider")}</span> 👋</h1>
        <p>Here's an overview of your services and bookings.</p>
      </div>
      <div class="date-head"><span>▣</span> ${new Date().toLocaleDateString("en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
    </section>

    <section class="stats">
      ${statCard("stat-blue","◇",counts.services,"My Services","Active services you offer")}
      ${statCard("stat-green","▣",counts.booked,"Currently Booked","Upcoming appointments")}
      ${statCard("stat-cyan","✓",counts.completed,"Completed","Successfully finished")}
      ${statCard("stat-yellow","◷",counts.pending,"Pending","Awaiting your action")}
      ${statCard("stat-red","×",counts.cancelled,"Cancelled","Cancelled bookings")}
    </section>

    <section class="dashboard-grid">
      <div class="panel calendar-panel">
        <div class="panel-head"><h2><span>▣</span> Booking Calendar</h2></div>
        <div id="calendarArea"></div>
      </div>

      <div>
        <div class="panel filter-panel">
          <div class="panel-head" style="margin:-17px -17px 16px"><h2><span>⚑</span> Filter Bookings</h2></div>
          <div class="filter-grid">
            <div class="field"><label>Date</label><input type="date" id="bookingDate"></div>
            <div class="field"><label>Service</label><select id="serviceFilter"><option value="">All Services</option></select></div>
            <div class="field"><label>Status</label><select id="statusFilter"><option value="">All Status</option><option value="accepted">Booked</option><option value="pending">Pending</option><option value="completed">Completed</option><option value="rejected">Cancelled</option></select></div>
            <button class="apply-btn" onclick="applyBookingFilters()">Apply</button>
          </div>
        </div>

        <div class="panel bookings-panel">
          <div class="panel-head">
            <h2><span>▣</span> <span id="bookingTitle">Bookings</span></h2>
            <span class="count" id="bookingCount">0 bookings</span>
          </div>
          <div class="table-wrap"><div id="dashboardBookings"></div></div>
        </div>
      </div>
    </section>

    <section class="bottom-grid">
      <div class="panel">
        <div class="panel-head"><h2><span>◷</span> Recent Bookings</h2><button class="action-btn" onclick="loadBookings()">View All</button></div>
        <div class="recent-list" id="recentBookings"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2><span>▥</span> My Top Services</h2><button class="action-btn" onclick="loadServices()">View All</button></div>
        <div class="top-services" id="topServices"></div>
      </div>
    </section>
  `;

  const serviceNames=[...new Set((services||[]).map(s=>s.service_name).filter(Boolean))];
  const select=document.getElementById("serviceFilter");
  serviceNames.forEach(n=>select.insertAdjacentHTML("beforeend",`<option value="${esc(n)}">${esc(n)}</option>`));

  const today=new Date();
  const isoToday=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  document.getElementById("bookingDate").value=isoToday;
  currentDate=today;

  renderCalendar();
  renderDashboardBookings();
  renderRecentBookings();
  renderTopServices(services||[]);
}

function statCard(cls,icon,num,label,sub){
  return `<div class="stat-card ${cls}"><div class="stat-icon">${icon}</div><div class="stat-num">${num}</div><div class="stat-label">${label}</div><small>${sub}</small></div>`;
}

function renderCalendar(){
  const area=document.getElementById("calendarArea");
  if(!area)return;
  const y=currentDate.getFullYear(),m=currentDate.getMonth();
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  const start=(first.getDay()+6)%7;
  let html=`<div class="cal-top"><button class="cal-arrow" onclick="changeMonth(-1)">‹</button><strong>${first.toLocaleDateString("en-US",{month:"long",year:"numeric"})}</strong><button class="cal-arrow" onclick="changeMonth(1)">›</button></div>`;
  html+=`<div class="calendar"><div class="week">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<div>${x}</div>`).join("")}</div><div class="days">`;
  const prevLast=new Date(y,m,0).getDate();
  for(let i=start-1;i>=0;i--) html+=`<div class="day muted">${prevLast-i}</div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=new Date(y,m,d);
    const key=date.toISOString().slice(0,10);
    const dayBookings=allBookings.filter(b=>new Date(b.created_at).toISOString().slice(0,10)===key);
    const dots=[...new Set(dayBookings.map(b=>displayStatus(b.status)))];
    const selected=d===new Date().getDate()&&m===new Date().getMonth()&&y===new Date().getFullYear();
    html+=`<div class="day ${selected?"selected":""}" onclick="pickCalendarDate('${key}')">${d}${dots.length?`<div>${dots.slice(0,3).map(s=>`<i class="day-dot ${s==="Completed"?"dot-green":s==="Booked"?"dot-blue":s==="Pending"?"dot-yellow":"dot-red"}"></i>`).join("")}</div>`:""}</div>`;
  }
  const cells=start+last.getDate(); const remaining=(7-cells%7)%7;
  for(let d=1;d<=remaining;d++)html+=`<div class="day muted">${d}</div>`;
  html+=`</div></div><div class="legend"><span><i class="dot-green"></i>Completed</span><span><i class="dot-blue"></i>Booked</span><span><i class="dot-yellow"></i>Pending</span><span><i class="dot-red"></i>Cancelled</span></div>`;
  area.innerHTML=html;
}
function changeMonth(delta){currentDate=new Date(currentDate.getFullYear(),currentDate.getMonth()+delta,1);renderCalendar();}
function pickCalendarDate(key){document.getElementById("bookingDate").value=key;currentDate=new Date(key+"T12:00:00");renderCalendar();applyBookingFilters();}

function applyBookingFilters(){
  renderDashboardBookings();
}
function renderDashboardBookings(){
  const date=document.getElementById("bookingDate")?.value||"";
  const service=document.getElementById("serviceFilter")?.value||"";
  const status=document.getElementById("statusFilter")?.value||"";

  const rows=allBookings.filter(b=>{
    const bDate=new Date(b.created_at).toISOString().slice(0,10);
    const normalized=(b.status||"").toLowerCase();
    const statusOk=!status || (status==="accepted" ? ["accepted","booked"].includes(normalized) : status==="rejected" ? ["rejected","cancelled","canceled"].includes(normalized) : normalized===status);
    return (!date||bDate===date) && (!service||(b.services?.service_name||"")===service) && statusOk;
  });

  const titleDate=date?new Date(date+"T12:00:00").toLocaleDateString("en-US",{day:"2-digit",month:"long",year:"numeric"}):"All Dates";
  document.getElementById("bookingTitle").textContent=`Bookings for ${titleDate}`;
  document.getElementById("bookingCount").textContent=`${rows.length} booking${rows.length!==1?"s":""}`;

  const el=document.getElementById("dashboardBookings");
  if(!rows.length){el.innerHTML=`<div class="loading">No bookings found for the selected filters.</div>`;return;}
  el.innerHTML=`<table class="booking-table"><thead><tr><th>Time</th><th>User</th><th>Service</th><th>Address</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${rows.map(b=>`
      <tr>
        <td><strong>${formatTime(b.created_at)}</strong></td>
        <td><div class="booking-user"><div class="user-avatar">${initials(b.users?.name)}</div><div class="user-info"><strong>${esc(b.users?.name||"Unknown User")}</strong><small>${esc(b.users?.phone||"")}</small></div></div></td>
        <td><div class="service-cell"><div class="service-icon">${serviceIcon(b.services?.category)}</div><div><strong>${esc(b.services?.service_name||"Service")}</strong><small style="display:block;color:#9fb1c6">${esc(b.services?.category||"")}</small></div></div></td>
        <td>⌖ ${esc(b.address||"Not provided")}</td>
        <td><span class="status-pill ${statusClass(b.status)}">${displayStatus(b.status)}</span></td>
        <td><button class="action-btn" onclick="bookingAction(${b.id})">View</button></td>
      </tr>`).join("")}
  </tbody></table>`;
}
function bookingAction(id){
  const b=allBookings.find(x=>String(x.id)===String(id));if(!b)return;
  alert(`User: ${b.users?.name||"Unknown"}\nPhone: ${b.users?.phone||"Not available"}\nService: ${b.services?.service_name||"Service"}\nAddress: ${b.address||"Not provided"}\nStatus: ${displayStatus(b.status)}\nBooked: ${formatDate(b.created_at)} ${formatTime(b.created_at)}`);
}

function renderRecentBookings(){
  const el=document.getElementById("recentBookings"); if(!el)return;
  const recent=allBookings.slice(0,4);
  if(!recent.length){el.innerHTML='<div class="loading">No bookings yet.</div>';return;}
  el.innerHTML=recent.map(b=>`<div class="recent-row"><div class="user-avatar">${initials(b.users?.name)}</div><div class="grow"><strong>${esc(b.users?.name||"Unknown")}</strong><small>${esc(b.services?.service_name||"Service")} · ${formatTime(b.created_at)}</small></div><span class="status-pill ${statusClass(b.status)} recent-status">${displayStatus(b.status)}</span></div>`).join("");
}
function renderTopServices(services){
  const el=document.getElementById("topServices");if(!el)return;
  const counts={};
  allBookings.forEach(b=>{const n=b.services?.service_name;if(n)counts[n]=(counts[n]||0)+1});
  const rows=services.map(s=>({...s,count:counts[s.service_name]||0})).sort((a,b)=>b.count-a.count).slice(0,4);
  if(!rows.length){el.innerHTML='<div class="loading">Add services to see your top services.</div>';return;}
  const max=Math.max(1,...rows.map(x=>x.count));
  el.innerHTML=rows.map((s,i)=>`<div class="top-service-row"><div class="service-icon">${serviceIcon(s.category)}</div><div class="grow"><strong>${esc(s.service_name)}</strong><small>${s.count} booking${s.count!==1?"s":""}</small><div class="progress"><span style="width:${Math.max(8,(s.count/max)*100)}%;background:${["#14d48b","#1187ff","#9a4dff","#f5a623"][i%4]}"></span></div></div><small>${Math.round((s.count/(allBookings.length||1))*100)}%</small></div>`).join("");
}

async function loadBookings(){
  setActive("bookings");
  const user=JSON.parse(localStorage.getItem("user"));
  const content=document.getElementById("contentArea");
  content.innerHTML='<div class="loading">Loading bookings...</div>';
  const {data,error}=await supabaseClient.from("bookings").select(`id,status,address,created_at,user_id,service_id,rating,users!bookings_user_id_fkey(name,phone),services(service_name,category)`).eq("provider_id",user.id).order("created_at",{ascending:false});
  if(error){content.innerHTML=`<div class="simple-page"><h1>Bookings</h1><p>${esc(error.message)}</p></div>`;return;}
  allBookings=data||[];
  content.innerHTML=`
    <section class="page-head"><div><h1>All <span>Bookings</span></h1><p>Manage booking requests from your customers.</p></div></section>
    <div class="panel bookings-panel"><div class="panel-head"><h2>▣ Booking Requests</h2><span class="count">${allBookings.length} bookings</span></div><div class="table-wrap" id="allBookingTable"></div></div>`;
  const el=document.getElementById("allBookingTable");
  if(!allBookings.length){el.innerHTML='<div class="loading">No bookings yet.</div>';return;}
  el.innerHTML=`<table class="booking-table"><thead><tr><th>Date & Time</th><th>User</th><th>Service</th><th>Address</th><th>Status</th><th>Action</th></tr></thead><tbody>${allBookings.map(b=>`
    <tr><td>${formatDate(b.created_at)}<br><small>${formatTime(b.created_at)}</small></td>
    <td><div class="booking-user"><div class="user-avatar">${initials(b.users?.name)}</div><div class="user-info"><strong>${esc(b.users?.name||"Unknown")}</strong><small>${esc(b.users?.phone||"")}</small></div></div></td>
    <td>${esc(b.services?.service_name||"Service")}</td><td>${esc(b.address||"Not provided")}</td>
    <td><span class="status-pill ${statusClass(b.status)}">${displayStatus(b.status)}</span></td>
    <td>${(b.status||"").toLowerCase()==="pending"?`<button class="action-btn" onclick="updateBooking(${b.id},'accepted')">Accept</button> <button class="action-btn" onclick="updateBooking(${b.id},'rejected')">Reject</button>`:`<button class="action-btn" onclick="bookingAction(${b.id})">View</button>`}</td>
    </tr>`).join("")}</tbody></table>`;
}

async function updateBooking(id,status){
  const {error}=await supabaseClient.from("bookings").update({status}).eq("id",id).eq("status","pending");
  if(error){alert("Error: "+error.message);return;}
  showToast(status==="accepted"?"Booking accepted ✅":"Booking rejected");
  await loadBookings();
}

function loadAdd(){
  setActive("add");
  document.getElementById("contentArea").innerHTML=`
    <section class="page-head"><div><h1>Add <span>Service</span></h1><p>Create a new service that customers can discover.</p></div></section>
    <div class="form-card"><div class="form-grid">
      <div class="field"><label>Service Name *</label><input id="serviceName" placeholder="e.g. AC Repair"></div>
      <div class="field"><label>Category</label><select id="category"><option>Plumbing</option><option>Electrical</option><option>Cleaning</option><option>Repair</option><option>Appliance</option></select></div>
      <div class="field full"><label>Description</label><textarea id="description" placeholder="Describe your service"></textarea></div>
      <div class="field"><label>Availability</label><select id="availability"><option>Available</option><option>Busy</option><option>Not Available</option></select></div>
      <div class="field"><label>Phone *</label><input id="phone" placeholder="Mobile number"></div>
      <div class="field full"><label>Area *</label><input id="area" placeholder="e.g. Virar West"></div>
    </div><div class="form-actions"><button class="primary" onclick="addService()">Save Service</button></div></div>`;
}
async function addService(){
  const user=JSON.parse(localStorage.getItem("user"));
  const serviceName=document.getElementById("serviceName").value.trim();
  const category=document.getElementById("category").value;
  const description=document.getElementById("description").value.trim();
  const availability=document.getElementById("availability").value;
  const phone=document.getElementById("phone").value.trim();
  const area=document.getElementById("area").value.trim();
  if(!serviceName||!phone||!area){alert("Please fill required fields");return;}
  const lat=parseFloat(localStorage.getItem("userLat"))||0,lng=parseFloat(localStorage.getItem("userLng"))||0;
  const {error}=await supabaseClient.from("services").insert([{service_name:serviceName,category,description,availability,phone,area,lat,lng,provider_id:user.id}]);
  if(error){alert("Error: "+error.message);return;}
  showToast("Service added ✅");loadServices();
}

async function loadServices(){
  setActive("services");
  const user=JSON.parse(localStorage.getItem("user"));
  document.getElementById("contentArea").innerHTML='<div class="loading">Loading services...</div>';
  const {data,error}=await supabaseClient.from("services").select("*").eq("provider_id",user.id).order("created_at",{ascending:false});
  if(error){document.getElementById("contentArea").innerHTML=`<div class="simple-page"><h1>My Services</h1><p>${esc(error.message)}</p></div>`;return;}
  document.getElementById("contentArea").innerHTML=`
    <section class="page-head"><div><h1>My <span>Services</span></h1><p>Manage the services you currently offer.</p></div><button class="primary" onclick="loadAdd()">+ Add Service</button></section>
    <div id="serviceList" class="service-container"></div>`;
  const list=document.getElementById("serviceList");
  if(!data?.length){list.innerHTML='<div class="simple-page"><h2>No services added yet</h2><p>Use Add Service to create your first listing.</p></div>';return;}
  list.innerHTML=data.map(s=>{
    const cls=s.availability==="Available"?"status-completed":s.availability==="Busy"?"status-pending":"status-cancelled";
    return `<div class="service-card"><div class="service-icon">${serviceIcon(s.category)}</div><h3>${esc(s.service_name)}</h3><p><b>Category:</b> ${esc(s.category)}</p><p><b>Area:</b> ${esc(s.area)}</p><span class="status-pill ${cls}">${esc(s.availability)}</span><div class="card-actions"><button onclick="editService(${JSON.stringify(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")})">Edit</button><button onclick="deleteService('${s.id}')">Delete</button></div></div>`;
  }).join("");
}
function editService(s){
  setActive("services");
  document.getElementById("contentArea").innerHTML=`
    <section class="page-head"><div><h1>Edit <span>Service</span></h1><p>Update your service information.</p></div></section>
    <div class="form-card"><div class="form-grid">
      <div class="field"><label>Service Name</label><input id="serviceName" value="${esc(s.service_name)}"></div>
      <div class="field"><label>Category</label><input id="category" value="${esc(s.category)}"></div>
      <div class="field full"><label>Description</label><textarea id="description">${esc(s.description)}</textarea></div>
      <div class="field"><label>Availability</label><select id="availability"><option ${s.availability==="Available"?"selected":""}>Available</option><option ${s.availability==="Busy"?"selected":""}>Busy</option><option ${s.availability==="Not Available"?"selected":""}>Not Available</option></select></div>
      <div class="field"><label>Phone</label><input id="phone" value="${esc(s.phone)}"></div>
      <div class="field full"><label>Area</label><input id="area" value="${esc(s.area)}"></div>
    </div><div class="form-actions"><button class="primary" onclick="updateService('${s.id}')">Update Service</button><button class="secondary" onclick="loadServices()">Cancel</button></div></div>`;
}
async function updateService(id){
  const payload={service_name:document.getElementById("serviceName").value.trim(),category:document.getElementById("category").value.trim(),description:document.getElementById("description").value.trim(),availability:document.getElementById("availability").value,phone:document.getElementById("phone").value.trim(),area:document.getElementById("area").value.trim()};
  const {error}=await supabaseClient.from("services").update(payload).eq("id",id);
  if(error){alert("Error: "+error.message);return;}
  showToast("Service updated ✅");loadServices();
}
async function deleteService(id){
  if(!confirm("Delete this service?"))return;
  const {error}=await supabaseClient.from("services").delete().eq("id",id);
  if(error){alert("Error: "+error.message);return;}
  showToast("Service deleted");loadServices();
}

