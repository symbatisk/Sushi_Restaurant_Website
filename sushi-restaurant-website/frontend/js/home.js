
// Handling Image Modal Display
var imagModal = document.getElementById("ChangeImgModal");
var img = document.getElementById("imag-change");
var modalImg = document.getElementById("img01");
var captionText = document.getElementById("caption");

// Show image modal on image click
img.onclick = function() {
  imagModal.style.display = "block";
  modalImg.src = this.src;
  captionText.innerHTML = this.alt;
};

// Close image modal on close button click
var span = document.getElementsByClassName("close")[0];
span.onclick = function() {
  imagModal.style.display = "none";
};
