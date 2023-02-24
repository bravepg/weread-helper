import WereadService from "@services/weread";

const wereadService = new WereadService();

if (document.readyState !== "complete") {
  window.addEventListener("load", afterWindowLoaded);
} else {
  afterWindowLoaded();
}

function afterWindowLoaded() {
  chrome.storage.local.get(["vidUrl"], async (localStorge) => {
    const { vidUrl } = localStorge;
    console.log("vidUrl", vidUrl);
    if (!vidUrl) {
      return;
    }

    const userInfo = await wereadService.getUserInfo(vidUrl);
    if (userInfo?.userVid) {
      chrome.storage.local.set({
        wereadUserInfo: userInfo,
      });
    }
  });
}
