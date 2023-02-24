import reloadOnUpdate from "virtual:reload-on-update-in-background-script";

reloadOnUpdate("pages/background");

chrome.webRequest.onBeforeRequest.addListener(
  (request) => {
    chrome.storage.local.set({
      vidUrl: request.url,
    });
  },
  {
    urls: ["https://weread.qq.com/web/user?userVid=*"],
    types: ["xmlhttprequest"],
  }
);
