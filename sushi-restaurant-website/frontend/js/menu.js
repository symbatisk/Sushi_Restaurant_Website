import { getCart, updateCartItem } from '../js/cart.js';

// Fix header when scrolling
window.onscroll = function () { headerFix(); };
var header = document.getElementById("fixHeader");
var sticky = header.offsetTop;

function headerFix() {
  if (window.pageYOffset > sticky) {
    header.classList.add("sticky");
  } else {
    header.classList.remove("sticky");
  }
}

// Handling +/– buttons in the menu
window.changeNumber = function (button, action) {
  const block = button.closest('.block_item');
  if (!block) return;

  const name = block.querySelector('p').textContent.trim();
  const priceText = block.querySelector('.price').textContent.trim();
  const price = parseFloat(priceText.replace('p', ''));
  const image = block.querySelector('img').src;

  const input = block.querySelector('.numberInput');
  let current = parseInt(input.value) || 0;

  if (action === 'increment') current++;
  if (action === 'decrement' && current > 0) current--;

  input.value = current;

  // Update cart through cart.js
  updateCartItem(name, price, image, current);
};

