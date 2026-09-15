import * as authService from "./services/authService.js?v=2";
import * as courseService from "./services/courseService.js";
import * as taskService from "./services/taskService.js";
import * as smartService from "./services/smartService.js";

const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const fmtDate = (d) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(d),
  );
const dueLabel = (d) => {
  const ms = new Date(d) - new Date(),
    days = Math.ceil(ms / 86400000);
  if (ms < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `Due in ${days} days`;
};
const toast = (msg) => {
  const e = document.createElement("div");
  e.className = "toast";
  e.textContent = msg;
  document.body.append(e);
  setTimeout(() => e.remove(), 2600);
};
function modal(title, body, onSubmit) {
  const root = $("#modalRoot");
  root.innerHTML = `<div class="modal-backdrop open"><div class="modal card"><h2>${title}</h2>${body}</div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelector("[data-close]")?.addEventListener("click", close);
  root.querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit(new FormData(e.target), close);
  });
  root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });
}
function taskForm(task = {}) {
  return `<form class="modal-form"><div class="task-modal-grid"><div class="form-field wide"><label>Task name</label><input class="input" name="name" required value="${esc(task.name)}" placeholder="e.g. Finish lab report"></div><div class="form-field wide"><label>Description</label><textarea class="textarea" name="description" placeholder="Optional details">${esc(task.description)}</textarea></div><div class="form-field"><label>Deadline</label><input class="input" type="datetime-local" name="deadline" required value="${task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ""}"></div><div class="form-field"><label>Importance</label><select class="select" name="importance">${["very-low", "low", "medium", "high", "very-high"].map((x) => `<option ${x === (task.importance || "medium") ? "selected" : ""} value="${x}">${x.replace("-", " ")}</option>`).join("")}</select></div><div class="form-field"><label>Estimated duration (hours)</label><input class="input" name="estimatedDuration" type="number" min="0.25" step="0.25" value="${task.estimatedDuration ?? ""}" placeholder="Optional"></div><div class="form-field"><label>Progress</label><select class="select" name="currentProgress">${[0, 25, 50, 75, 100].map((x) => `<option ${x === Number(task.currentProgress || 0) ? "selected" : ""} value="${x}">${x}%</option>`).join("")}</select></div></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save task</button></div></form>`;
}
function courseForm(course = {}) {
  return `<form class="modal-form"><div class="form-field"><label>Course name</label><input class="input" name="name" required value="${esc(course.name)}" placeholder="e.g. Deep Learning"></div><div class="form-field"><label>Color</label><input class="input" name="color" type="color" value="${course.color || "#1769ff"}"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save course</button></div></form>`;
}
function wireAuth() {
  document.querySelectorAll("#loginForm, #registerForm").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (form.id === "registerForm" && d.password !== d.confirmPassword) {
        form.querySelector(".form-error").textContent =
          "Passwords do not match";
        return;
      }
      let result =
        form.id === "loginForm"
          ? authService.login(d.studentId, d.password)
          : authService.register(d.studentId, d.password, d.name);
      if (result.success && form.id === "registerForm") {
        result = authService.login(d.studentId, d.password);
      }
      if (!result.success) {
        form.querySelector(".form-error").textContent = result.error;
        return;
      }
      location.href = "dashboard.html";
    }),
  );
}
function wireAuthTabs() {
  const card = $("#authCard");
  if (!card) return;
  const show = (name, scroll) => {
    card.querySelectorAll(".auth-form").forEach(
      (form) => (form.hidden = form.id !== `${name}Form`),
    );
    card.querySelectorAll(".tab").forEach((tab) => {
      const active = tab.dataset.authTarget === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active);
    });
    if (scroll) card.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.querySelectorAll("[data-auth-target]").forEach((control) =>
    control.addEventListener("click", (e) => {
      e.preventDefault();
      show(control.dataset.authTarget, control.hasAttribute("data-auth-scroll"));
    }),
  );
}
function initShell() {
  const u = authService.getCurrentUser();
  if (!u) {
    location.href = "index.html#authCard";
    return null;
  }
  const name = u.name || u.studentId;
  $("#userName") && ($("#userName").textContent = name);
  $("#userAvatar") &&
    ($("#userAvatar").textContent = name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase());
  $("#logoutBtn")?.addEventListener("click", () => {
    authService.logout();
    location.href = "index.html";
  });
  return u;
}
function initDashboard() {
  const u = initShell();
  if (!u) return;
  const name = u.name || u.studentId,
    courses = courseService.list(u.studentId),
    tasks = taskService.allForStudent(u.studentId),
    ranked = smartService.rank(tasks);
  $("#greeting").textContent = `Good morning, ${name}`;
  const completed = tasks.filter(
      (t) => Number(t.currentProgress) === 100,
    ).length,
    overdue = tasks.filter((t) => smartService.enrich(t).isOverdue).length;
  $("#stats").innerHTML =
    `<article class="card stat"><div class="stat-icon" aria-hidden="true">C</div><div><span class="muted">Courses</span><strong>${courses.length}</strong></div></article><article class="card stat"><div class="stat-icon green" aria-hidden="true">T</div><div><span class="muted">Pending tasks</span><strong>${tasks.length - completed}</strong></div></article><article class="card stat"><div class="stat-icon red" aria-hidden="true">!</div><div><span class="muted">Overdue</span><strong>${overdue}</strong></div></article>`;
  const risky = ranked.find((t) => t.hasWorkloadWarning || t.isOverdue);
  $("#warningArea").innerHTML = risky
    ? `<div class="card warning-banner"><div class="warning-copy"><div class="warning-icon" aria-hidden="true">!</div><div><h3>${risky.isOverdue ? "Overdue task" : "Workload warning"}</h3><p><strong>${esc(risky.name)}</strong> · ${risky.isOverdue ? "Deadline passed" : `${risky.remainingWorkload.toFixed(1)}h remaining · ${dueLabel(risky.deadline)}`}</p></div></div><a class="btn btn-outline" href="course.html?courseId=${encodeURIComponent(risky.courseId)}">View task</a></div>`
    : "";
  $("#courseGrid").innerHTML = courses.length
    ? courses
        .map((c) => {
          const ts = tasks.filter((t) => t.courseId === c.courseId),
            done = ts.filter((t) => Number(t.currentProgress) === 100).length,
            pct = ts.length
              ? Math.round(
                  ts.reduce((sum, t) => sum + Number(t.currentProgress || 0), 0) /
                    ts.length,
                )
              : 0,
            next = smartService.rank(ts)[0];
          return `<a class="card course-card" style="--course-color:${c.color || "var(--blue)"}" href="course.html?courseId=${encodeURIComponent(c.courseId)}"><div class="course-top"><div class="course-dot" style="background:${c.color || "#e9f2ff"}22;color:${c.color || "var(--blue)"}">${esc(c.name.slice(0, 1).toUpperCase())}</div><div><h3>${esc(c.name)}</h3><p>${ts.length} ${ts.length === 1 ? "task" : "tasks"}</p></div><span class="course-link" style="margin-left:auto">View course &rarr;</span></div><div class="progress" aria-label="${pct}% complete"><span style="width:${pct}%;background:${c.color || "var(--blue)"}"></span></div><div class="course-meta"><strong>${pct}% complete</strong><span>${done} completed · ${ts.length - done} remaining</span></div><div class="course-meta"><span>${next ? `Next: ${dueLabel(next.deadline)}` : "No pending tasks"}</span></div></a>`;
        })
        .join("")
    : `<div class="empty" style="grid-column:1/-1"><h3>No courses yet</h3><p>Start by creating your first course.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
  const addCourse = () =>
    modal("Add course", courseForm(), (d, close) => {
      try {
        courseService.create({
          studentId: u.studentId,
          name: d.get("name"),
          color: d.get("color"),
        });
        close();
        initDashboard();
        toast("Course added");
      } catch (e) {
        toast(e.message);
      }
    });
  $("#addCourseBtn").onclick = addCourse;
  $("[data-add-course]")?.addEventListener("click", addCourse);
  const open = () => {
    $("#recommendDrawer").classList.add("open");
    $("#drawerBackdrop").classList.add("open");
    $("#recommendList").innerHTML = ranked.length
      ? ranked
          .map((t, i) => {
            const c = courses.find((x) => x.courseId === t.courseId);
            return `<article class="recommend"><div class="rank">${i + 1}</div><div>${i === 0 ? '<span class="status pending">Recommended next</span>' : ""}<h3>${esc(t.name)}</h3><p>${esc(c?.name || "Course")} · ${dueLabel(t.deadline)}</p><div class="recommend-meta"><span>Priority <b class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)}</b></span><span>${t.remainingWorkload.toFixed(1)}h remaining</span>${t.hasWorkloadWarning ? '<span class="status warning">Workload warning</span>' : ""}${t.isOverdue ? '<span class="status overdue">Overdue</span>' : ""}</div></div><a class="btn ${i === 0 ? "btn-primary" : "btn-outline"}" href="course.html?courseId=${encodeURIComponent(t.courseId)}">View task</a></article>`;
          })
          .join("")
      : `<div class="empty">No pending tasks. You are caught up.</div>`;
  };
  const close = () => {
    $("#recommendDrawer").classList.remove("open");
    $("#drawerBackdrop").classList.remove("open");
  };
  $("#recommendBtn").addEventListener("click", open);
  $("#closeDrawer").addEventListener("click", close);
  $("#drawerBackdrop").addEventListener("click", close);
}
function initCourse() {
  const u = initShell();
  if (!u) return;
  const courseId = new URLSearchParams(location.search).get("courseId"),
    course = courseService.get(courseId);
  if (!course || course.studentId !== u.studentId) {
    location.href = "dashboard.html";
    return;
  }
  let filter = "all",
    sort = "priority";
  const render = () => {
    const raw = taskService.list(courseId),
      all = raw.map((task) => smartService.enrich(task));
    const counts = {
      pending: all.filter((t) => t.displayStatus === "pending").length,
      completed: all.filter((t) => t.displayStatus === "completed").length,
      overdue: all.filter((t) => t.displayStatus === "overdue").length,
    };
    const progress = all.length
      ? Math.round(
          all.reduce((sum, t) => sum + Number(t.currentProgress || 0), 0) /
            all.length,
        )
      : 0;
    $("#courseHero").innerHTML =
      `<section class="course-hero"><div class="course-title"><div class="course-dot" style="background:${course.color || "#e9f2ff"}22;color:${course.color || "var(--blue)"}">${esc(course.name.slice(0, 1).toUpperCase())}</div><div class="course-summary"><h1>${esc(course.name)}</h1><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><div class="course-summary-row"><span>${all.length} tasks · ${counts.completed} completed</span><strong>${progress}%</strong></div></div></div><div class="course-actions"><button id="courseRecommend" class="btn btn-outline">What should I do next?</button><button id="editCourse" class="btn btn-outline">Edit course</button><button id="deleteCourse" class="btn btn-danger">Delete</button></div></section>`;
    $("#courseStats").innerHTML =
      `<article class="card course-stat"><span>Pending</span><strong>${counts.pending}</strong></article><article class="card course-stat"><span>Completed</span><strong style="color:var(--green)">${counts.completed}</strong></article><article class="card course-stat"><span>Overdue</span><strong style="color:var(--red)">${counts.overdue}</strong></article>`;
    $("#filters").innerHTML = [
      ["all", "All"],
      ["pending", "In progress"],
      ["completed", "Completed"],
      ["overdue", "Overdue"],
    ]
      .map(
        ([v, l]) =>
          `<button class="filter ${filter === v ? "active" : ""}" data-filter="${v}">${l}</button>`,
      )
      .join("");
    let list = all.filter(
      (t) => filter === "all" || t.displayStatus === filter,
    );
    list.sort((a, b) =>
      sort === "deadline"
        ? new Date(a.deadline) - new Date(b.deadline)
        : sort === "importance"
          ? b.importanceScore - a.importanceScore
          : sort === "createdAt"
            ? new Date(b.createdAt) - new Date(a.createdAt)
            : b.priorityScore - a.priorityScore,
    );
    $("#taskList").innerHTML = list.length
      ? list
          .map(
            (t) =>
              `<article class="card task-row ${t.completionStatus === "completed" ? "completed" : ""}"><button class="check ${t.completionStatus === "completed" ? "checked" : ""}" data-complete="${t.taskId}" aria-label="Toggle task completion">${t.completionStatus === "completed" ? "&#10003;" : ""}</button><div><div class="task-name">${esc(t.name)}</div><div class="task-sub">${t.isOverdue ? '<span class="status overdue">Overdue</span>' : t.hasWorkloadWarning ? '<span class="status warning">Workload warning</span>' : `<span class="status ${t.completionStatus}">${t.completionStatus === "completed" ? "Completed" : "In progress"}</span>`}</div></div><div class="task-detail"><span class="task-label">Deadline</span><strong>${dueLabel(t.deadline)}</strong>${fmtDate(t.deadline)}</div><div class="task-detail"><span class="task-label">Importance</span><strong>${t.importance.replace("-", " ")}</strong></div><div class="task-detail"><span class="task-label">Progress</span><div class="inline-progress"><div class="progress"><span style="width:${t.currentProgress}%"></span></div><small>${t.currentProgress}%</small></div></div><div class="task-detail"><span class="task-label">Priority</span><strong class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)}</strong>${t.estimatedDuration == null ? "Duration not estimated" : `${t.remainingWorkload.toFixed(1)}h remaining`}</div><div class="task-actions"><button class="small-btn" data-edit="${t.taskId}" title="Edit task" aria-label="Edit task">&#9998;</button><button class="small-btn" data-delete="${t.taskId}" title="Delete task" aria-label="Delete task">&times;</button></div></article>`,
          )
          .join("")
      : `<div class="empty"><h3>${filter === "all" ? "No tasks yet" : "No matching tasks"}</h3><p>${filter === "all" ? "Add your first task to start tracking this course." : "Try another filter."}</p></div>`;
    document.querySelectorAll("[data-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          filter = b.dataset.filter;
          render();
        }),
    );
    document.querySelectorAll("[data-complete]").forEach(
      (b) =>
        (b.onclick = () => {
          const t = raw.find((x) => x.taskId === b.dataset.complete);
          taskService.setProgress(
            t.taskId,
            t.currentProgress === 100 ? 0 : 100,
          );
          render();
        }),
    );
    document.querySelectorAll("[data-delete]").forEach(
      (b) =>
        (b.onclick = () => {
          if (confirm("Delete this task?")) {
            taskService.remove(b.dataset.delete);
            render();
          }
        }),
    );
    document.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          const t = raw.find((x) => x.taskId === b.dataset.edit);
          modal("Edit task", taskForm(t), (d, close) => {
            try {
              taskService.update(t.taskId, Object.fromEntries(d));
              close();
              render();
            } catch (e) {
              toast(e.message);
            }
          });
        }),
    );
    $("#sortSelect").value = sort;
    $("#sortSelect").onchange = (e) => {
      sort = e.target.value;
      render();
    };
    $("#addTaskBtn").onclick = () =>
      modal("Add task", taskForm({}), (d, close) => {
        try {
          taskService.create({ courseId, ...Object.fromEntries(d) });
          close();
          render();
        } catch (e) {
          toast(e.message);
        }
      });
    $("#editCourse").onclick = () =>
      modal("Edit course", courseForm(course), (d, close) => {
        courseService.update(courseId, {
          name: d.get("name"),
          color: d.get("color"),
        });
        close();
        location.reload();
      });
    $("#deleteCourse").onclick = () => {
      if (confirm("Delete course and all its tasks?")) {
        courseService.remove(courseId);
        location.href = "dashboard.html";
      }
    };
    $("#courseRecommend").onclick = () => {
      const r = smartService.recommended(raw, 3);
      modal(
        "Next tasks in this course",
        r.length
          ? `<div class="recommend-list">${r.map((t, i) => `<article class="recommend"><div class="rank">${i + 1}</div><div><h3>${esc(t.name)}</h3><p>${dueLabel(t.deadline)} · ${t.remainingWorkload.toFixed(1)}h remaining</p></div></article>`).join("")}</div>`
          : '<div class="empty">No pending tasks.</div>',
        () => {},
      );
    };
  };
  render();
}
wireAuthTabs();
wireAuth();
const page = document.body.dataset.page;
if (page === "dashboard") initDashboard();
if (page === "course") initCourse();
