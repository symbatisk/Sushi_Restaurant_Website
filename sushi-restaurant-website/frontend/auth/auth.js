import { getCart, onCartUpdate, updateCartItem } from '../js/cart.js';

let isAuthenticated = false;

const API_BASE = window.location.origin.includes("localhost")
  ? "http://localhost:5001"
  : "https://sushi-restaurant-website-ay7f.onrender.com";


// load user profile
async function fetchUserProfile() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      headers: {  "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json" }
    });

    if (response.status === 401) {

      localStorage.removeItem("authToken");
      localStorage.removeItem("isLoggedIn");
      return;
    }
    const user = await response.json();

    if (response.ok) {
      showUser(user);
     }
  } catch (err) {
    console.error("Profile error:", err);
  }
}

// show user in header
function showUser(user) {
  const welcomeUser = document.getElementById("welcomeUser");
  const userIcon = document.getElementById("userIcon");
  const openSigninBtn = document.getElementById("openSigninModal");

  const name = user.name || "User";
  const firstName = name.split(" ")[0];
  if (welcomeUser) welcomeUser.textContent = `Welcome, ${firstName}!`;
  if (userIcon) userIcon.style.display = "block";
  if (openSigninBtn) openSigninBtn.style.display = "none";
  isAuthenticated = true;
}

// setup auth logic
function initAuth() {
  const signupModal = document.getElementById("signupModal");
  const signinModal = document.getElementById("signinModal");
  const openSigninBtn = document.getElementById("openSigninModal");
  const userIcon = document.getElementById("userIcon");
  const overlay = document.getElementById("overlay");
  const sidebar = document.getElementById("accountSidebar");
  const logoutBtn = document.getElementById("logoutBtn");
  const switchToSignup = document.getElementById("switchToSignup");

  // open sign in
  if (openSigninBtn) {
    openSigninBtn.onclick = () => {
      signinModal.style.display = "block";
    };
  }

  // switch sign in → sign up
  if (switchToSignup) {
    switchToSignup.onclick = () => {
      signinModal.style.display = "none";
      signupModal.style.display = "block";
    };
  }

  // close sign up when click outside
  const signupForm = document.getElementById("signupForm");
  signupModal?.addEventListener("click", (event) => {
    if (!event.target.closest(".modal-content")) {
      signupModal.style.display = "none";
      signupForm?.reset();
    }
  });

  // close sign in when click outside
  const signinForm = document.getElementById("signinForm");
  signinModal?.addEventListener("click", (event) => {
    if (!event.target.closest(".modal-content")) {
      signinModal.style.display = "none";
      signinForm?.reset();
    }
  });

  // handle sign up
  signupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const name = `${data.get("first_name")} ${data.get("last_name")}`;
    const email = data.get("contact_email");
    const password = data.get("password");

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = { message: responseText };
      }
      if (response.ok) {
        alert("Registration successful! Please sign in.");
        signupModal.style.display = "none";
        signinModal.style.display = "block";
      } else {
        alert(`Error ${response.status}: ${result.message || "Registration failed"}`);
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Network error. Please try again.");
    }
  });

  // handle sign in
  signinForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const email = data.get("signin_email");
    const password = data.get("signin_password");

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      let result;
      try { result = await response.json(); }
      catch { result = { message: await response.text() }; }

      if (response.ok) {
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("isLoggedIn", "true");
        signinModal.style.display = "none";
        fetchUserProfile();
      } else {
        alert(`Error ${response.status}: ${result.message || "Login failed"}`);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Network error. Please try again.");
    }
  });

  // open / close account sidebar
  userIcon?.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.style.display = "block";
  });
  overlay?.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.style.display = "none";
  });

  // logout
  logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("isLoggedIn");
    location.reload();
  });
}

// update item count in cart
function updateCartItemQuantity(name, change) {
  const cart = getCart();
  const item = cart[name];
  if (!item) return;

  const newQuantity = item.quantity + change;
  if (newQuantity <= 0) {
    updateCartItem(name, item.price, item.image, 0);
  } else {
    updateCartItem(name, item.price, item.image, newQuantity);
  }
}

// draw cart items
function renderCartHeader(cartData) {
  const cartItemsDiv = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const cartCountEls = document.querySelectorAll("#cartCount");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!cartItemsDiv) return;

  cartItemsDiv.innerHTML = "";
  let total = 0, count = 0;

  for (const [name, item] of Object.entries(cartData)) {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    count += item.quantity;

    const itemContainer = document.createElement("div");
    itemContainer.className = "cart-item";
    itemContainer.dataset.name = name;

    const img = document.createElement("img");
    img.src = item.image || "Images/Menu/placeholder.jpg";
    img.alt = name;
    img.className = "cart-thumb";

    const text = document.createElement("div");
    text.innerHTML = `
      <p>${name}</p>
      <p>${item.price}£ × ${item.quantity} = ${itemTotal}£</p>
      <div>
        <button class="decrease-qty" data-name="${name}">−</button>
        <button class="increase-qty" data-name="${name}">+</button>
      </div>
    `;

    itemContainer.appendChild(img);
    itemContainer.appendChild(text);
    cartItemsDiv.appendChild(itemContainer);
  }

  if (cartTotal) cartTotal.textContent = `${total}£`;
  cartCountEls.forEach(el => el.textContent = count);
  if (checkoutBtn) checkoutBtn.disabled = count === 0;

  syncInputsWithCart(cartData);
}

// setup cart events
function initCart() {
  const cartToggleBtn = document.getElementById("cartToggle");
  const closeCartBtn = document.querySelector(".close-cart");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartItemsDiv = document.getElementById("cartItems");

  cartToggleBtn?.addEventListener("click", toggleCartSidebar);
  closeCartBtn?.addEventListener("click", toggleCartSidebar);
  cartOverlay?.addEventListener("click", toggleCartSidebar);

  cartItemsDiv?.addEventListener("click", (e) => {
    if (e.target.classList.contains("increase-qty")) {
      updateCartItemQuantity(e.target.dataset.name, 1);
    }
    if (e.target.classList.contains("decrease-qty")) {
      updateCartItemQuantity(e.target.dataset.name, -1);
    }
  });

  onCartUpdate(renderCartHeader);
  renderCartHeader(getCart());
}

function toggleCartSidebar() {
  const cartSidebar = document.getElementById("cartSidebar");
  const cartOverlay = document.getElementById("cartOverlay");
  const open = !cartSidebar.classList.contains("open");

  cartSidebar.classList.toggle("open");
  cartOverlay.style.display = open ? "block" : "none";
}

function syncInputsWithCart(cartData) {
  const blocks = document.querySelectorAll(".block_item");
  blocks.forEach(block => {
    const name = block.querySelector("p").textContent.trim();
    const input = block.querySelector(".numberInput");
    if (input) {
      if (cartData[name]) {
        input.value = cartData[name].quantity;
      } else {
        input.value = 0;
      }
    }
  });
}

function initHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', function() {
      sidebar.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
    
    closeSidebar.addEventListener('click', function() {
      sidebar.classList.remove('active');
      document.body.style.overflow = '';
    });
    

    document.addEventListener('click', function(e) {
      if (sidebar.classList.contains('active') && 
          !sidebar.contains(e.target) && 
          e.target !== hamburger) {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}

async function initApp() {
  try {
    const response = await fetch("./auth/auth.html");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();
    const placeholder = document.getElementById("header-placeholder");
    placeholder.innerHTML = html;

    initAuth();
    initCart();
    initHamburgerMenu();

    if (localStorage.getItem("authToken")) {
      await fetchUserProfile();
    }
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

window.addEventListener("DOMContentLoaded", initApp);
