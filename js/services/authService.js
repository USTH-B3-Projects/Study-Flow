const USERS_KEY = "studyflow_users";
const CURRENT_USER_KEY = "studyflow_current_user";

function readJson(key, fallback) {
    const value = localStorage.getItem(key);

    if (value === null) return fallback;
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

export function register(studentId, email, password, studentName) {
    studentName = String(studentName ?? "").trim();
    studentId = String(studentId ?? "").trim();
    email = String(email ?? "").trim().toLowerCase();
    password = String(password ?? "");

    if (!studentId || !studentName || !email || !password) {
        return {
            success: false, error: "All fields are required"
        };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return {
            success: false, error: "Invalid email address"
        };
    }
    if (password.length < 8) {
        return {
            success: false, error: "Password must be at least 8 characters"
        };
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
        studentName,
        email,
        password,
    };

    localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]));
    return { success: true, user };
}

export function login(studentId, password) {
    studentId = String(studentId ?? "").trim();
    password = String(password ?? "");

    if (!studentId || !password) {
        return {
            success: false, error: "Student ID and password are required",
        };
    }

    const user = getUsers().find(
        (candidate) =>
            candidate.studentId === studentId &&
            candidate.password === password,
    );

    if (!user) return { success: false, error: "Invalid credentials" };

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user.studentId));
    return { success: true, user };
}

export function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    return true;
}

export function getCurrentUser() {
    const studentId = readJson(CURRENT_USER_KEY, null);

    if (typeof studentId !== "string" || !studentId) {
        return null;
    }

    return (
        getUsers().find((user) => user.studentId === studentId) ??
        null
    );
}

export function isAuthenticated() {
    return getCurrentUser() !== null;
}