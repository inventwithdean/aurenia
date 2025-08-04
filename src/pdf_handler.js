import { readFile } from "@tauri-apps/plugin-fs";
const CMAP_URL = "public/cmaps/";
const CMAP_PACKED = true;
const ENABLE_XFA = true;
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { PDFPageView, EventBus } from "pdfjs-dist/web/pdf_viewer";
import { BaseDirectory } from "@tauri-apps/plugin-fs";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ocr_mode } from "./study";
import { recognizeText } from "./ocr";

// Set pdfjs-dist's worker so that it can work properly
GlobalWorkerOptions.workerSrc = workerUrl;

// Holds name of currently open book
export let bookName = null;
// Holds document of currently opened PDF.
let pdfDocument = null;
// Holds number of pages in the PDF.
let numPages = null;
// HTML element that contains our PDF pages.
let pdfContainer = null;
// Used by PDFPageView
let eventBus = new EventBus();
// Used to scale PDF
let scale = null;

// Get currently visible pages as array of strings like ["1", "2"]
export function getVisiblePages() {
  if (!pdfContainer) pdfContainer = document.getElementById("pdf-container");
  // Get every div with class page in the pdf-container
  const pages = pdfContainer.querySelectorAll("div.page");
  // Filter pages which are visible in the viewport
  let visiblePages = Array.from(pages).filter((page) => {
    const rect = page.getBoundingClientRect();
    const isVerticallyInView =
      rect.top < window.innerHeight && rect.bottom >= 0;
    return isVerticallyInView;
  });
  // Map the HTML elements to their page number
  visiblePages = visiblePages.map((page) => {
    return page.getAttribute("data-page-number");
  });
  return visiblePages;
}

// Returns array buffer containing png image of cover page of PDF
export async function getPDFCoverAndNumPages(filepath) {
  // Reads the PDF.
  const data = await readFile(filepath, { baseDir: BaseDirectory.AppData });
  const loadingTask = getDocument({ data });
  // Sets Global Variable, so that getPageText for embedding works
  pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  // Get first page of the PDF
  const page = await pdfDocument.getPage(1);
  // Set scale to 0.5 as we don't need very high quality image for thumbnail
  const scale = 0.5;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  // Render first page on the canvas
  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;
  // Get png blob using canvas
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  // Get the array buffer of the blob
  const ab = await blob.arrayBuffer();
  // Returns cover's array buffer and numPages
  return { cover: ab, numPages: numPages };
}

// Observer for lazy loading of the PDF
const observer = new IntersectionObserver(observeIntersection, {
  root: null,
  threshold: 0.1,
});

// Loads and renders blank pages.
// Actual page rendering is handled lazily using the Intersection Observer
export async function loadPDF(fileParams) {
  const filename = fileParams.filename;
  bookName = filename;
  document.getElementById("pdf-title").textContent = fileParams.title;
  const data = await readFile(filename, { baseDir: BaseDirectory.AppData });
  const loadingTask = getDocument({
    data,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    enableXfa: ENABLE_XFA,
  });
  pdfDocument = await loadingTask.promise;
  await renderBlankPages();
}

// Callback of Intersection observer
// Observes all the entries (blank pages with correct height) to render target and neighboring pages
async function observeIntersection(entries) {
  entries.forEach(async (entry) => {
    if (entry.isIntersecting) {
      const currentPageNum = Number(entry.target.id.replace("page", ""));
      // Draw current Page
      await drawPage(currentPageNum);
      // Draw neighbours
      for (let i = 1; i <= 3; i++) {
        let futurePage = currentPageNum + i;
        if (futurePage <= numPages) await drawPage(futurePage);
        let pastPage = currentPageNum - i;
        if (pastPage >= 1) await drawPage(pastPage);
      }
    }
  });
}

// Redraws blank pages with new scale (called on window resize)
export async function redrawPages() {
  // Unobserve everything
  observer.disconnect();
  for (let i = 1; i <= numPages; i++) {
    const container = document.getElementById(`page${i}`);
    container.dataset.rendered = "false";
    if (container) {
      container.innerHTML = "";
      const pdfPage = await pdfDocument.getPage(i);
      // Calculate new scale
      const containerWidth = pdfContainer.clientWidth;
      const unscaledViewportWidth = pdfPage.getViewport({ scale: 1 }).width;
      const unscaledViewportHeight = pdfPage.getViewport({ scale: 1 }).height;
      const CSS_UNITS = 96.0 / 72.0;
      // 1 PDF unit is 1.33333... units
      const scaledViewportWidth = unscaledViewportWidth * CSS_UNITS;
      const scaledViewportHeight = unscaledViewportHeight * CSS_UNITS;
      scale = containerWidth / scaledViewportWidth; // proper scale

      container.style.height = `${scaledViewportHeight * scale}px`;
    }
  }
  // Observe again.
  for (let i = 1; i <= numPages; i++) {
    const container = document.getElementById(`page${i}`);
    observer.observe(container);
  }
}

// Actually renders the page.
async function drawPage(pageNum) {
  // Render page on container if not already drawn
  const container = document.getElementById(`page${pageNum}`);
  // TODO: Fix the Race condition
  if (container.dataset.rendered == "true") return;
  container.dataset.rendered = "true";
  const pdfPage = await pdfDocument.getPage(pageNum);
  const pdfPageView = new PDFPageView({
    container: container,
    id: pageNum,
    scale: scale,
    defaultViewport: pdfPage.getViewport({ scale: 1 }),
    eventBus,
  });
  pdfPageView.setPdfPage(pdfPage);
  await pdfPageView.draw();
  container.style.height = "auto"; // PageContainer's height will match with the rendered page (as latter's position is relative)
}

// Renders blank pages according to the correct scale.
async function renderBlankPages() {
  if (!pdfContainer) pdfContainer = document.getElementById("pdf-container");
  numPages = pdfDocument.numPages;
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pageWrapper = document.createElement("div");
    pageWrapper.className = "rounded-xl mb-4 flex justify-center";
    const pageContainer = document.createElement("div");
    pageContainer.classList.add("pdfViewer", "singlePageView");
    pageContainer.id = `page${pageNum}`;
    pageContainer.dataset.rendered = "false";
    pageWrapper.appendChild(pageContainer);
    pdfContainer.appendChild(pageWrapper);

    const pdfPage = await pdfDocument.getPage(pageNum);

    const containerWidth = pdfContainer.clientWidth;

    const unscaledViewportWidth = pdfPage.getViewport({ scale: 1 }).width;
    const unscaledViewportHeight = pdfPage.getViewport({ scale: 1 }).height;
    const CSS_UNITS = 96.0 / 72.0;
    // 1 PDF unit is 1.33333... units
    const scaledViewportWidth = unscaledViewportWidth * CSS_UNITS;
    const scaledViewportHeight = unscaledViewportHeight * CSS_UNITS;

    scale = containerWidth / scaledViewportWidth; // proper scale

    pageContainer.style.height = `${scaledViewportHeight * scale}px`;
    observer.observe(document.getElementById(`page${pageNum}`));
  }
}

// Gets Page Text of currently open PDF by page number
// Uses OCR if OCR mode is enabled
export async function getPageText(pageNumber) {
  const pdfPage = await pdfDocument.getPage(pageNumber);
  let page_text = null;
  if (ocr_mode) {
    const img = await getPageAsImage(pageNumber);
    page_text = await recognizeText(img);
  } else {
    const textContent = await pdfPage.getTextContent();
    page_text = textContent.items.map((item) => item.str).join("");
  }
  return page_text;
}

// Draws the page on temporary canvas and returns the base64
export async function getPageAsImage(pageNumber) {
  const page = await pdfDocument.getPage(pageNumber);
  const scale = 1;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  const renderTask = page.render({ canvasContext: ctx, viewport });
  await renderTask.promise;
  return canvas.toDataURL("image/png").split(",")[1];
}
