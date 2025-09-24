import { getCart, getCartAsArray, getCartTotal, clearCart } from "../js/cart.js";

const API_BASE = window.location.origin.includes("localhost")
  ? "http://localhost:5001"
  : "https://sushi-restaurant-website-0z5c.onrender.com";


let isDeliveryAvailable = false;
let deliveryCalculationMethod = null;
let deliveryCheckTimeout = null

const POSTCODE_ZONES = {
  SW: { cost: 4, time: 15 },
  E:  { cost: 6, time: 25 },
  W:  { cost: 6, time: 25 },
  N:  { cost: 6, time: 25 },
  NW: { cost: 7, time: 30 },
  SE: { cost: 7, time: 30 },
  DEFAULT: { cost: 9, time: 45 }
};

function getCardBrand(cardNumber) {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  if (/^4/.test(cleanNumber)) return "Visa";
  if (/^5[1-5]/.test(cleanNumber)) return "Mastercard";
  if (/^3[47]/.test(cleanNumber)) return "American Express";
  if (/^6(?:011|5)/.test(cleanNumber)) return "Discover";
  return "Unknown";
}

// Initialization when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Update cart summary
  updateOrderSummary();
  
  // Initialize all handlers
  initEventHandlers();
  initPaymentFormatting();
  initAddressHandling();
  
  // Force load addresses after a short delay
  setTimeout(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      loadSavedAddresses(token);
    }
  }, 500);
});


// Update order summary information
function updateOrderSummary() {
  const cart = getCart();
  const cartItemsContainer = document.querySelector('.cart-items');
  const cartBadge = document.querySelector('.badge');
  const subtotalEl = document.getElementById('subtotal');
  const orderTotalEl = document.getElementById('orderTotal');

  // Clear container
  cartItemsContainer.innerHTML = '';

  let itemCount = 0;
  let subtotal = 0;

  // Add items from cart
  for (const [name, item] of Object.entries(cart)) {
    itemCount += item.quantity;
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.image}" alt="${name}">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${name}</div>
        <div class="cart-item-desc">${item.description}</div>
      </div>
      <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
    `;
    cartItemsContainer.appendChild(cartItem);
  }

  // Update badge with total number of items
  if (cartBadge) cartBadge.textContent = itemCount;

  // Update subtotal and total
  if (subtotalEl) subtotalEl.textContent = `£${subtotal.toFixed(2)}`;
  if (orderTotalEl) orderTotalEl.textContent = `£${subtotal.toFixed(2)}`;

  // Update delivery fee if postcode is already entered
  const postcodeInput = document.querySelector('input[name="postcode"]');
  if (postcodeInput && postcodeInput.value) {
    updateDeliveryFee();
  }
}

// Initialize event handlers
function initEventHandlers() {
  const confirmBtn = document.querySelector('.confirm-btn');
  const postcodeInput = document.querySelector('input[name="postcode"]');

  console.log("Initializing event handlers");
  console.log("Confirm button found:", !!confirmBtn);
  console.log("Postcode input found:", !!postcodeInput);

  // Update delivery cost when postcode changes
  if (postcodeInput) {
    postcodeInput.addEventListener('input', updateDeliveryFee);
  }

  // Handle order confirmation button
  if (confirmBtn) {
    confirmBtn.type = "button";
    
    confirmBtn.addEventListener('click', function(e) {
      console.log("Confirm button clicked");
      e.preventDefault();
      confirmOrder();
    });
  } else {
    console.error("Confirm button not found!");
  }
}

// Update delivery cost
async function updateDeliveryFee() {
  const postcode = document.querySelector('input[name="postcode"]').value.trim().toUpperCase();
  const deliveryPriceEl = document.getElementById('deliveryPrice');
  const deliveryTimeEl = document.getElementById('deliveryTime');
  const orderTotalEl = document.getElementById('orderTotal');
  const subtotalText = document.getElementById('subtotal').textContent;
  const subtotal = parseFloat(subtotalText.replace(/[^\d.]/g, '')) || 0;
  
  if (deliveryCheckTimeout) {
    clearTimeout(deliveryCheckTimeout);
  }

  isDeliveryAvailable = false;
  deliveryCalculationMethod = null;

  // If no postcode, set default values
  if (!postcode) {
    if (deliveryPriceEl) deliveryPriceEl.textContent = '£0.00';
    if (deliveryTimeEl) deliveryTimeEl.textContent = '';
    if (orderTotalEl) orderTotalEl.textContent = `£${subtotal.toFixed(2)}`;
    return;
  }

  const isCompletePostcode = postcode.includes(' ') && postcode.length >= 6;

  if (!isCompletePostcode) {
   
    if (deliveryTimeEl) deliveryTimeEl.textContent = 'Calculating...';
    if (deliveryPriceEl) deliveryPriceEl.textContent = '£0.00';
    return;
  }

  
  deliveryCheckTimeout = setTimeout(async () => {
    try {
      
      if (deliveryTimeEl) deliveryTimeEl.textContent = 'Calculating...';

      
      const response = await fetch(`${API_BASE}/api/delivery/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ customerAddress: postcode })
      });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (response.status === 400 && errorData && errorData.error) {

        if (deliveryTimeEl) deliveryTimeEl.textContent = 'Sorry, we do not deliver to this address. Please enter a different address.';
        if (deliveryPriceEl) deliveryPriceEl.textContent = 'N/A';
        isDeliveryAvailable = false;
        deliveryCalculationMethod = 'api';
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Update UI with API response
    if (deliveryPriceEl) deliveryPriceEl.textContent = `£${data.cost.toFixed(2)}`;
    if (deliveryTimeEl) deliveryTimeEl.textContent = `Estimated delivery: ${data.duration_min} minutes`;
    if (orderTotalEl) orderTotalEl.textContent = `£${(subtotal + data.cost).toFixed(2)}`;

    isDeliveryAvailable = true;
    deliveryCalculationMethod = 'api';

  } catch (error) {
  console.error("Error calculating delivery:", error);
  
  // Fallback to static pricing if API fails
  deliveryCalculationMethod = 'fallback';

  const zone = determineZone(postcode);
    if (zone === 'DEFAULT') {
      
      isDeliveryAvailable = false;
      if (deliveryTimeEl) deliveryTimeEl.textContent = 'Sorry, we do not deliver to this address';
      if (deliveryPriceEl) deliveryPriceEl.textContent = 'N/A';
    } else {
      
      isDeliveryAvailable = true;
      let fee = POSTCODE_ZONES[zone].cost;
      let deliveryTime = POSTCODE_ZONES[zone].time + 20; 

      if (deliveryPriceEl) deliveryPriceEl.textContent = `£${fee.toFixed(2)}`;
      if (deliveryTimeEl) deliveryTimeEl.textContent = `Estimated delivery: ${deliveryTime} minutes`;
      if (orderTotalEl) orderTotalEl.textContent = `£${(subtotal + fee).toFixed(2)}`;
    }
  }
}, 800);
}

function determineZone(postcode) {
  if (!postcode) return 'DEFAULT';
  
  if (/^SW[0-9]/.test(postcode)) return 'SW';
  if (/^E[0-9]/.test(postcode)) return 'E';
  if (/^W[0-9]/.test(postcode)) return 'W';
  if (/^N[0-9]/.test(postcode)) return 'N';
  if (/^NW[0-9]/.test(postcode)) return 'NW';
  if (/^SE[0-9]/.test(postcode)) return 'SE';
  
  return 'DEFAULT';
}

function initAddressHandling() {
  console.log("Initializing address handling");
  
  const token = localStorage.getItem("authToken");
  const addressForm = document.getElementById("addressForm");
  const savedAddresses = document.getElementById("savedAddresses");
  const showBtn = document.getElementById("showAddressForm");
  const hideBtn = document.getElementById("hideAddressForm");

  
  if (!token) {
    console.log("No auth token found - showing address form");
    
    if (addressForm) addressForm.style.display = "block";
    if (savedAddresses) savedAddresses.style.display = "none";
    if (showBtn) showBtn.style.display = "none";
    if (hideBtn) hideBtn.style.display = "none";
    
    const addressContainer = document.getElementById("savedAddresses");
    if (addressContainer) {
      addressContainer.innerHTML = "<p>Please sign in to use saved addresses</p>";
    }
  } else {
    
    setupAddressFormToggle();
    loadSavedAddresses(token);
  }
  
  setupBillingShippingToggle();
  setupPhoneMask();
}

function setupBillingShippingToggle() {
  const sameAsBillingCheckbox = document.getElementById("sameAsBilling");
  const billingAddressSection = document.getElementById("billingAddress");

  if (sameAsBillingCheckbox && billingAddressSection) {
   
    billingAddressSection.style.display = sameAsBillingCheckbox.checked ? "none" : "block";

    sameAsBillingCheckbox.addEventListener("change", function() {
      billingAddressSection.style.display = this.checked ? "none" : "block";
    });
  }
}

function setupAddressFormToggle() {
  console.log("Setting up address form toggle");
  
  const showBtn = document.getElementById("showAddressForm");
  const hideBtn = document.getElementById("hideAddressForm");
  const addressForm = document.getElementById("addressForm");
  const savedAddresses = document.getElementById("savedAddresses");

  if (showBtn && hideBtn && addressForm && savedAddresses) {
    console.log("All elements found for address form toggle");
    
    showBtn.addEventListener("click", () => {
      console.log("Show address form clicked");
      addressForm.style.display = "block";
      savedAddresses.style.display = "none";
      showBtn.style.display = "none";
      hideBtn.style.display = "inline-block";
      
    
      addressForm.reset();
    });

    hideBtn.addEventListener("click", () => {
      console.log("Hide address form clicked");
      addressForm.style.display = "none";
      savedAddresses.style.display = "flex";
      showBtn.style.display = "inline-block";
      hideBtn.style.display = "none";
      
      const token = localStorage.getItem("authToken");
      if (token) {
        loadSavedAddresses(token);
      }
    });
  } else {
    console.error("Some elements for address form toggle not found");
  }
}

function fillAddressForm(addr) {
  console.log("Filling address form with:", addr);
  
  const nameParts = addr.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  
  let phone = addr.phone;
  if (phone.startsWith('+44')) {
    phone = phone.substring(3); 
  } else if (phone.startsWith('44')) {
    phone = phone.substring(2);
  }

  const fields = {
    'first_name': firstName,
    'last_name': lastName,
    'address_line1': addr.line1,
    'city': addr.city,
    'postcode': addr.postcode,
    'phone_number': phone 
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.querySelector(`input[name="${name}"]`);
    if (input) {
      input.value = value;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  if (addr.line2) {
    const line2Input = document.querySelector('input[name="address_line2"]');
    if (line2Input) line2Input.value = addr.line2;
  }

 
  if (addr.postcode) {
    updateDeliveryFee();
  }
}


async function loadSavedAddresses(token) {
  console.log("Loading saved addresses with token:", token);
  
  try {
    const addressContainer = document.getElementById("savedAddresses");
    if (!addressContainer) {
      console.error("Address container not found");
      return;
    }

    addressContainer.innerHTML = '<p>Loading addresses...</p>';
    
    const res = await fetch(`${API_BASE}/api/addresses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      console.log("Not authorized to load addresses");
      addressContainer.innerHTML = "<p>Please sign in to view saved addresses</p>";
      return;
    }
    
    if (!res.ok) {
      console.log("Failed to load addresses:", res.status);
      addressContainer.innerHTML = "<p>Failed to load addresses. Please try again.</p>";
      return;
    }
    
    const addresses = await res.json();
    console.log("Addresses loaded:", addresses);
    
    addressContainer.innerHTML = '';

    if (!addresses || addresses.length === 0) {
      addressContainer.innerHTML = '<p>No saved addresses</p>';
      return;
    }

    addresses.forEach(addr => {
      const card = document.createElement("div");
      card.classList.add("address-card");
      card.innerHTML = `
        <p><strong>${addr.name}</strong></p>
        <p>${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}</p>
        <p>${addr.city}, ${addr.postcode}</p>
        <p>${addr.phone}</p>
      `;
      
      card.addEventListener("click", () => {
        document.querySelectorAll(".address-card").forEach(c => 
          c.classList.remove("selected")
        );
        card.classList.add("selected");
        fillAddressForm(addr);
      });
      
      addressContainer.appendChild(card);
    });
    
  } catch (err) {
    console.error("Error loading addresses", err);
    const addressContainer = document.getElementById("savedAddresses");
    if (addressContainer) {
      addressContainer.innerHTML = "<p>Error loading addresses. Please try again.</p>";
    }
  }
}


function setupPhoneMask() {
  const phoneInput = document.querySelector("input[name=phone_number]");
  if (phoneInput) {
    Inputmask({
      mask: "+44 7999 999999",
      placeholder: " ",
      showMaskOnHover: false,
    }).mask(phoneInput);
  }
}


// async function confirmOrder() {
//   console.log("confirmOrder function called");
  
//   const token = localStorage.getItem("authToken");
//   const cart = getCart();

//   console.log("Cart items:", Object.keys(cart).length);
//   console.log("Auth token:", !!token);

//   if (Object.keys(cart).length === 0) {
//     alert("Your cart is empty!");
//     return;
//   }

//   const requiredFields = [
//     'first_name', 'last_name', 'address_line1', 
//     'city', 'postcode', 'phone_number'
//   ];

//   let isValid = true;
//   requiredFields.forEach(field => {
//     const input = document.querySelector(`input[name="${field}"]`);
//     if (!input || !input.value.trim()) {
//       isValid = false;
//       input.style.borderColor = 'red';
//       console.error(`Field ${field} is empty`);
//     } else {
//       input.style.borderColor = '';
//     }
//   });

//   const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
//   if (!paymentMethod) {
//     alert("Please select a payment method");
//     return;
//   }
  
//   const paymentMethodValue = paymentMethod.value;
//   if (paymentMethodValue === 'credit' || paymentMethodValue === 'debit') {
//     const paymentFields = ['cardname', 'cardnumber', 'expiration', 'cvv'];
//     paymentFields.forEach(field => {
//       const input = document.querySelector(`input[name="${field}"]`);
//       if (!input || !input.value.trim()) {
//         isValid = false;
//         input.style.borderColor = 'red';
//         console.error(`Field ${field} is empty`);
//       } else {
//         input.style.borderColor = '';
//       }
//     });
//   }

//   if (!isValid) {
//     alert("Please fill in all required fields");
//     return;
//   }

//   console.log("All validation passed, proceeding with order");

//   const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
//   const subtotalText = document.getElementById('subtotal').textContent;
//   const deliveryText = document.getElementById('deliveryPrice').textContent;
  
//   const subtotal = parseFloat(subtotalText.replace(/[^\d.]/g, '')) || 0;
//   const delivery = parseFloat(deliveryText.replace(/[^\d.]/g, '')) || 0;
//   const total = subtotal + delivery;

//   const billingAddress = {
//     first_name: document.querySelector("input[name='first_name']").value,
//     last_name: document.querySelector("input[name='last_name']").value,
//     street: document.querySelector("input[name='address_line1']").value,
//     line2: document.querySelector("input[name='address_line2']").value || "",
//     city: document.querySelector("input[name='city']").value,
//     zip_code: document.querySelector("input[name='postcode']").value,
//     phone: document.querySelector("input[name='phone_number']").value,
//     contact_email: document.querySelector("input[name='contact_email']").value || ""
//   };

//   let paymentData = {
//     method: paymentMethodValue
//   };

//   if (paymentMethodValue === 'credit' || paymentMethodValue === 'debit') {
//     const cardNumber = document.querySelector('input[name="cardnumber"]').value.replace(/\s+/g, '');
//     const expiration = document.querySelector('input[name="expiration"]').value.split('/');
    
//     paymentData = {
//       ...paymentData,
//       brand: getCardBrand(cardNumber),
//       last4: cardNumber.slice(-4),
//       exp_month: expiration[0] || '',
//       exp_year: expiration[1] || '',
//       name: document.querySelector('input[name="cardname"]').value
//     };
//   }

//   if (!isDeliveryAvailable) {
//       alert('Sorry, we do not deliver to this address. Please choose a different address.');
//     return;
//   }

//   try {
//     const orderData = {
//       id: orderId,
//       items: getCartAsArray(),
//       subtotal,
//       delivery,
//       total,
//       address: billingAddress,
//       payment: paymentData,
//       date: new Date().toISOString()
//     };

//     console.log("Sending order data:", orderData);

//     const response = await fetch(`${API_BASE}/api/order`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Accept": "application/json",
//         "Authorization": token ? `Bearer ${token}` : ""
//       },
//       body: JSON.stringify(orderData)
//     });

//     console.log("Order API response status:", response.status);

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error("Order API error:", errorText);
//       throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
//     }

//     const result = await response.json();
//     console.log("Order API result:", result);

//     if (result.success) {
//       clearCart();
//       showOrderSuccess(result.orderId || orderId);
//     } else {
//       alert("Error: order was not accepted");
//     }

//   } catch (err) {
//     console.error("Error while sending order:", err);
//     alert("Could not connect to the server. Please check your internet connection and try again.");
//   }
// }

async function confirmOrder() {
  console.log("confirmOrder function called");

  const token = localStorage.getItem("authToken");
  const cart = getCart();
  const isGuest = !token;

  if (Object.keys(cart).length === 0) {
    alert("Your cart is empty!");
    return;
  }


  let isValid = true;
  const requiredFields = ['first_name', 'last_name', 'address_line1', 'city', 'postcode', 'phone_number'];
  requiredFields.forEach(field => {
    const input = document.querySelector(`#addressForm input[name="${field}"]`);
    if (!input || !input.value.trim()) {
      isValid = false;
      if (input) input.style.borderColor = 'red';
      console.error(`Field ${field} is empty`);
    } else {
      if (input) input.style.borderColor = '';
    }
  });


  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
  if (!paymentMethod) {
    alert("Please select a payment method");
    return;
  }

  const paymentMethodValue = paymentMethod.value;

  
  if ((paymentMethodValue === 'credit' || paymentMethodValue === 'debit')) {
    const paymentFields = ['cardname', 'cardnumber', 'expiration', 'cvv'];
    paymentFields.forEach(field => {
      const input = document.querySelector(`input[name="${field}"]`);
      if (!input || !input.value.trim()) {
        isValid = false;
        if (input) input.style.borderColor = 'red';
        console.error(`Field ${field} is empty`);
      } else {
        if (input) input.style.borderColor = '';
      }
    });
  }

  if (!isValid) {
    alert("Please fill in all required fields");
    return;
  }

  console.log("All validation passed, proceeding with order");

  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const subtotalText = document.getElementById('subtotal')?.textContent || '0';
  const deliveryText = document.getElementById('deliveryPrice')?.textContent || '0';

  const subtotal = parseFloat(subtotalText.replace(/[^\d.]/g, '')) || 0;
  const delivery = parseFloat(deliveryText.replace(/[^\d.]/g, '')) || 0;
  const total = subtotal + delivery;


  const addressFormFields = ['first_name','last_name','address_line1','address_line2','city','postcode','phone_number','contact_email'];
  const billingAddress = {};
  addressFormFields.forEach(field => {
    const input = document.querySelector(`#addressForm input[name="${field}"]`);
    billingAddress[field] = input ? input.value.trim() : '';
  });

  
  let paymentData = { method: paymentMethodValue };
  if (paymentMethodValue === 'credit' || paymentMethodValue === 'debit') {
    const cardNumberInput = document.querySelector('input[name="cardnumber"]');
    const expirationInput = document.querySelector('input[name="expiration"]');
    const cardNameInput = document.querySelector('input[name="cardname"]');
    const cardNumber = cardNumberInput ? cardNumberInput.value.replace(/\s+/g, '') : '';
    const expiration = expirationInput ? expirationInput.value.split('/') : ['', ''];
    paymentData = {
      ...paymentData,
      brand: getCardBrand(cardNumber),
      last4: cardNumber.slice(-4),
      exp_month: expiration[0] || '',
      exp_year: expiration[1] || '',
      name: cardNameInput ? cardNameInput.value : ''
    };
  }

  if (!isDeliveryAvailable) {
    alert('Sorry, we do not deliver to this address. Please choose a different address.');
    return;
  }

  try {
    const orderData = {
      id: orderId,
      items: getCartAsArray(),
      subtotal,
      delivery,
      total,
      address: billingAddress,
      payment: paymentData,
      date: new Date().toISOString()
    };

    console.log("Sending order data:", orderData);

    const response = await fetch(`${API_BASE}/api/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Order API error:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Order API result:", result);

    if (result.success) {
      clearCart();
      showOrderSuccess(result.orderId || orderId, !isGuest);
    } else {
      alert("Error: order was not accepted");
    }

  } catch (err) {
    console.error("Error while sending order:", err);
    alert("Could not connect to the server. Please check your internet connection and try again.");
  }
}


// function showOrderSuccess(orderId, showHistory = true) {
//   const container = document.createElement("div");
//   container.className = "order-success-overlay";
//   container.innerHTML = `
//     <div class="order-success">
//       <h2>✅ Order placed successfully!</h2>
//       <p>Your order number is: <strong>${orderId}</strong></p>
//       <div class="order-actions">
//         <button id="viewOrderHistory">View Order History</button>
//         <button id="goHome">Go to Home</button>
//       </div>
//     </div>
//   `;
//   document.body.appendChild(container);

//   document.getElementById("viewOrderHistory").onclick = () => {
//     container.remove();
//     window.location.href = "account.html#order-history";
//   };

//   document.getElementById("goHome").onclick = () => {
//     container.remove();
//     window.location.href = "home.html";
//   };
// }

function showOrderSuccess(orderId, showHistory = true) {
  const container = document.createElement("div");
  container.className = "order-success-overlay";
  container.innerHTML = `
    <div class="order-success">
      <h2>✅ Order placed successfully!</h2>
      <p>Your order number is: <strong>${orderId}</strong></p>
      <div class="order-actions">
        ${showHistory ? '<button id="viewOrderHistory">View Order History</button>' : ''}
        <button id="goHome">Go to Home</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  if (showHistory) {
    const historyBtn = document.getElementById("viewOrderHistory");
    if (historyBtn) historyBtn.onclick = () => {
      container.remove();
      window.location.href = "account.html#order-history";
    };
  }

  const homeBtn = document.getElementById("goHome");
  if (homeBtn) homeBtn.onclick = () => {
    container.remove();
    window.location.href = "home.html";
  };
}

function initPaymentFormatting() {
  const cardNumberInput = document.querySelector('input[name="cardnumber"]');
  const expirationInput = document.querySelector('input[name="expiration"]');
  const cvvInput = document.querySelector('input[name="cvv"]');
  let realCVV = "";

  const errorMsg = document.createElement("div");
  errorMsg.style.color = "red";
  errorMsg.style.fontSize = "14px";
  errorMsg.style.marginTop = "5px";
  errorMsg.textContent = "Please enter full 16-digit card number";
  errorMsg.style.display = "none";
  cardNumberInput.parentNode.appendChild(errorMsg);


  cardNumberInput.addEventListener("input", e => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 16) value = value.slice(0, 16);

    e.target.value = value.replace(/(\d{4})(?=\d)/g, "$1 "); 


    errorMsg.style.display = (value.length < 16) ? "block" : "none";
  });

  
  expirationInput.addEventListener("input", e => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 4) value = value.slice(0, 4);

    if (value.length >= 3) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }

    e.target.value = value;
  });

   const cvvErrorMsg = document.createElement("div");
  cvvErrorMsg.style.color = "red";
  cvvErrorMsg.style.fontSize = "14px";
  cvvErrorMsg.style.marginTop = "5px";
  cvvErrorMsg.textContent = "Please enter 3-digit CVV";
  cvvErrorMsg.style.display = "none";
  cvvInput.parentNode.appendChild(cvvErrorMsg);

  cvvInput.addEventListener("input", e => {
    let value = e.target.value.replace(/\D/g, ""); 
    if (value.length > 3) value = value.slice(0, 3);

    e.target.value = value;

   
    cvvErrorMsg.style.display = (value.length < 3) ? "block" : "none";
  });


  cvvInput.getRealValue = () => realCVV;

  const form = document.querySelector("form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Card Number:", cardInput.value.replace(/\s/g, "")); 
      console.log("Real CVV:", realCVV);
      
    });
  }
}

