chrome.runtime.onInstalled.addListener(function (details) {
  chrome.runtime.setUninstallURL("https://t.me/+6Esd4xxkJCEwZjZl");

  // Open welcome page on first install
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
  }
});
