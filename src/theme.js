// Get theme from local storage, defaults to light mode if it doesn't exists yet.
let theme = localStorage.getItem("theme") || "light";
// Toggle everything to dark mode if its dark
if (theme == "dark") {
  document.documentElement.classList.toggle("dark");
}

function updatePDFContainerTheme() {
  let pdfContainer = document.getElementById("pdf-container");
  if (theme == "dark") {
    pdfContainer.style.filter =
      "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
  } else {
    pdfContainer.style.filter = "";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // Sets filter for PDF Container according to theme
  updatePDFContainerTheme();
  // For every theme toggle button
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    // Set the text according to the theme
    btn.textContent = theme == "light" ? "☀️" : "🌑";
    // On Theme Change
    btn.addEventListener("click", () => {
      // Toggle the theme
      document.documentElement.classList.toggle("dark");
      // Set the theme to inverse of current value.
      theme = theme == "light" ? "dark" : "light";
      localStorage.setItem("theme", theme);
      // Update the text on every theme toggle button
      document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
        btn.textContent = theme == "light" ? "☀️" : "🌑";
      });
      // Update the filter of pdf-container accordingly
      updatePDFContainerTheme();
    });
  });
});
