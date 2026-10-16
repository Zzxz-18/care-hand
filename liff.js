(() => {
  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.liff) return resolve();
      const script = document.createElement("script");
      script.src = "https://static.line-scdn.net/liff/edge/versions/2.31.2/sdk.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("LIFF SDK 載入失敗"));
      document.head.append(script);
    });
  }

  async function initialize() {
    const liffId = window.CARE_CONFIG?.LIFF_ID?.trim();
    if (!liffId) return { mode: "demo", message: "未設定 LIFF ID" };
    try {
      await loadSdk();
      await window.liff.init({ liffId });
      return { mode: "liff", inClient: window.liff.isInClient(), loggedIn: window.liff.isLoggedIn() };
    } catch (error) {
      console.warn("LIFF 初始化失敗，改以 Demo Mode 開啟。", error.message);
      return { mode: "demo", message: "LIFF 初始化失敗，已切換 Demo Mode" };
    }
  }

  // A browser-side LINE profile is not proof of family access. Verify ID tokens and
  // family membership in a trusted backend before enabling real accounts.
  window.CareLiff = Object.freeze({ initialize });
})();
