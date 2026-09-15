const USERS_KEY = "users";
const CURRENT_USER_KEY = "current_user";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getUsers() {
  const users = readJson(USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

export function register(studentId, password, name) {
  name = String(name ?? "").trim();
  studentId = String(studentId ?? "").trim();
  password = String(password ?? "");

  if (!studentId || !name || !password) {
    return { success: false, error: "All fields are required" };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  if (users.some((user) => user.studentId === studentId)) {
    return { success: false, error: "Student ID already registered" };
  }
  const user = {
    studentId,
    name,
    password,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return { success: true, user };
}

export function login(studentId, password) {
  studentId = String(studentId ?? "").trim();
  password = String(password ?? "");
  const user = getUsers().find(
    (candidate) =>
      candidate.studentId === studentId && candidate.password === password,
  );

  if (!user) return { success: false, error: "Invalid credentials" };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, user };
}

export function resetPassword(studentId, password) {
  studentId = String(studentId ?? "").trim();
  password = String(password ?? "");
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  const index = users.findIndex((user) => user.studentId === studentId);
  if (index < 0) return { success: false, error: "Username not found" };

  users[index] = { ...users[index], password };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true };
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  return true;
}

export function getCurrentUser() {
  const user = readJson(CURRENT_USER_KEY, null);
  return user && typeof user === "object" && !Array.isArray(user) ? user : null;
}
