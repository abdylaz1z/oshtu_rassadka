// Настройки Firebase Realtime Database (общая база для всех устройств).
// Как получить значения — см. README.md. Пока databaseURL пустой,
// сайт работает в локальном режиме (данные только в этом браузере).
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // например: https://my-project-default-rtdb.europe-west1.firebasedatabase.app
  projectId: "",
  anonymousAuth: false // true — если включили анонимный вход и правила "auth != null"
};
