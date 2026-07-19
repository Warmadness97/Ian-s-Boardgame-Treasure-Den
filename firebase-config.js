// 請到 https://console.firebase.google.com/ 建立一個免費專案，
// 新增一個「網頁應用程式」(Web App) 之後，把系統給你的設定值貼在下面。
// 詳細步驟請看 README.md

export const firebaseConfig = {
  apiKey: "請貼上你的 apiKey",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx"
};

// 只有這個信箱登入後才能新增／編輯／刪除桌遊與修改標題，
// 其他人登入後仍只能瀏覽與搜尋。
export const OWNER_EMAIL = "ianlin1997@gmail.com";
