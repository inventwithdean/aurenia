import { open } from "@tauri-apps/plugin-dialog";
import {
  readFile,
  writeFile,
  copyFile,
  BaseDirectory,
  mkdir,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { getPageText, getPDFCoverAndNumPages, loadPDF } from "./pdf_handler";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

async function addPDFToLibrary(filePath) {
  try {
    const fileName = await path.basename(filePath);
    if (!(await exists("", { baseDir: BaseDirectory.AppData }))) {
      await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
    }
    if (await exists(fileName, { baseDir: BaseDirectory.AppData })) {
      return;
    }
    await copyFile(filePath, fileName, {
      toPathBaseDir: BaseDirectory.AppData,
    });
    const pdf_cover_and_num_pages = await getPDFCoverAndNumPages(fileName);
    const pdf_cover = pdf_cover_and_num_pages["cover"];
    const numPages = pdf_cover_and_num_pages["numPages"];
    const title = fileName.replace(/\.pdf$/, "");
    const thumbnailName = `${title}.png`;
    await writeFile(thumbnailName, new Uint8Array(pdf_cover), {
      baseDir: BaseDirectory.AppData,
    });
    const jsonPath = "library.json";
    let library = { books: [] };
    if (await exists(jsonPath, { baseDir: BaseDirectory.AppData })) {
      const jsonContent = await readTextFile(jsonPath, {
        baseDir: BaseDirectory.AppData,
      });
      library = JSON.parse(jsonContent);
    }
    library.books.push({
      filename: fileName,
      title: title,
      numPages: numPages,
      thumbnail: thumbnailName,
    });
    await writeTextFile(jsonPath, JSON.stringify(library), {
      baseDir: BaseDirectory.AppData,
    });
    // Creates table in database for thie document
    await invoke("create_table_for_document", { documentName: fileName });
    addBookToPage(
      {
        filename: fileName,
        title: title,
        numPages: numPages,
        thumbnail: thumbnailName,
      },
      document.getElementById("books-container"),
      true
    );
  } catch (err) {
    console.error(err);
  }
}

async function addBookToPage(book, container, being_embedded = false) {
  const bookDiv = document.createElement("div");
  bookDiv.id = "library-div";
  bookDiv.className =
    "bg-white dark:bg-gray-700 p-4 w-48 rounded-xl shadow-lg flex flex-col items-center justify-center text-center hover:shadow-xl hover:scale-105 transition-transform duration-100";
  bookDiv.addEventListener("click", () => {
    const params = {
      filename: book.filename,
      title: book.title,
    };
    document.getElementById("library-view").classList.add("hidden");
    document.getElementById("pdf-study-view").classList.remove("hidden");
    loadPDF(params);
  });
  const img = document.createElement("img");
  img.className = "mb-3 object-cover rounded";
  const thumbnailContent = await readFile(book.thumbnail, {
    baseDir: BaseDirectory.AppData,
  });
  const blob = new Blob([thumbnailContent], { type: "image/png" });
  img.src = URL.createObjectURL(blob);
  const titleP = document.createElement("p");
  titleP.className =
    "font-semibold text-sm text-gray-700 dark:text-white line-clamp-3 w-full overflow-hidden";
  titleP.textContent = book.title;
  bookDiv.append(img, titleP);
  container.append(bookDiv);
  if (being_embedded) {
    // console.log("Being Embedded!");
    // Disable mouse clicks
    document.getElementById("library-view").style.pointerEvents = "none";
    bookDiv.style.pointerEvents = "none";
    bookDiv.style.opacity = "0.5";

    const progressTitle = document.createElement("p");
    progressTitle.className =
      "font-semibold text-sm text-gray-700 dark:text-white line-clamp-3 w-full overflow-hidden";
    bookDiv.append(progressTitle);
    progressTitle.textContent = "Embedding: 0%";

    // Embed book
    for (let pageNum = 1; pageNum <= book.numPages; pageNum++) {
      const pageText = await getPageText(pageNum);
      await invoke("embed_page", {
        documentName: book.filename,
        text: pageText,
        pageNum: pageNum,
      });
      const percent = Math.round((100 * pageNum) / book.numPages);
      progressTitle.textContent = `Embedding: ${percent}%`;
    }
    setTimeout(() => {
      progressTitle.remove();
      bookDiv.style.pointerEvents = "auto";
      bookDiv.style.opacity = "1";
    document.getElementById("library-view").style.pointerEvents = "auto";
    }, 100);
  }
}

async function loadLibrary() {
  try {
    const jsonPath = "library.json";
    if (!(await exists(jsonPath, { baseDir: BaseDirectory.AppData }))) return;
    const jsonContent = await readTextFile(jsonPath, {
      baseDir: BaseDirectory.AppData,
    });
    const library = JSON.parse(jsonContent);
    const container = document.getElementById("books-container");
    container.innerHTML = "";
    for (const book of library.books) {
      addBookToPage(book, container);
    }
  } catch (err) {
    console.error(err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadLibrary();

  document
    .getElementById("upload-pdf-btn")
    .addEventListener("click", async () => {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (filePath) {
        // User chose a PDF
        addPDFToLibrary(filePath);
      }
    });

  document.addEventListener("keydown", async (event) => {
    if (event.key == "F11") {
      event.preventDefault();
      const isFullScreen = await getCurrentWindow().isFullscreen();
      await getCurrentWindow().setFullscreen(!isFullScreen);
    }
  });
});
