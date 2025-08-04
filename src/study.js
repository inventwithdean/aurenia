import {
  handleTextSelection,
  handleWhatsThis,
  handleDefine,
  handleTranslate,
} from "./text_selection_menu.js";
import {
  handleGenerateQuiz,
  setPageNumber,
  handleSummarize,
} from "./page_context_menu.js";
import { redrawPages } from "./pdf_handler.js";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { toggleChatTab } from "./companion_panel.js";

export let ocr_mode = false;

export let language = null;

export let pdf_context = false;

// Sets up event listeners
window.addEventListener("DOMContentLoaded", async () => {
  // Language Selector
  const langSelect = document.getElementById("language-select");
  language = localStorage.getItem("language") || "English";
  langSelect.value = language;
  langSelect.addEventListener("change", () => {
    language = langSelect.value;
    localStorage.setItem("language", language);
  });

  // OCR Toggle Button
  document.querySelectorAll(".ocr-toggle-btn").forEach((ocr_btn) => {
    ocr_btn.addEventListener("click", () => {
      ocr_mode = !ocr_mode;
      if (ocr_mode) {
        ocr_btn.classList.add("bg-red-500", "dark:bg-gray-700");
      } else {
        ocr_btn.classList.remove("bg-red-500", "dark:bg-gray-700");
      }
    });
  });

  // Back to Library from PDF View
  document.getElementById("back-to-library").addEventListener("click", () => {
    window.location.href = "index.html";
    document.getElementById("library-view").classList.add("hidden");
    document.getElementById("pdf-study-view").classList.remove("hidden");
  });

  // Handling Text Selection
  document
    .querySelector("#pdf-container")
    .addEventListener("mouseup", async (e) => {
      handleTextSelection();
    });

  // Handling the text selection menu functions
  document.getElementById("whatsthis-btn").addEventListener("click", (e) => {
    handleWhatsThis();
  });
  document.getElementById("define-btn").addEventListener("click", (e) => {
    handleDefine();
  });
  document.getElementById("translate-btn").addEventListener("click", (e) => {
    handleTranslate();
  });

  // Generate Quiz Event Listener
  document
    .getElementById("generate-quiz-btn")
    .addEventListener("click", (e) => {
      handleGenerateQuiz(ocr_mode);
    });

  // Summary Generation Button event listener
  document
    .getElementById("generate-summary-btn")
    .addEventListener("click", () => {
      handleSummarize(ocr_mode);
    });

  // Full Screen
  document.addEventListener("keydown", async (event) => {
    if (event.key == "F11") {
      event.preventDefault();
      const isFullScreen = await getCurrentWindow().isFullscreen();
      await getCurrentWindow().setFullscreen(!isFullScreen);
    }
  });

  // Calculating Header Height and setting it as a variable
  const header = document.querySelector("header"); // or whatever selector
  const headerHeight = header.offsetHeight; // includes padding+border
  // store it in CSS var so CSS can use it
  document.documentElement.style.setProperty(
    "--header-height",
    `${headerHeight}px`
  );

  // Companion Button Toggle
  let companionButton = document.getElementById("companion-button");
  companionButton.addEventListener("click", () => {
    toggleChatTab();
  });

  // Handling resizing of window
  window.addEventListener("resize", () => {
    redrawPages();
  });

  // Handling Right click context menu
  document
    .querySelector("#pdf-container")
    .addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const pageElement = e.target.closest("[data-page-number]");
      if (pageElement) {
        let pageNumber = Number(pageElement.getAttribute("data-page-number"));
        setPageNumber(pageNumber);
        const menu = document.getElementById("page-context-menu");
        menu.style.visibility = "visible";
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
      } else {
        console.warn("Could not find page element for selection!");
      }
    });
  // Hide context menu when clicked on somewhere in the pdf container
  document.querySelector("#pdf-container").addEventListener("click", (e) => {
    const menu = document.getElementById("page-context-menu");
    menu.style.visibility = "hidden";
  });

  // Add PDF Context Button event listener
  let pdf_context_btn = document.getElementById("pdf-context-btn");
  pdf_context_btn.addEventListener("click", (e) => {
    pdf_context = !pdf_context;
    if (pdf_context) {
      pdf_context_btn.classList.remove(
        "bg-gray-200",
        "dark:bg-gray-700",
        "opacity-60"
      );
      pdf_context_btn.classList.add(
        "bg-white",
        "dark:bg-gray-500",
        "shadow-md"
      );
    } else {
      pdf_context_btn.classList.remove(
        "bg-white",
        "dark:bg-gray-500",
        "shadow-md"
      );
      pdf_context_btn.classList.add(
        "bg-gray-200",
        "dark:bg-gray-700",
        "opacity-60"
      );
    }
  });
});
