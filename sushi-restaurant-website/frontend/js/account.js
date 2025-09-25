const API_BASE = window.location.origin.includes("localhost")
  ? "http://localhost:5001"
  : "https://sushi-restaurant-website-ay7f.onrender.com";

// Load user data from backend
async function loadUserData() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      document.getElementById("user-name").textContent = "Guest";
      document.getElementById("user-email").textContent = "";
      return;
    }

    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch user data");

    const userData = await response.json();

    document.getElementById("user-name").textContent = userData.name || "User";
    document.getElementById("user-email").textContent = userData.email || "No email";

    document.getElementById("settings-name").value = userData.name || "";
    document.getElementById("settings-email").value = userData.email || "";
    document.getElementById("phone").value = userData.address || "";
    const avatar = document.querySelector('.user-avatar');
    if (userData.name) {
      const names = userData.name.split(' ');
      let initials = names[0].substring(0, 1).toUpperCase();
      if (names.length > 1) {
        initials += names[names.length - 1].substring(0, 1).toUpperCase();
      }
      avatar.textContent = initials;
    }
  } catch (err) {
    console.error("Error loading user data:", err);
  }
}

// Format date to UK display (DD/MM/YYYY)
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format currency to pounds
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

// Load user order history with detailed view
async function loadOrders() {
  console.log("loadOrders() called");
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("No token found");
      document.getElementById("orders-container").innerHTML = "<p>Please log in to view your order history</p>";
      document.getElementById('order-examples').classList.remove('hidden');
      return;
    }

    const response = await fetch(`${API_BASE}/api/order/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const orders = await response.json();
    console.log("Orders loaded:", orders);

    const ordersContainer = document.getElementById("orders-container");
    ordersContainer.innerHTML = "";

    if (orders.length === 0) {
      ordersContainer.innerHTML = "<p>No orders found</p>";
      return;
    }

    orders.forEach(order => {
      const orderId = order.orderId || order._id;
      const orderElement = createOrderElement(order);
      ordersContainer.appendChild(orderElement);
      startOrderTimer(order, orderId);
    });

  } catch (err) {
    console.error("Error loading orders:", err);
    document.getElementById("orders-container").innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

function getOrderStatus(order) {
  const now = Date.now();
  const placed = new Date(order.placedAt).getTime();
  const shippedAt = placed + order.prepTime * 60000;
  const deliveredAt = placed + order.totalETA * 60000;

  if (now < shippedAt) {
    return "Placed";
  } else if (now < deliveredAt) {
    return "Shipped"; 
  } else {
    return "Delivered"; 
  }
}

function startOrderTimer(order, orderId) {
  const statusElement = document.getElementById(`status-${orderId}`);
  const timelineSteps = {
    placed: document.getElementById(`timeline-placed-${orderId}`),
    shipped: document.getElementById(`timeline-shipped-${orderId}`),
    delivered: document.getElementById(`timeline-delivered-${orderId}`)
  };

  // Check if elements exist before manipulating them
  if (!statusElement) {
    console.error(`Status element with ID 'status-${orderId}' not found`);
    return;
  }

  Object.values(timelineSteps).forEach(step => {
    if (step) step.classList.remove('active', 'completed');
  });
  
  if (timelineSteps.placed) timelineSteps.placed.classList.add('completed');

  const orderDate = new Date(order.createdAt || order.date);
  const prepTimeMs = (order.prepTime || 20) * 60 * 1000;
  const deliveryTimeMs = (order.deliveryTime || 0) * 60 * 1000;
  const totalTimeMs = prepTimeMs + deliveryTimeMs;

  const timer = setInterval(() => {
    const now = new Date();
    const elapsedMs = now - orderDate;

    if (elapsedMs < prepTimeMs) {
      if (statusElement) statusElement.textContent = "Placed";
    } else if (elapsedMs < totalTimeMs) {
      if (statusElement) statusElement.textContent = "Out for delivery";
      if (timelineSteps.shipped) {
        timelineSteps.shipped.classList.add('active');
        const shippedDate = new Date(orderDate.getTime() + prepTimeMs);
        timelineSteps.shipped.querySelector(".timeline-date").textContent = 
          `${formatDate(shippedDate)} ${shippedDate.getHours()}:${shippedDate.getMinutes().toString().padStart(2, '0')}`;
      }
    } else {
      if (statusElement) statusElement.textContent = "Delivered";
      if (timelineSteps.shipped) timelineSteps.shipped.classList.replace('active', 'completed');
      if (timelineSteps.delivered) {
        timelineSteps.delivered.classList.add('completed');
        const deliveredDate = new Date(orderDate.getTime() + totalTimeMs);
        timelineSteps.delivered.querySelector(".timeline-date").textContent = 
          `${formatDate(deliveredDate)} ${deliveredDate.getHours()}:${deliveredDate.getMinutes().toString().padStart(2, '0')}`;
      }
      clearInterval(timer);
    }
  }, 1000);
}

// Create order element with expandable details
function createOrderElement(order) {
  const orderId = order.orderId || order._id;
  const orderDate = order.date ? formatDate(order.date) : formatDate(order.createdAt);
  const status = order.status || "pending";
  
  const orderCard = document.createElement("div");
  orderCard.className = "order-card";
  
  // Order summary (always visible)
  const orderSummary = document.createElement("div");
  orderSummary.className = "order-summary";
  orderSummary.innerHTML = `
    <div class="order-basic-info">
      <div class="order-id">Order #${orderId}</div>
      <div class="order-date">${orderDate}</div>
      <div class="order-status ${status}">
      <span id="status-${orderId}">${status}</span>
      </div>

      <div class="order-total">${formatCurrency(order.total)}</div>
    </div>
    <div class="order-toggle">
      <i class="fas fa-chevron-down"></i>
    </div>
  `;
  
  // Order details (hidden by default)
  const orderDetails = document.createElement("div");
  orderDetails.className = "order-details";
  orderDetails.style.display = "none";
  
  // Create items list
  const itemsList = document.createElement("div");
  itemsList.className = "order-items";
  
  // Check if items is an array or object and handle accordingly
  let itemsArray = [];
  if (Array.isArray(order.items)) {
    itemsArray = order.items;
  } else if (typeof order.items === 'object' && order.items !== null) {
    // Convert object to array
    itemsArray = Object.values(order.items);
  }
  
  itemsArray.forEach(item => {
    const itemElement = document.createElement("div");
    itemElement.className = "order-item";
    
    // Get image URL or use placeholder
    let imageUrl = item.image || item.imageUrl;
    if (imageUrl && !imageUrl.includes('/') && !imageUrl.startsWith('http')) {
      imageUrl = `Images/Menu/${imageUrl}`;
    }
    imageUrl = imageUrl || 'Images/Menu/default-food.png';
    
    // Create item HTML - adjust based on your actual item structure
    itemElement.innerHTML = `
      <div class="item-image">
        <img src="${imageUrl}" alt="${item.name || 'Product'}" onerror="this.src='Images/Menu/default-food.png'">
      </div>
      <div class="item-info">
        <div class="item-name">${item.name || "Product"}</div>
        <div class="item-attributes">
          ${item.color ? `Color: ${item.color}` : ''} 
          ${item.size ? `Size: ${item.size}` : ''}
        </div>
        <div class="item-price">${formatCurrency(item.price || 0)}</div>
      </div>
      <div class="item-quantity">Qty: ${item.quantity || 1}</div>
      <div class="item-total">${formatCurrency((item.price || 0) * (item.quantity || 1))}</div>
    `;
    
    itemsList.appendChild(itemElement);
  });
  
  // Create shipping and payment info
  const orderInfo = document.createElement("div");
  orderInfo.className = "order-info";
  
  // Format UK address properly
  let formattedAddress = '';
  if (order.address) {
    formattedAddress = `
      ${order.address.first_name || ''} ${order.address.last_name || ''}<br>
      ${order.address.street || ''}<br>
      ${order.address.city || ''}<br>
      ${order.address.county || ''}<br>
      ${order.address.postcode || ''}<br>
      United Kingdom<br>
      ${order.address.phone ? `Phone: ${order.address.phone}` : ''}
    `;
  }
  
  orderInfo.innerHTML = `
    <div class="shipping-info">
      <h4>Shipping Address</h4>
      <p>${formattedAddress}</p>
    </div>
    <div class="payment-info">
      <h4>Payment Method</h4>
      <p>
        ${order.payment?.method || 'Card'} ending in ${order.payment?.last4 || '****'}<br>
        Paid on ${orderDate}
      </p>
    </div>
  `;
  
  // Delivery timeline
  const deliveryTimeline = document.createElement("div");
  deliveryTimeline.className = "delivery-timeline";
  deliveryTimeline.innerHTML = `
    <h4>Delivery Timeline</h4>
    <div class="timeline">
      <div class="timeline-step" id="timeline-placed-${orderId}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-title">Order Placed</div>
          <div class="timeline-date">${orderDate}</div>
        </div>
      </div>
      <div class="timeline-step" id="timeline-shipped-${orderId}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-title">Out for Delivery</div>
          <div class="timeline-date">Pending</div>
        </div>
      </div>
      <div class="timeline-step" id="timeline-delivered-${orderId}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-title">Delivered</div>
          <div class="timeline-date">Pending</div>
        </div>
      </div>
    </div>
  `;
  
  // Add items, info, and timeline to details section
  orderDetails.appendChild(itemsList);
  orderDetails.appendChild(orderInfo);
  orderDetails.appendChild(deliveryTimeline);
  
  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-order-btn";
  deleteBtn.textContent = "Delete Order";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteOrder(orderId);
  });
  orderDetails.appendChild(deleteBtn);
  
  // Toggle details on summary click
  orderSummary.addEventListener("click", () => {
    const isHidden = orderDetails.style.display === "none";
    orderDetails.style.display = isHidden ? "block" : "none";
    orderSummary.querySelector(".order-toggle i").className = 
      isHidden ? "fas fa-chevron-up" : "fas fa-chevron-down";
  });
  
  // Append summary and details to card
  orderCard.appendChild(orderSummary);
  orderCard.appendChild(orderDetails);
  
  return orderCard;
}

// Delete an order
async function deleteOrder(orderId) {
  if (!confirm("Are you sure you want to delete this order?")) return;
  
  const token = localStorage.getItem("authToken");
  if (!token) return alert("You must be logged in!");

  try {
    const res = await fetch(`${API_BASE}/api/order/${orderId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) throw new Error("Failed to delete order");
    
    alert("Order deleted successfully");
    loadOrders(); // Reload orders list
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// Save user settings to backend
async function saveSettings() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return alert("You must be logged in!");

    const response = await fetch(`${API_BASE}/api/auth/update`, {
      method: "PUT", 
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: document.getElementById("settings-name").value,
        email: document.getElementById("settings-email").value,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "Failed to save settings");
    }

    const data = await response.json();
    alert("Settings saved successfully!");

    // Update displayed name/email
    document.getElementById("user-name").textContent = data.user.name;
    document.getElementById("user-email").textContent = data.user.email;
  } catch (err) {
    console.error("Error saving settings:", err);
    alert("Error saving settings: " + err.message);
  }
}

// Logout user
function logout() {
  if (confirm("Do you want to log out?")) {
    localStorage.removeItem("authToken");
    alert("You have logged out.");
    location.reload();
  }
}

async function loadPaymentMethods() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("No token found");
      document.getElementById("payment-methods-container").innerHTML = "<p>Please log in to view your payment methods</p>";
      return;
    }

    
    const response = await fetch(`${API_BASE}/api/payment/user`, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const paymentMethods = await response.json();
    const container = document.getElementById("payment-methods-container");
    container.innerHTML = "";

    if (paymentMethods.length === 0) {
      container.innerHTML = "<p>No payment methods found</p>";
      return;
    }
    
    paymentMethods.forEach(method => {
    let cardImage = '';
    const brand = method.brand?.toLowerCase() || method.type?.toLowerCase();
    if (brand === 'visa') cardImage = 'Images/cards/visa.png';
    else if (brand === 'mastercard') cardImage = 'Images/cards/mastercard.png';
    else if (brand === 'american express') cardImage = 'Images/cards/amex.png';
    else cardImage = 'Images/cards/default-card.png';

    const methodElement = document.createElement("div");
    methodElement.className = "payment-card";
    methodElement.innerHTML = `
     <div class="payment-info">
          <div class="payment-icon">
            <img src="${cardImage}" alt="${method.brand || method.type}" width="60" onerror="this.src='Images/cards/default-card.png'">
          </div>
        <div class="payment-details">
          <div>${method.brand || method.type} ending in ${method.last4}</div>
          <div>Expires ${method.exp_month}/${method.exp_year}</div>
        </div>
      </div>
      <div class="payment-actions">
        <button class="address-btn edit-payment" data-id="${method._id}">Edit</button>
        <button class="address-btn delete-payment" data-id="${method._id}">Remove</button>
      </div>
    `;
    
    container.appendChild(methodElement);
  });

  } catch (err) {
    console.error("Error loading payment methods:", err);
    document.getElementById("payment-methods-container").innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

// Open payment popup
function openPaymentPopup(mode = 'add', method = null) {
    const popup = document.getElementById("payment-popup");
    const title = document.getElementById("payment-popup-title");
    const form = document.getElementById("payment-form");
    
    if (mode === 'add') {
        title.textContent = "Add Payment Method";
        form.reset();
        document.getElementById("payment-id").value = "";
    } else if (mode === 'edit' && method) {
        title.textContent = "Edit Payment Method";
        document.getElementById("payment-id").value = method._id;
        document.getElementById("card-type").value = method.type;
        document.getElementById("card-brand").value = method.brand;
        document.getElementById("card-last4").value = method.last4;
        document.getElementById("card-exp-month").value = method.exp_month;
        document.getElementById("card-exp-year").value = method.exp_year;
        document.getElementById("card-name").value = method.name;
    }
    
    popup.classList.remove("hidden");
}

// Close payment popup
function closePaymentPopup() {
  const popup = document.getElementById("payment-popup");
  popup.classList.add("hidden");
}

// Save payment method
async function savePaymentMethod(e) {
    if (e) e.preventDefault();
    
    try {
        const token = localStorage.getItem("authToken");
        if (!token) {
            alert("You must be logged in to save payment methods");
            return;
        }

        const paymentId = document.getElementById("payment-id").value;
        const paymentData = {
            type: document.getElementById("card-type").value,
            brand: document.getElementById("card-brand").value,
            last4: document.getElementById("card-last4").value,
            exp_month: document.getElementById("card-exp-month").value,
            exp_year: document.getElementById("card-exp-year").value,
            name: document.getElementById("card-name").value
        };

        let response;
        if (paymentId) {
            // Update existing payment method
            response = await fetch(`${API_BASE}/api/payment/${paymentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentData),
            });
        } else {
            // Create new payment method
            response = await fetch(`${API_BASE}/api/payment`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(paymentData),
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to save payment method");
        }

        closePaymentPopup();
        loadPaymentMethods(); // Reload payment methods list
        alert("Payment method saved successfully!");
    } catch (err) {
        console.error("Error saving payment method:", err);
        alert("Error saving payment method: " + err.message);
    }
}

// Edit payment method
async function editPaymentMethod(paymentId) {
    try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/payment/${paymentId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const method = await response.json();
        openPaymentPopup('edit', method);
    } catch (err) {
        console.error("Error fetching payment method:", err);
        alert("Error loading payment method: " + err.message);
    }
}

// Delete payment method
async function deletePaymentMethod(paymentId) {
    if (!confirm("Are you sure you want to delete this payment method?")) return;
    
    try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch(`${API_BASE}/api/payment/${paymentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
            throw new Error("Failed to delete payment method");
        }

        loadPaymentMethods(); // Reload payment methods list
        alert("Payment method deleted successfully!");
    } catch (err) {
        console.error("Error deleting payment method:", err);
        alert("Error deleting payment method: " + err.message);
    }
}


function setupTabNavigation() {
  const menuLinks = document.querySelectorAll('.account-menu a');
  const contentSections = document.querySelectorAll('.content-section');

  function activateTab(tabId) {

    menuLinks.forEach(item => item.classList.remove('active'));
    contentSections.forEach(section => section.classList.remove('active'));
    
    const targetLink = document.querySelector(`.account-menu a[href="#${tabId}"]`);
    if (targetLink) {
      targetLink.classList.add('active');
    }
    

    const targetSection = document.getElementById(tabId);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    
    if (tabId === 'payment-details') {
      loadPaymentMethods();
    } else if (tabId === 'addresses') {
      loadAddresses();
    } else if (tabId === 'order-history') {
      loadOrders();
    }
  }


  menuLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetSection = this.getAttribute('href').substring(1);
      
      window.history.replaceState(null, null, `#${targetSection}`);
      activateTab(targetSection);
    });
  });

  
  const initialHash = window.location.hash.substring(1);
  if (initialHash) {
    activateTab(initialHash);
  } else {

    const firstTab = menuLinks[0].getAttribute('href').substring(1);
    activateTab(firstTab);
  }
}
  
// Address management functions
async function loadAddresses() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("No token found");
      return;
    }

    const response = await fetch(`${API_BASE}/api/addresses`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const addresses = await response.json();
    const addressList = document.getElementById("address-list");
    addressList.innerHTML = "";

    if (addresses.length === 0) {
      addressList.innerHTML = "<p>No addresses found</p>";
      return;
    }

    addresses.forEach(address => {
      const addressCard = document.createElement("div");
      addressCard.className = "address-card";
      
      if (address.isDefault) {
        addressCard.innerHTML += `<span class="address-type">Default</span>`;
      }
      
      addressCard.innerHTML += `
        <div class="address-name">${address.name}</div>
        <div class="address-details">
          ${address.line1}<br>
          ${address.line2 ? address.line2 + '<br>' : ''}
          ${address.city}, ${address.postcode}<br>
          United Kingdom<br>
          Phone: ${address.phone}
        </div>
        <div class="address-actions">
          <button class="address-btn edit-address" data-id="${address._id}">Edit</button>
          <button class="address-btn delete-address" data-id="${address._id}">Remove</button>
        </div>
      `;
      
      addressList.appendChild(addressCard);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-address').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const addressId = e.target.dataset.id;
        editAddress(addressId);
      });
    });

    document.querySelectorAll('.delete-address').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const addressId = e.target.dataset.id;
        deleteAddress(addressId);
      });
    });

  } catch (err) {
    console.error("Error loading addresses:", err);
    const addressList = document.getElementById("address-list");
    addressList.innerHTML = `<p>Error: ${err.message}</p>`;
  }
}

// Open popup for adding or editing address
function openAddressPopup(mode = 'add', address = null) {
  const popup = document.getElementById("address-popup");
  const title = document.getElementById("popup-title");
  const form = document.getElementById("address-form");
  
  if (mode === 'add') {
    title.textContent = "Add Address";
    form.reset();
    document.getElementById("address-id").value = "";
  } else if (mode === 'edit' && address) {
    title.textContent = "Edit Address";
    document.getElementById("address-id").value = address._id;
    document.getElementById("full-name").value = address.name;
    document.getElementById("address-line1").value = address.line1;
    document.getElementById("address-line2").value = address.line2 || "";
    document.getElementById("city").value = address.city;
    document.getElementById("postcode").value = address.postcode;
    document.getElementById("phone").value = address.phone;
    document.getElementById("is-default").checked = address.isDefault || false;
  }
  
  popup.classList.remove("hidden");
}

// Close address popup
function closeAddressPopup() {
  const popup = document.getElementById("address-popup");
  popup.classList.add("hidden");
}

// Edit address
async function editAddress(addressId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE}/api/addresses/${addressId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const address = await response.json();
    openAddressPopup('edit', address);
  } catch (err) {
    console.error("Error fetching address:", err);
    alert("Error loading address: " + err.message);
  }
}

// Save address (both new and existing)
async function saveAddress(e) {
  if (e) e.preventDefault();
  
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to save addresses");
      return;
    }

    const addressId = document.getElementById("address-id").value;
    const addressData = {
      name: document.getElementById("full-name").value,
      line1: document.getElementById("address-line1").value,
      line2: document.getElementById("address-line2").value,
      city: document.getElementById("city").value,
      postcode: document.getElementById("postcode").value,
      phone: document.getElementById("phone").value,
      isDefault: document.getElementById("is-default").checked
    };

    let response;
    if (addressId) {
      // Update existing address
      response = await fetch(`${API_BASE}/api/addresses/${addressId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });
    } else {
      // Create new address - FIXED URL (removed duplicate port)
      response = await fetch(`${API_BASE}/api/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save address");
    }

    closeAddressPopup();
    loadAddresses(); // Reload addresses list
    alert("Address saved successfully!");
  } catch (err) {
    console.error("Error saving address:", err);
    alert("Error saving address: " + err.message);
  }
}

// Delete address
async function deleteAddress(addressId) {
  if (!confirm("Are you sure you want to delete this address?")) return;
  
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE}/api/addresses/${addressId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error("Failed to delete address");
    }

    loadAddresses(); // Reload addresses list
    alert("Address deleted successfully!");
  } catch (err) {
    console.error("Error deleting address:", err);
    alert("Error deleting address: " + err.message);
  }
}

// Add event listeners for address management
function setupAddressListeners() {
  // Add address button
  const addAddressBtn = document.getElementById("add-address-btn");
  if (addAddressBtn) {
    addAddressBtn.addEventListener("click", () => openAddressPopup('add'));
  }

  // Address form submission
  const addressForm = document.getElementById("address-form");
  if (addressForm) {
    addressForm.addEventListener("submit", saveAddress);
  }

  // Cancel button
  const cancelPopupBtn = document.getElementById("cancel-popup");
  if (cancelPopupBtn) {
    cancelPopupBtn.addEventListener("click", closeAddressPopup);
  }
}

// Update the DOMContentLoaded event listener to include address setup
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();
  loadOrders();
  loadAddresses(); 
  setupTabNavigation();
  setupAddressListeners();
  checkUserData();

  const addPaymentBtn = document.getElementById("add-payment-btn");
  if (addPaymentBtn) {
      addPaymentBtn.addEventListener("click", () => openPaymentPopup('add'));
  }

  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) {
      paymentForm.addEventListener("submit", savePaymentMethod);
  }

  const cancelPaymentPopupBtn = document.getElementById("cancel-payment-popup");
  if (cancelPaymentPopupBtn) {
      cancelPaymentPopupBtn.addEventListener("click", closePaymentPopup);
  }

  const saveBtn = document.getElementById("save-settings");
  if (saveBtn) saveBtn.addEventListener("click", saveSettings);

  const logoutSectionBtn = document.querySelector('#logout .save-btn');
  if (logoutSectionBtn) {
    logoutSectionBtn.addEventListener("click", () => {
      if (confirm("Do you want to log out?")) {
        logout();
      }
    });
  }
  document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.src = 'Images/Menu/default-food.png';
            e.target.onerror = null; // Prevent infinite loop
        }
    }, true);
});

document.addEventListener("DOMContentLoaded", function() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');

    phoneInputs.forEach(input => {
        input.value = "+44 "; 

        input.addEventListener("input", function(e) {
            
            let value = input.value.replace(/\D/g, ""); 
            if (!value.startsWith("44")) {
                value = "44" + value; 
            }
            value = "+" + value;

            
            if (value.length > 13) {
                value = value.slice(0, 13);
            }

            
            input.value = value.replace(/^(\+44)(\d{0,4})(\d{0,6}).*/, function(_, code, part1, part2) {
                let formatted = code;
                if (part1) formatted += " " + part1;
                if (part2) formatted += " " + part2;
                return formatted;
            });
        });
    });
});

// Function to check if user has data and show/hide examples accordingly
function checkUserData() {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
        // User not logged in, show examples
        showDataExamples();
        return;
    }
    
    // Check if user has orders
    checkOrders();
    
    // Check if user has addresses
    checkAddresses();
    
    // Check if user has payment methods
    checkPaymentMethods();
}

// Function to show all data examples
function showDataExamples() {
    document.getElementById('order-examples').classList.remove('hidden');
    document.getElementById('address-examples').classList.remove('hidden');
    document.getElementById('payment-examples').classList.remove('hidden');
    
    // Hide loading messages
    document.getElementById('orders-container').innerHTML = '';
    document.getElementById('address-list').innerHTML = '';
    document.getElementById('payment-methods-container').innerHTML = '';
}

// Function to check if user has orders

async function checkOrders() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      // Show examples only if we're on the orders tab
      if (document.getElementById('order-history').classList.contains('active')) {
        document.getElementById('order-examples').classList.remove('hidden');
      }
      return;
    }
    
    const response = await fetch(`${API_BASE}/api/order/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      const orders = await response.json();
      // Show examples only if we're on the orders tab and no orders exist
      if (orders.length === 0 && document.getElementById('order-history').classList.contains('active')) {
        document.getElementById('order-examples').classList.remove('hidden');
      } else {
        document.getElementById('order-examples').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error("Error checking orders:", err);
    // Hide examples on error
    document.getElementById('order-examples').classList.add('hidden');
  }
}

// Function to check if user has addresses
async function checkAddresses() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      // Show examples only if we're on the addresses tab
      if (document.getElementById('addresses').classList.contains('active')) {
        document.getElementById('address-examples').classList.remove('hidden');
      }
      return;
    }
    
    const response = await fetch(`${API_BASE}/api/addresses`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (response.ok) {
      const addresses = await response.json();
      // Show examples only if we're on the addresses tab and no addresses exist
      if (addresses.length === 0 && document.getElementById('addresses').classList.contains('active')) {
        document.getElementById('address-examples').classList.remove('hidden');
      } else {
        document.getElementById('address-examples').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error("Error checking addresses:", err);
    // Hide examples on error
    document.getElementById('address-examples').classList.add('hidden');
  }
}

// Function to check if user has payment methods
async function checkPaymentMethods() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      // Show examples only if we're on the payment-details tab
      if (document.getElementById('payment-details').classList.contains('active')) {
        document.getElementById('payment-examples').classList.remove('hidden');
      }
      return;
    }
    
    const response = await fetch(`${API_BASE}/api/payment/user`, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });
    
    if (response.ok) {
      const paymentMethods = await response.json();
      // Show examples only if we're on the payment-details tab and no payment methods exist
      if (paymentMethods.length === 0 && document.getElementById('payment-details').classList.contains('active')) {
        document.getElementById('payment-examples').classList.remove('hidden');
      } else {
        document.getElementById('payment-examples').classList.add('hidden');
      }
    }
  } catch (err) {
    console.error("Error checking payment methods:", err);
    // Hide examples on error
    document.getElementById('payment-examples').classList.add('hidden');
  }
}


function activateTab(tabId) {
  const menuLinks = document.querySelectorAll('.account-menu a');
  const contentSections = document.querySelectorAll('.content-section');

  menuLinks.forEach(item => item.classList.remove('active'));
  contentSections.forEach(section => {
    section.classList.remove('active');

    const examples = section.querySelectorAll('.example');
    examples.forEach(example => example.classList.add('hidden'));
  });
  

  const targetLink = document.querySelector(`.account-menu a[href="#${tabId}"]`);
  if (targetLink) {
    targetLink.classList.add('active');
  }

  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.classList.add('active');
    
    
    if (tabId === 'order-history') {
      checkOrders();
    } else if (tabId === 'addresses') {
      checkAddresses();
    } else if (tabId === 'payment-details') {
      checkPaymentMethods();
    }
  }
}

console.log("authToken:", localStorage.getItem("authToken"));