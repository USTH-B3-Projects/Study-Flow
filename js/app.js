import * as authService from "./services/authService.js?v=3";
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
const fmtDateTime = (d) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
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
  const isTask = body.includes("task-modal-form");
  root.innerHTML = `<div class="modal-backdrop open"><div class="modal card ${isTask ? "task-modal" : ""}">${isTask ? `<header class="task-modal-header"><div><h2><span aria-hidden="true">+</span>${title === "Add task" ? "Create a new task" : title}</h2><p>${title === "Add task" ? "Add the details below to plan your task." : "Update the details for this task."}</p></div><button type="button" class="task-modal-close" data-close aria-label="Close modal">&times;</button></header>` : `<h2>${title}</h2>`}${body}</div></div>`;
  const close = () => (root.innerHTML = "");
  root.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  const duration = root.querySelector("[data-duration-select]");
  const customDuration = root.querySelector("[data-custom-duration]");
  duration?.addEventListener("change", () => {
    const custom = duration.value === "custom";
    customDuration.hidden = !custom;
    customDuration.required = custom;
    if (!custom) customDuration.value = duration.value;
    if (custom) customDuration.focus();
  });
  root.querySelectorAll("[data-range]").forEach((input) => {
    const output = root.querySelector(`[data-range-output="${input.name}"]`);
    const labels = input.dataset.labels?.split("|");
    const update = () => (output.textContent = labels?.[input.value] ?? `${input.value}%`);
    input.addEventListener("input", update);
    update();
  });
  root.querySelector("form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit(new FormData(e.target), close);
  });
  root.querySelector(".modal-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) close();
  });
}
function taskForm(task = {}) {
  const duration = task.estimatedDuration ?? "";
  const presets = ["", ".25", ".5", "1", "2", "3", "4", "5", "6", "8"];
  const custom = duration !== "" && !presets.includes(String(duration));
  const importance = ["very-low", "low", "medium", "high", "very-high"];
  const importanceIndex = Math.max(0, importance.indexOf(task.importance || "medium"));
  return `<form class="modal-form task-modal-form"><div class="task-modal-body"><section class="task-details"><div class="form-field"><label>Task name <b>*</b></label><input class="input" name="name" required value="${esc(task.name)}" placeholder="e.g. Finish Deep Learning lab"></div><div class="form-field"><div class="field-label"><label>Note</label><small>Optional</small></div><textarea class="textarea" name="description" rows="2" placeholder="Add a note...">${esc(task.description)}</textarea></div></section><section class="planning"><div class="section-heading"><strong>Planning &amp; Prioritization</strong><small>Schedule &amp; effort</small></div><div class="planning-grid"><div class="form-field"><label>Deadline <b>*</b></label><input class="input" type="datetime-local" name="deadline" required value="${task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ""}"></div><div class="form-field duration-field"><label>Estimated duration</label><select class="select" data-duration-select><option value="" ${duration === "" ? "selected" : ""}>Default (2h)</option>${[[".25", "15 minutes"], [".5", "30 minutes"], ["1", "1 hour"], ["2", "2 hours"], ["3", "3 hours"], ["4", "4 hours"], ["5", "5 hours"], ["6", "6 hours"], ["8", "8 hours"]].map(([v, label]) => `<option value="${v}" ${String(duration) === v ? "selected" : ""}>${label}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Custom</option></select><input class="input custom-duration" data-custom-duration name="estimatedDuration" ${custom ? "required" : "hidden"} type="number" min="0.25" step="0.25" value="${duration}" placeholder="Hours"><small>Optional &middot; defaults to 2 hours</small></div></div><div class="form-field range-field"><div class="field-label"><label>Importance <b>*</b></label><output data-range-output="importanceIndex"></output></div><input type="range" min="0" max="4" step="1" name="importanceIndex" value="${importanceIndex}" data-range data-labels="Very low|Low|Medium|High|Very high"><input type="hidden" name="importance" value="${importance[importanceIndex]}"></div><div class="form-field range-field"><div class="field-label"><label>Progress</label><output data-range-output="currentProgress"></output></div><input type="range" min="0" max="100" step="25" name="currentProgress" value="${Number(task.currentProgress || 0)}" data-range></div></section><aside class="studyflow-hint"><b aria-hidden="true">&#10022;</b><span><strong>StudyFlow</strong> uses these details to calculate task priority and recommend what you should work on next.</span></aside></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary"><span aria-hidden="true">+</span>${task.taskId ? "Save task" : "Create task"}</button></div></form>`;
}
function taskData(formData) {
  const data = Object.fromEntries(formData);
  if (data.importanceIndex !== undefined) {
    data.importance = ["very-low", "low", "medium", "high", "very-high"][data.importanceIndex];
    delete data.importanceIndex;
  }
  return data;
}
function taskDetails(t, includeStatus = false) {
  const status = t.isOverdue
    ? ["overdue", "Overdue"]
    : t.completionStatus === "completed"
      ? ["completed", "Completed"]
      : t.hasWorkloadWarning
        ? ["warning", "Workload warning"]
        : ["pending", "In progress"];
  return `<div class="task-details-panel"><p>${esc(t.description) || "No note provided."}</p><dl><div><dt>Deadline</dt><dd>${fmtDateTime(t.deadline)}</dd></div><div><dt>Importance</dt><dd>${t.importance.replace("-", " ")}</dd></div><div><dt>Progress</dt><dd>${t.currentProgress}%</dd></div><div><dt>Effective duration</dt><dd>${t.effectiveDuration}h${t.estimatedDuration == null ? " (default)" : ""}</dd></div><div><dt>Remaining workload</dt><dd>${t.remainingWorkload.toFixed(1)}h</dd></div><div><dt>Workload score</dt><dd>${t.workloadScore}</dd></div><div class="detail-priority"><dt>Priority score</dt><dd>${Math.round(t.priorityScore)}</dd></div>${includeStatus ? `<div class="detail-status"><dt>Status</dt><dd><span class="status ${status[0]}">${status[1]}</span></dd></div>` : ""}</dl></div>`;
}
function warningList(tasks) {
  return tasks.length ? `<div class="card warning-banner warning-list"><div class="warning-heading"><div class="warning-icon" aria-hidden="true">!</div><div><h3>Workload Warning</h3><p>${tasks.length} ${tasks.length === 1 ? "task needs" : "tasks need"} attention</p></div></div>${tasks.map((t) => `<article class="warning-task" tabindex="0" role="button" aria-expanded="false"><strong>${esc(t.name)}</strong><span class="status ${t.isOverdue ? "overdue" : "warning"}">${t.isOverdue ? "OVERDUE" : "High workload"}</span><small>${dueLabel(t.deadline)} &middot; ${t.remainingWorkload.toFixed(1)}h remaining</small>${taskDetails(t)}</article>`).join("")}</div>` : "";
}
function wireExpandable(selector) {
  document.querySelectorAll(selector).forEach((item) => {
    const toggle = (event) => {
      if (event?.target.closest("button, a")) return;
      if (item.dataset.justDragged) return;
      const open = !item.classList.contains("details-open");
      item.classList.toggle("details-open", open);
      item.setAttribute("aria-expanded", String(open));
    };
    item.onclick = toggle;
    item.onkeydown = (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === item) {
        event.preventDefault(); toggle(event);
      }
    };
  });
}
function wireTaskSort(list, tasks, syncOrderUI = () => {}) {
  let drag = null;
  const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const movePlaceholder = (before) => {
    const cards = [...list.querySelectorAll("[data-task-id]:not(.dragging)")];
    const beforeRects = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));
    before ? list.insertBefore(drag.placeholder, before) : list.append(drag.placeholder);
    cards.forEach((card) => {
      const previous = beforeRects.get(card);
      const current = card.getBoundingClientRect();
      const delta = previous.top - current.top;
      if (delta && animate) card.animate([{ transform: `translateY(${delta}px)` }, { transform: "none" }], { duration: 160, easing: "ease-out" });
    });
  };
  list.querySelectorAll("[data-task-id]").forEach((item) => {
    item.onpointerdown = (event) => {
      if (event.button !== 0 || event.target.closest("a, button")) return;
      const rect = item.getBoundingClientRect();
      drag = { item, startX: event.clientX, startY: event.clientY, offsetY: event.clientY - rect.top, rect, active: false };
      item.setPointerCapture(event.pointerId);
    };
    item.onpointermove = (event) => {
      if (!drag || drag.item !== item) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
      if (!drag.active) {
        drag.active = true;
        drag.originalIds = [...list.querySelectorAll("[data-task-id]")].map((card) => card.dataset.taskId);
        drag.placeholder = document.createElement("div");
        drag.placeholder.className = "drop-indicator";
        drag.placeholder.style.height = `${drag.rect.height}px`;
        drag.placeholder.innerHTML = "<span>Drop here</span>";
        item.before(drag.placeholder);
        Object.assign(item.style, { position: "fixed", zIndex: 30, left: `${drag.rect.left}px`, top: `${drag.rect.top}px`, width: `${drag.rect.width}px` });
        item.classList.add("dragging");
      }
      event.preventDefault();
      item.style.top = `${event.clientY - drag.offsetY}px`;
      const target = [...list.querySelectorAll("[data-task-id]:not(.dragging)")].find((card) => {
        const rect = card.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
      });
      movePlaceholder(target);
    };
    item.onpointerup = item.onpointercancel = () => {
      if (!drag || drag.item !== item) return;
      if (drag.active) {
        drag.placeholder.before(item);
        drag.placeholder.remove();
        item.classList.remove("dragging");
        item.removeAttribute("style");
        if (animate) item.animate([{ transform: "scale(.985)" }, { transform: "none" }], { duration: 140, easing: "ease-out" });
        const ids = [...list.querySelectorAll("[data-task-id]")].map((card) => card.dataset.taskId);
        if (ids.some((id, index) => id !== drag.originalIds[index])) {
          taskService.updateDisplayOrder(ids);
          tasks.sort((a, b) => ids.indexOf(a.taskId) - ids.indexOf(b.taskId));
        }
        syncOrderUI();
        item.dataset.justDragged = "true";
        setTimeout(() => delete item.dataset.justDragged, 0);
      }
      drag = null;
    };
  });
}
function courseForm(course = {}) {
  return `<form class="modal-form"><div class="form-field"><label>Course name</label><input class="input" name="courseName" required value="${esc(course.courseName)}" placeholder="e.g. Deep Learning"></div><div class="form-field"><label>Color</label><input class="input" name="color" type="color" value="${course.color || "#1769ff"}"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save course</button></div></form>`;
}
function wireAuth() {
  document.querySelectorAll("#loginForm, #registerForm, #forgotForm").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (form.id === "registerForm" && d.password !== d.confirmPassword) {
        form.querySelector(".form-error").textContent =
          "Passwords do not match";
        return;
      }
      let result = form.id === "loginForm"
        ? authService.login(d.userId, d.password)
        : form.id === "registerForm"
          ? authService.register(d.userId, d.password, d.name, d.email)
          : authService.resetPassword(d.userId, d.password);
      if (result.success && form.id === "forgotForm") {
        form.reset();
        document.querySelector('.tab[data-auth-target="login"]').click();
        toast("Password updated");
        return;
      }
      if (result.success && form.id === "registerForm") {
        result = authService.login(d.userId, d.password);
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
  const name = u.name || u.userId;
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
  const name = u.name || u.userId,
    courses = courseService.getCoursesByUserId(u.userId),
    tasks = taskService.getTasksByUserId(u.userId) ?? [],
    smartRanked = smartService.rankTasks(tasks) ?? [],
    ranked = smartRanked.some((task) => Number.isFinite(task.manualOrder))
      ? [...smartRanked].sort((a, b) => (a.manualOrder ?? Number.MAX_SAFE_INTEGER) - (b.manualOrder ?? Number.MAX_SAFE_INTEGER))
      : smartRanked;
  $("#greeting").textContent = `Good morning, ${name}`;
  const completed = tasks.filter(
      (t) => Number(t.currentProgress) === 100,
    ).length,
    overdue = tasks.filter((t) => smartService.enrich(t).isOverdue).length;
  $("#stats").innerHTML =
    `<article class="card stat"><div class="stat-icon" aria-hidden="true">C</div><div><span class="muted">Courses</span><strong>${courses.length}</strong></div></article><article class="card stat"><div class="stat-icon green" aria-hidden="true">T</div><div><span class="muted">Pending tasks</span><strong>${tasks.length - completed}</strong></div></article><article class="card stat"><div class="stat-icon red" aria-hidden="true">!</div><div><span class="muted">Overdue</span><strong>${overdue}</strong></div></article>`;
  $("#warningArea").innerHTML = warningList(smartService.getWorkloadWarning(tasks));
  wireExpandable("#warningArea .warning-task");
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
            next = smartService.rankTasks(ts)?.[0];
          return `<a class="card course-card" style="--course-color:${c.color || "var(--blue)"}" href="course.html?courseId=${encodeURIComponent(c.courseId)}"><div class="course-top"><div class="course-dot" style="background:${c.color || "#e9f2ff"}22;color:${c.color || "var(--blue)"}">${esc(c.courseName.slice(0, 1).toUpperCase())}</div><div><h3>${esc(c.courseName)}</h3><p>${ts.length} ${ts.length === 1 ? "task" : "tasks"}</p></div><span class="course-link" style="margin-left:auto">View course &rarr;</span></div><div class="progress" aria-label="${pct}% complete"><span style="width:${pct}%;background:${c.color || "var(--blue)"}"></span></div><div class="course-meta"><strong>${pct}% complete</strong><span>${done} completed · ${ts.length - done} remaining</span></div><div class="course-meta"><span>${next ? `Next: ${dueLabel(next.deadline)}` : "No pending tasks"}</span></div></a>`;
        })
        .join("")
    : `<div class="empty" style="grid-column:1/-1"><h3>No courses yet</h3><p>Start by creating your first course.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
  const addCourse = () =>
    modal("Add course", courseForm(), (d, close) => {
      try {
        courseService.createCourse({
          userId: u.userId,
          courseName: d.get("courseName"),
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
            return `<article class="recommend expandable" data-task-id="${t.taskId}" tabindex="0" aria-expanded="false"><div class="rank">${i + 1}</div><div>${i === 0 ? '<span class="status pending" data-recommended>Recommended next</span>' : ""}<h3>${esc(t.name)}</h3><p>${esc(c?.courseName || "Course")} · ${dueLabel(t.deadline)}</p><div class="recommend-meta"><span>Priority <b class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)}</b></span><span>${t.remainingWorkload.toFixed(1)}h remaining</span>${t.hasWorkloadWarning ? '<span class="status warning">Workload warning</span>' : ""}${t.isOverdue ? '<span class="status overdue">Overdue</span>' : ""}</div>${taskDetails(t)}</div><a class="btn btn-primary" href="course.html?courseId=${encodeURIComponent(t.courseId)}">View course</a></article>`;
          })
          .join("")
      : `<div class="empty">No pending tasks. You are caught up.</div>`;
    wireExpandable("#recommendList .expandable");
    wireTaskSort($("#recommendList"), ranked, () => {
      $("#recommendList").querySelectorAll(".rank").forEach((rank, index) => (rank.textContent = index + 1));
      $("#recommendList").querySelector("[data-recommended]")?.remove();
      $("#recommendList").querySelector("[data-task-id] > div:nth-child(2)")?.insertAdjacentHTML("afterbegin", '<span class="status pending" data-recommended>Recommended next</span>');
    });
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
    course = courseService.getCourseById(courseId);
  if (!course || course.userId !== u.userId) {
    location.href = "dashboard.html";
    return;
  }
  let filter = "all",
    sort = "priority",
    selectedTaskId = null;
  const render = () => {
    const raw = taskService.list(courseId),
      ranked = smartService.rankTasks(raw),
      all = [
        ...ranked,
        ...raw.filter((task) => Number(task.currentProgress) === 100).map((task) => smartService.enrich(task)),
      ];
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
      `<section class="course-hero"><div class="course-title"><div class="course-dot" style="background:${course.color || "#e9f2ff"}22;color:${course.color || "var(--blue)"}">${esc(course.courseName.slice(0, 1).toUpperCase())}</div><div class="course-summary"><h1>${esc(course.courseName)}</h1><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><div class="course-summary-row"><span>${all.length} tasks · ${counts.completed} completed</span><strong>${progress}%</strong></div></div></div><div class="course-actions"><button id="courseRecommend" class="btn btn-outline">What should I do next?</button><button id="editCourse" class="btn btn-outline">Edit course</button><button id="deleteCourse" class="btn btn-danger">Delete</button></div></section>`;
    $("#courseStats").innerHTML =
      `<article class="card course-stat"><span>Pending</span><strong>${counts.pending}</strong></article><article class="card course-stat"><span>Completed</span><strong style="color:var(--green)">${counts.completed}</strong></article><article class="card course-stat"><span>Overdue</span><strong style="color:var(--red)">${counts.overdue}</strong></article>`;
    $("#warningArea").innerHTML = warningList(smartService.getWorkloadWarning(raw));
    wireExpandable("#warningArea .warning-task");
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
    if (sort !== "priority") list.sort((a, b) =>
      sort === "deadline"
        ? new Date(a.deadline) - new Date(b.deadline)
        : sort === "importance"
          ? b.importanceScore - a.importanceScore
          : sort === "createdAt"
            ? new Date(b.createdAt) - new Date(a.createdAt)
            : 0,
    );
    $("#taskList").innerHTML = list.length
      ? list
          .map(
            (t) =>
              `<article class="card task-row ${t.completionStatus === "completed" ? "completed" : ""} ${selectedTaskId === t.taskId ? "details-open" : ""}" data-task-id="${t.taskId}" tabindex="0" aria-expanded="${selectedTaskId === t.taskId}"><button class="check ${t.completionStatus === "completed" ? "checked" : ""}" data-complete="${t.taskId}" aria-label="Toggle task completion">${t.completionStatus === "completed" ? "&#10003;" : ""}</button><div class="task-summary"><div class="task-name">${esc(t.name)}</div><div class="task-sub"><span>${t.isOverdue ? "Overdue" : t.hasWorkloadWarning ? "Workload warning" : t.completionStatus === "completed" ? "Completed" : "In progress"}</span><i aria-hidden="true">&middot;</i><span>${dueLabel(t.deadline)}</span><span class="task-progress">${t.currentProgress}%</span></div></div><div class="task-priority"><small>Priority</small><strong class="priority ${t.priorityScore >= 75 ? "high" : ""}">${Math.round(t.priorityScore)}</strong></div><div class="task-actions"><button class="small-btn" data-edit="${t.taskId}" title="Edit task" aria-label="Edit task">&#9998;</button><button class="small-btn" data-delete="${t.taskId}" title="Delete task" aria-label="Delete task">&times;</button></div><aside class="task-preview"><div class="task-preview-inner"><small>Task details</small><strong>${esc(t.name)}</strong>${taskDetails(t, true)}</div></aside></article>`,
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
            if (selectedTaskId === b.dataset.delete) selectedTaskId = null;
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
              taskService.update(t.taskId, taskData(d));
              close();
              render();
            } catch (e) {
              toast(e.message);
            }
          });
        }),
    );
    document.querySelectorAll(".task-row").forEach((row) => {
      const details = row.querySelector(".task-preview");
      details.style.setProperty("--details-height", `${details.scrollHeight}px`);
      row.onclick = (event) => {
        if (event.target.closest("button") || row.dataset.justDragged) return;
        const open = selectedTaskId !== row.dataset.taskId;
        selectedTaskId = open ? row.dataset.taskId : null;
        if (open) details.style.setProperty("--details-height", `${details.scrollHeight}px`);
        document.querySelectorAll(".task-row.details-open").forEach((item) => {
          item.classList.remove("details-open");
          item.setAttribute("aria-expanded", "false");
        });
        row.classList.toggle("details-open", open);
        row.setAttribute("aria-expanded", String(open));
      };
      row.onkeydown = (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === row) {
          event.preventDefault();
          row.click();
        }
      };
    });
    wireTaskSort($("#taskList"), list);
    $("#sortSelect").value = sort;
    $("#sortSelect").onchange = (e) => {
      sort = e.target.value;
      render();
    };
    $("#addTaskBtn").onclick = () =>
      modal("Add task", taskForm({}), (d, close) => {
        try {
          taskService.create({ courseId, ...taskData(d) });
          close();
          render();
        } catch (e) {
          toast(e.message);
        }
      });
    $("#editCourse").onclick = () =>
      modal("Edit course", courseForm(course), (d, close) => {
        courseService.updateCourse(courseId, {
          courseName: d.get("courseName"),
          color: d.get("color"),
        });
        close();
        location.reload();
      });
    $("#deleteCourse").onclick = () => {
      if (confirm("Delete course and all its tasks?")) {
        courseService.deleteCourse(courseId);
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
