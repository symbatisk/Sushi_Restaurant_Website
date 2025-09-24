let cart = JSON.parse(localStorage.getItem("cart")) || {};

export function getCart() {
  return { ...cart }; // Return a copy
}

export function getCartAsArray() {
  return Object.entries(cart).map(([name, item]) => ({
    name,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
    description: item.description || ""
  }));
}

export function getCartTotal() {
  return Object.values(cart).reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
}

export function updateCartItem(name, price, image, quantity, description = "") {
  if (quantity > 0) {
    cart[name] = { price, quantity, image, description };
  } else {
    delete cart[name];
  }
  saveCart();
  dispatchCartUpdated();
}

export function clearCart() {
  cart = {};
  saveCart();
  dispatchCartUpdated();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Event system to update the UI
const cartUpdateListeners = [];

export function onCartUpdate(callback) {
  cartUpdateListeners.push(callback);
}

function dispatchCartUpdated() {
  const cartData = getCart();
  cartUpdateListeners.forEach(cb => cb(cartData));
}

// Initialize cart from localStorage on load
(function initCart() {
  const savedCart = localStorage.getItem("cart");
  if (savedCart) {
    try {
      cart = JSON.parse(savedCart);
    } catch (e) {
      console.error("Error parsing cart from localStorage:", e);
      cart = {};
      saveCart();
    }
  }
  dispatchCartUpdated();
})();