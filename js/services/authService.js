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

export function register(studentId, password, name, email) {
  name = String(name ?? "").trim();
  studentId = String(studentId ?? "").trim();
  password = String(password ?? "");
  email = String(email ?? "").trim().toLowerCase();

  if (!studentId || !name || !password) {
    return { success: false, error: "All fields are required" };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  if (users.some((user) => user.studentId.toLowerCase() === studentId.toLowerCase())) {
    return { success: false, error: "Student ID already registered" };
  }
  if (email && users.some((user) => String(user.email || "").toLowerCase() === email)) {
    return { success: false, error: "Email already registered" };
  }
  const user = {
    studentId,
    name,
    password,
    ...(email && { email }),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
  return { success: true, user };
}

export function login(identifier, password) {
  identifier = String(identifier ?? "").trim().toLowerCase();
  password = String(password ?? "");
  const user = getUsers().find(
    (candidate) =>
      (candidate.studentId.toLowerCase() === identifier ||
        String(candidate.email || "").toLowerCase() === identifier) &&
      candidate.password === password,
  );

  if (!user) return { success: false, error: "Invalid credentials" };

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, user };
}

export function resetPassword(identifier, password) {
  identifier = String(identifier ?? "").trim().toLowerCase();
  password = String(password ?? "");
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  const index = users.findIndex((user) =>
    user.studentId.toLowerCase() === identifier || String(user.email || "").toLowerCase() === identifier,
  );
  if (index < 0) return { success: false, error: "Username or email not found" };

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
