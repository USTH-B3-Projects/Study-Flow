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

export function register(studentId, email, password) {
  const name = String(arguments[3] ?? "").trim();
  studentId = String(studentId ?? "").trim();
  email = String(email ?? "").trim().toLowerCase();
  password = String(password ?? "");

  if (!studentId || !email || !password) {
    return { success: false, error: "All fields are required" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email address" };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  if (users.some((user) => user.studentId === studentId)) {
    return { success: false, error: "Student ID already registered" };
  }
  if (users.some((user) => String(user.email).toLowerCase() === email)) {
    return { success: false, error: "Email already registered" };
  }

  const user = {
    studentId,
    name,
    email,
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

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
  return true;
}

export function getCurrentUser() {
  const user = readJson(CURRENT_USER_KEY, null);
  return user && typeof user === "object" && !Array.isArray(user) ? user : null;
}
