const USERS_KEY = "users";
const CURRENT_USER_KEY = "current_user";
const LEGACY_USER_ID = "studentId";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function getUsers() {
  const users = readJson(USERS_KEY, []);
  if (!Array.isArray(users)) return [];
  const migrated = users.map(migrateUser);
  if (migrated.some((user, index) => user !== users[index])) {
    localStorage.setItem(USERS_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

function migrateUser(user) {
  if (!user || typeof user !== "object" || !(LEGACY_USER_ID in user)) return user;
  const { [LEGACY_USER_ID]: legacyUserId, ...migrated } = user;
  return { ...migrated, userId: migrated.userId ?? legacyUserId };
}

export function register(userId, password, name, email) {
  name = String(name ?? "").trim();
  userId = String(userId ?? "").trim();
  password = String(password ?? "");
  email = String(email ?? "").trim().toLowerCase();

  if (!userId || !name || !password) {
    return { success: false, error: "All fields are required" };
  }
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const users = getUsers();
  if (users.some((user) => user.userId.toLowerCase() === userId.toLowerCase())) {
    return { success: false, error: "User ID already registered" };
  }
  if (email && users.some((user) => String(user.email || "").toLowerCase() === email)) {
    return { success: false, error: "Email already registered" };
  }
  const user = {
    userId,
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
      (candidate.userId.toLowerCase() === identifier ||
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
    user.userId.toLowerCase() === identifier || String(user.email || "").toLowerCase() === identifier,
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
  const storedUser = readJson(CURRENT_USER_KEY, null);
  if (!storedUser || typeof storedUser !== "object" || Array.isArray(storedUser)) return null;
  const user = migrateUser(storedUser);
  if (user !== storedUser) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}
