chrome.runtime.onInstalled.addListener(function (details) {
  chrome.runtime.setUninstallURL("https://t.me/+0xmbWF_0L3QwMDA1");

  // Open welcome page on first install
  if (details.reason === "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
  }
});
