import { authService } from "./services/authService.js";
import { courseService } from "./services/courseService.js";
import { taskService } from "./services/taskService.js";
import { smartService } from "./services/smartService.js";

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
  const form = $("#loginForm") || $("#registerForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    try {
      if (form.id === "loginForm") authService.login(d);
      else authService.register(d);
      location.href = "dashboard.html";
    } catch (err) {
      $("#formError").textContent = err.message;
    }
  });
}
function initShell() {
  const u = authService.require();
  if (!u) return;
  $("#userName") && ($("#userName").textContent = u.name);
  $("#logoutBtn")?.addEventListener("click", () => {
    authService.logout();
    location.href = "index.html";
  });
}
function initDashboard() {
  initShell();
  const u = authService.current(),
    courses = courseService.list(u.studentId),
    tasks = taskService.allForStudent(u.studentId),
    ranked = smartService.rank(tasks);
  $("#greeting").textContent = `Good morning, ${u.name}`;
  const completed = tasks.filter(
      (t) => Number(t.currentProgress) === 100,
    ).length,
    overdue = tasks.filter((t) => smartService.enrich(t).isOverdue).length;
  $("#stats").innerHTML =
    `<article class="card stat"><div class="stat-icon">!</div><div><span class="muted">Courses</span><strong>${courses.length}</strong></div></article><article class="card stat"><div class="stat-icon green">!</div><div><span class="muted">Pending tasks</span><strong>${tasks.length - completed}</strong></div></article><article class="card stat"><div class="stat-icon red">!</div><div><span class="muted">Overdue</span><strong>${overdue}</strong></div></article>`;
  const risky = ranked.find((t) => t.hasWorkloadWarning || t.isOverdue);
  $("#warningArea").innerHTML = risky
    ? `<div class="card warning-banner"><div><h3>${risky.isOverdue ? "Overdue task" : "Workload warning"}</h3><p>${esc(risky.name)} - ${risky.isOverdue ? "Deadline passed" : `${risky.remainingWorkload.toFixed(1)}h remaining and ${dueLabel(risky.deadline).toLowerCase()}.`}</p></div><a class="btn btn-outline" href="course.html?courseId=${encodeURIComponent(risky.courseId)}">View task</a></div>`
    : "";
  $("#courseGrid").innerHTML = courses.length
    ? courses
        .map((c) => {
          const ts = tasks.filter((t) => t.courseId === c.courseId),
            done = ts.filter((t) => Number(t.currentProgress) === 100).length,
            pct = ts.length ? Math.round((done / ts.length) * 100) : 0,
            next = smartService.rank(ts)[0];
          return `<a class="card course-card" href="course.html?courseId=${encodeURIComponent(c.courseId)}"><div class="course-top"><div class="course-dot" style="background:${c.color || "#e9f2ff"}22;color:${c.color || "var(--blue)"}">${esc(c.name.slice(0, 1).toUpperCase())}</div><div><h3>${esc(c.name)}</h3><p>${done} of ${ts.length} tasks completed</p></div><span style="margin-left:auto;font-size:22px">&gt;</span></div><div class="progress"><span style="width:${pct}%;background:${c.color || "var(--blue)"}"></span></div><div class="course-meta"><span>${pct}% complete</span><span>${next ? dueLabel(next.deadline) : "No pending tasks"}</span></div></a>`;
        })
        .join("")
    : `<div class="empty" style="grid-column:1/-1">No courses yet. Add your first course to start planning.</div>`;
  $("#addCourseBtn").addEventListener("click", () =>
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
    }),
  );
  const open = () => {
    $("#recommendDrawer").classList.add("open");
    $("#drawerBackdrop").classList.add("open");
    $("#recommendList").innerHTML = ranked.length
      ? ranked
          .map((t, i) => {
            const c = courses.find((x) => x.courseId === t.courseId);
            return `<article class="recommend"><div class="rank">${i + 1}</div><div><h3>${esc(t.name)}</h3><p>${esc(c?.name || "Course")} - ${dueLabel(t.deadline)}</p><div class="recommend-meta"><span>Priority <b class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)}</b></span><span>${t.remainingWorkload.toFixed(1)}h remaining</span>${t.hasWorkloadWarning ? '<span class="status warning">Workload warning</span>' : ""}${t.isOverdue ? '<span class="status overdue">Overdue</span>' : ""}</div></div><a class="btn btn-outline" href="course.html?courseId=${encodeURIComponent(t.courseId)}">View task</a></article>`;
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
  initShell();
  const u = authService.current(),
    courseId = new URLSearchParams(location.search).get("courseId"),
    course = courseService.get(courseId);
  if (!course || course.studentId !== u.studentId) {
    location.href = "dashboard.html";
    return;
  }
  let filter = "all",
    sort = "priority";
  const render = () => {
    const raw = taskService.list(courseId),
      all = raw.map(smartService.enrich);
    const counts = {
      pending: all.filter((t) => t.displayStatus === "pending").length,
      completed: all.filter((t) => t.displayStatus === "completed").length,
      overdue: all.filter((t) => t.displayStatus === "overdue").length,
    };
    $("#courseHero").innerHTML =
      `<section class="course-hero"><div class="course-title"><div class="course-dot" style="background:${course.color || "#e9f2ff"}22;color:${course.color || "var(--blue)"}">${esc(course.name.slice(0, 1).toUpperCase())}</div><div><h1>${esc(course.name)}</h1><p>${all.length} tasks - ${counts.completed} completed</p></div></div><div class="course-actions"><button id="courseRecommend" class="btn btn-outline">What should I do next?</button><button id="editCourse" class="btn btn-outline">Edit course</button><button id="deleteCourse" class="btn btn-danger">Delete</button></div></section>`;
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
              `<article class="card task-row ${t.completionStatus === "completed" ? "completed" : ""}"><button class="check ${t.completionStatus === "completed" ? "checked" : ""}" data-complete="${t.taskId}" aria-label="Mark complete">${t.completionStatus === "completed" ? "?" : ""}</button><div><div class="task-name">${esc(t.name)}</div><div class="task-sub">${t.isOverdue ? '<span class="status overdue">Overdue</span>' : t.hasWorkloadWarning ? '<span class="status warning">Workload warning</span>' : `<span class="status ${t.completionStatus}">${t.completionStatus === "completed" ? "Completed" : "In progress"}</span>`}</div></div><div class="task-detail"><strong>${dueLabel(t.deadline)}</strong>${fmtDate(t.deadline)}</div><div class="task-detail"><strong>${t.importance.replace("-", " ")}</strong>importance</div><div class="inline-progress"><div class="progress"><span style="width:${t.currentProgress}%"></span></div><small>${t.currentProgress}%</small></div><div class="task-detail"><strong class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)} priority</strong>${t.estimatedDuration == null ? "Duration not estimated" : `${t.remainingWorkload.toFixed(1)}h remaining`}</div><div class="task-actions"><button class="small-btn" data-edit="${t.taskId}" title="Edit">x</button><button class="small-btn" data-delete="${t.taskId}" title="Delete">x</button></div></article>`,
          )
          .join("")
      : `<div class="empty">No tasks match this filter.</div>`;
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
          ? `<div class="recommend-list">${r.map((t, i) => `<article class="recommend"><div class="rank">${i + 1}</div><div><h3>${esc(t.name)}</h3><p>${dueLabel(t.deadline)} ? ${t.remainingWorkload.toFixed(1)}h remaining</p></div></article>`).join("")}</div>`
          : '<div class="empty">No pending tasks.</div>',
        () => {},
      );
    };
  };
  render();
}
wireAuth();
const page = document.body.dataset.page;
if (page === "dashboard") initDashboard();
if (page === "course") initCourse();
