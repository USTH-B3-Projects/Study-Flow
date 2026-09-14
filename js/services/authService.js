import { storageService as s } from "./storageService.js";
export const authService = {
  register({ studentId, name, email, password }) {
    studentId = String(studentId || "").trim();
    name = String(name || "").trim();
    email = String(email || "")
      .trim()
      .toLowerCase();
    if (
      !studentId ||
      !name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      String(password || "").length < 6
    )
      throw new Error(
        "Enter valid details. Password must be at least 6 characters.",
      );
    const users = s.getUsers();
    if (users.some((u) => u.studentId === studentId))
      throw new Error("Student ID already registered.");
    if (users.some((u) => u.email === email))
      throw new Error("Email already registered.");
    const user = { studentId, name, email, password };
    s.setUsers([...users, user]);
    s.setCurrentUser(studentId);
    return user;
  },
  login({ studentId, password }) {
    const user = s
      .getUsers()
      .find(
        (u) =>
          u.studentId === String(studentId || "").trim() &&
          u.password === String(password || ""),
      );
    if (!user) throw new Error("Student ID or password is incorrect.");
    s.setCurrentUser(user.studentId);
    return user;
  },
  logout() {
    s.setCurrentUser(null);
  },
  current() {
    const id = s.getCurrentUser();
    return s.getUsers().find((u) => u.studentId === id) || null;
  },
  require() {
    const u = this.current();
    if (!u) location.href = "login.html";
    return u;
  },
};
