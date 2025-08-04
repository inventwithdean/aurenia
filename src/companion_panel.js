let companionButton = null;
let companionContainer = null;
let companionWindowVisible = false;
let chatTabVisible = false;

// Shows tab with idToShow (if it exists) and hides other tabs
// Handles showing companion panel if its hidden
export function showCompanionTab(idToShow) {
  document.querySelectorAll(".companion-tab").forEach((el) => {
    el.classList.remove("flex");
    el.classList.add("hidden");
  });
  if (!companionWindowVisible) toggleCompanionPanel();
  const tabToShow = document.getElementById(idToShow);
  if (tabToShow) {
    tabToShow.classList.remove("hidden");
    tabToShow.classList.add("flex");
    // If a tab show is triggered then it handles the chatTabVisible.
    chatTabVisible = tabToShow.id == "companion-chat-container" ? true : false;
  }
}

// Pass in context if any
export function toggleChatTab() {
  if (!companionWindowVisible) {
    // Companion panel is not visible.
    showCompanionTab("companion-chat-container");
  } else {
    // Companion Panel was already open.
    if (chatTabVisible) {
      toggleCompanionPanel();
    } else {
      showCompanionTab("companion-chat-container");
    }
  }
}

// Hides companion panel if visible
// Shows it if its hidden
export function toggleCompanionPanel() {
  if (!companionButton)
    companionButton = document.getElementById("companion-button");
  if (!companionContainer)
    companionContainer = document.getElementById("companion-container");
  companionWindowVisible = !companionWindowVisible;
  // Companion window is now visible
  if (companionWindowVisible) {
    companionContainer.classList.remove("hidden");
    companionContainer.classList.add("flex");
  }
  // Companion window is now hidden
  else {
    companionContainer.classList.remove("flex");
    companionContainer.classList.add("hidden");
  }
}
