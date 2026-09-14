const KEYS = {
  users: "users",
  courses: "courses",
  tasks: "tasks",
  currentUser: "current_user",
};
function read(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}
export const storageService = {
  keys: KEYS,
  getUsers: () => read(KEYS.users),
  setUsers: (v) => write(KEYS.users, v),
  getCourses: () => read(KEYS.courses),
  setCourses: (v) => write(KEYS.courses, v),
  getTasks: () => read(KEYS.tasks),
  setTasks: (v) => write(KEYS.tasks, v),
  getCurrentUser: () => localStorage.getItem(KEYS.currentUser),
  setCurrentUser: (v) =>
    v
      ? localStorage.setItem(KEYS.currentUser, v)
      : localStorage.removeItem(KEYS.currentUser),
  clear: () => Object.values(KEYS).forEach((k) => localStorage.removeItem(k)),
};
