import * as authService from "./services/authService.js";
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
const localDateTimeValue = (d) => {
  const date = new Date(d);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const dueLabel = (d) => {
  const deadline = new Date(d),
    now = new Date(),
    ms = deadline - now,
    days =
      (Date.UTC(deadline.getFullYear(), deadline.getMonth(), deadline.getDate()) -
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86400000;
  if (ms < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
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
  root.innerHTML = `<div class="modal-backdrop open"><div class="modal card ${isTask ? "task-modal" : ""}">${isTask ? `<header class="task-modal-header"><span class="task-modal-plus" aria-hidden="true">+</span><div class="task-modal-title"><h2>${title === "Add task" ? "Create a new task" : title}</h2><p>${title === "Add task" ? "Add the details below to plan your task and stay on track." : "Update the details for this task."}</p></div><div class="task-modal-art" aria-hidden="true"><img src="../source/studyflow-note/task_1.png" alt=""><img src="../source/studyflow-note/small_step_big_progress.png" alt=""></div><button type="button" class="task-modal-close" data-close aria-label="Close modal">&times;</button></header>` : `<h2>${title}</h2>`}${body}</div></div>`;
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
    const update = () => {
      output.textContent = labels?.[input.value] ?? `${input.value}%`;
      const progress = (input.value - input.min) / (input.max - input.min) * 100;
      input.closest(".progress-slider")?.style.setProperty("--progress", `${progress}%`);
    };
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
  const taskNameField = task.taskName || task.name || "";
  const duration = task.estimatedDuration ?? "";
  const presets = ["", ".25", ".5", "1", "2", "3", "4", "5", "6", "8"];
  const custom = duration !== "" && !presets.includes(String(duration));
  const importance = ["very-low", "low", "medium", "high", "very-high"];
  const importanceIndex = Math.max(0, importance.indexOf(task.importance || "medium"));
  return `<form class="modal-form task-modal-form"><div class="task-modal-body"><section class="task-details"><div class="section-heading"><span class="section-icon" aria-hidden="true">▱</span><div><strong>Basic Information</strong><small>Give your task a clear name and add any useful notes.</small></div></div><div class="form-field"><label>Task name <b>*</b></label><input class="input" name="taskName" required value="${esc(taskNameField)}" placeholder="e.g. Finish Deep Learning lab"></div><div class="form-field"><div class="field-label"><label>Note</label><small>Optional</small></div><textarea class="textarea" name="description" rows="3" maxlength="500" placeholder="Add a note...">${esc(task.description || "")}</textarea></div></section><section class="planning"><div class="planning-head"><div class="section-heading"><span class="section-icon" aria-hidden="true">□</span><div><strong>Planning &amp; Prioritization</strong><small>Set a deadline, estimate the effort, and indicate how important this task is.</small></div></div><aside class="studyflow-hint"><img src="../source/studyflow-note/idea.png" alt="" aria-hidden="true"><span>These details help StudyFlow calculate task priority and recommend what you should work on next.</span></aside></div><div class="planning-grid"><div class="form-field"><label>Deadline <b>*</b></label><input class="input" type="datetime-local" name="deadline" required value="${task.deadline ? localDateTimeValue(task.deadline) : ""}"></div><div class="form-field duration-field"><label>Estimated duration</label><select class="select" data-duration-select><option value="" ${duration === "" ? "selected" : ""}>Default (3h)</option>${[[".25", "15 minutes"], [".5", "30 minutes"], ["1", "1 hour"], ["2", "2 hours"], ["3", "3 hours"], ["4", "4 hours"], ["5", "5 hours"], ["6", "6 hours"], ["8", "8 hours"]].map(([v, label]) => `<option value="${v}" ${String(duration) === v ? "selected" : ""}>${label}</option>`).join("")}<option value="custom" ${custom ? "selected" : ""}>Custom</option></select><input class="input custom-duration" data-custom-duration name="estimatedDuration" ${custom ? "required" : "hidden"} type="number" min="0.25" step="0.25" value="${duration}" placeholder="Hours"><small>Optional &middot; If not specified, we use a default of 3 hours.</small></div></div><div class="form-field range-field importance-range"><div class="field-label"><label>Importance <b>*</b></label><output data-range-output="importanceIndex"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"><span class="progress-slider-sparkles"></span></span><span class="progress-slider-thumb"></span></span><input type="range" min="0" max="4" step="1" name="importanceIndex" value="${importanceIndex}" data-range data-labels="Very low|Low|Medium|High|Very high"></div><input type="hidden" name="importance" value="${importance[importanceIndex]}"></div><div class="form-field range-field progress-range"><div class="field-label"><label>Progress</label><output data-range-output="currentProgress"></output></div><div class="progress-slider"><span class="progress-slider-track" aria-hidden="true"><span class="progress-slider-active"><span class="progress-slider-sparkles"></span></span><span class="progress-slider-thumb"></span></span><input type="range" min="0" max="100" step="25" name="currentProgress" value="${Number(task.currentProgress || 0)}" data-range></div></div></section></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary"><span aria-hidden="true">+</span>${task.taskId ? "Save task" : "Create task"}</button></div></form>`;
}
function taskFormWithCourse(task, courses) {
  const field = `<div class="form-field"><label>Course <b>*</b></label><select class="select" name="courseId" required><option value="">Select a course</option>${courses.map((course) => `<option value="${course.courseId}" ${task.courseId === course.courseId ? "selected" : ""}>${esc(course.courseName)}</option>`).join("")}</select></div>`;
  return taskForm(task).replace('<section class="task-details">', `${field}<section class="task-details">`);
}
function taskData(formData) {
  const data = Object.fromEntries(formData);
  if (data.importanceIndex !== undefined) {
    data.importance = ["very-low", "low", "medium", "high", "very-high"][data.importanceIndex];
    delete data.importanceIndex;
  }
  data.currentProgress = Number(data.currentProgress);
  data.estimatedDuration = data.estimatedDuration ? Number(data.estimatedDuration) : null;
  return data;
}
function taskDetails(t, includeStatus = false) {
  const taskNameField = t.taskName || t.name;
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
  return tasks.length ? `<div class="card warning-banner warning-list"><div class="warning-heading"><div class="warning-icon" aria-hidden="true">!</div><div><h3>Workload Warning</h3><p>${tasks.length} ${tasks.length === 1 ? "task needs" : "tasks need"} attention</p></div></div>${tasks.map((t) => { const taskNameField = t.taskName || t.name; return `<article class="warning-task" tabindex="0" role="button" aria-expanded="false"><strong>${esc(taskNameField)}</strong><span class="status ${t.isOverdue ? "overdue" : "warning"}">${t.isOverdue ? "OVERDUE" : "High workload"}</span><small>${dueLabel(t.deadline)} &middot; ${t.remainingWorkload.toFixed(1)}h remaining</small>${taskDetails(t)}</article>`; }).join("")}</div>` : "";
}
function taskGroup(task) {
  if (task.completionStatus === "completed") return "completed";
  if (task.isOverdue) return "overdue";
  const label = dueLabel(task.deadline);
  return label === "Due today" ? "today" : "upcoming";
}
function taskRow(task, course, selectedTaskId) {
  const name = task.taskName || task.name;
  const importance = task.importance.replace("-", " ");
  return `<article class="card task-row ${task.completionStatus === "completed" ? "completed" : ""} ${selectedTaskId === task.taskId ? "details-open" : ""}" data-task-id="${task.taskId}" tabindex="0" aria-expanded="${selectedTaskId === task.taskId}"><button class="check ${task.completionStatus === "completed" ? "checked" : ""}" data-complete="${task.taskId}" aria-label="Toggle task completion">${task.completionStatus === "completed" ? "&#10003;" : ""}</button><div class="task-summary"><div class="task-name">${esc(name)}</div><div class="task-sub">${course ? `<span class="task-course">${esc(course.courseName)}</span><i aria-hidden="true">&middot;</i>` : ""}<span>${dueLabel(task.deadline)}</span><span class="status ${task.importance}">${esc(importance)}</span><span class="task-progress">${task.currentProgress}%</span></div></div><div class="task-priority"><small>Priority</small><strong class="priority ${task.priorityScore >= 75 ? "high" : ""}">${Math.round(task.priorityScore)}</strong></div><details class="task-menu"><summary aria-label="Task actions">&bull;&bull;&bull;</summary><div><button data-edit="${task.taskId}">Edit task</button><button class="danger" data-delete="${task.taskId}">Delete task</button></div></details><aside class="task-preview"><div class="task-preview-inner"><small>Task details</small><strong>${esc(name)}</strong>${taskDetails(task, true)}</div></aside></article>`;
}
function groupedTasks(tasks, courses = [], selectedTaskId = null) {
  const groups = [
    ["overdue", "Overdue"],
    ["today", "Today"],
    ["upcoming", "Upcoming"],
    ["completed", "Completed"],
  ];
  return groups.map(([key, label]) => {
    const items = tasks.filter((task) => taskGroup(task) === key);
    return items.length ? `<section class="task-group group-${key}"><header><h2>${label}</h2><span>${items.length}</span></header><div>${items.map((task) => taskRow(task, courses.find((course) => course.courseId === task.courseId), selectedTaskId)).join("")}</div></section>` : "";
  }).join("");
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
  return `<form class="modal-form"><div class="form-field"><label>Course name</label><input class="input" name="courseName" required value="${esc(course.courseName || "")}" placeholder="e.g. Deep Learning"></div><div class="form-field"><label>Color</label><input class="input" name="color" type="color" value="${course.color || "#1769ff"}"></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-close>Cancel</button><button class="btn btn-primary">Save course</button></div></form>`;
}
function wireAuth() {
  document.querySelectorAll("#loginForm, #registerForm, #forgotForm").forEach((form) =>
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      if (form.id === "registerForm" && d.password !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      if (form.id === "forgotForm" && d.newPassword !== d.confirmPassword) {
        form.querySelector(".form-error").textContent = "Passwords do not match";
        return;
      }
      let result = form.id === "loginForm"
        ? await authService.login(d.username, d.password)
        : form.id === "registerForm"
          ? await authService.register(d.studentName, d.username, d.password, d.confirmPassword)
          : await authService.resetPassword(d.username, d.newPassword, d.confirmPassword);
      if (result.success && form.id === "forgotForm") {
        form.reset();
        document.querySelector('.tab[data-auth-target="login"]').click();
        toast("Password updated");
        return;
      }
      if (result.success && form.id === "registerForm") {
        result = await authService.login(d.username, d.password);
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
  const name = u.studentName || u.username;
  const themeToggle = $("#themeToggle");
  const syncThemeToggle = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    if (!themeToggle) return;
    themeToggle.checked = dark;
    themeToggle.title = dark ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.setAttribute("aria-label", themeToggle.title);
    themeToggle.closest(".theme-switch")?.setAttribute("title", themeToggle.title);
  };
  syncThemeToggle();
  if (themeToggle) themeToggle.onchange = () => {
    const theme = themeToggle.checked ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("studyflow_theme", theme);
    syncThemeToggle();
  };
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

function initPageTransitions() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const isPageLink = (link) => link.origin === location.origin && /\/(dashboard|course|course-detail|tasks)\.html$/.test(link.pathname);
  const hasNativePageTransitions = /^https?:$/.test(location.protocol) && CSS.supports("selector(:active-view-transition)");
  document.addEventListener("pointerenter", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link && isPageLink(link)) fetch(link.href, { priority: "low" }).catch(() => {});
  }, true);
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link || !isPageLink(link) || link.target || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const destination = new URL(link.href);
    if (destination.href === location.href) return;
    const courseId = destination.searchParams.get("courseId");
    const courseCard = courseId && link.closest(".course-card");
    if (courseCard && CSS.supports("view-transition-name: none")) {
      courseCard.style.viewTransitionName = `course-${courseId}`;
    }
    if (hasNativePageTransitions) return;
    event.preventDefault();
    document.body.classList.add("page-leaving");
    setTimeout(() => location.href = destination.href, 140);
  });
  addEventListener("pageshow", () => document.body.classList.remove("page-leaving"));
}

function initDashboard() {
  const u = initShell();
  if (!u) return;
  let openPulse = null;
  const updatePulse = (next) => {
    openPulse = next;
    document.querySelectorAll("[data-pulse]").forEach((card) => {
      const active = card.dataset.pulse === openPulse;
      card.classList.toggle("open", active);
      card.setAttribute("aria-expanded", String(active));
      card.querySelector(".pulse-popover")?.setAttribute("aria-hidden", String(!active));
    });
    $(".pulse-bar").classList.toggle("popover-open", Boolean(openPulse));
  };
  const hour = new Date().getHours();
  const salutation = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("#greeting").innerHTML = `${salutation},<span>${esc(u.studentName || u.username)} <span class="greeting-wave" aria-hidden="true">👋</span></span>`;
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [],
        enriched = tasks.map(smartService.enrich),
        ranked = smartService.rankTasks(tasks),
        completed = enriched.filter((t) => t.completionStatus === "completed").length, 
        pending = tasks.length - completed,
        overdue = enriched.filter((t) => t.isOverdue).length,
        dueToday = enriched.filter((t) => !t.isOverdue && t.completionStatus !== "completed" && dueLabel(t.deadline) === "Due today").length,
        progress = taskService.getProgress(tasks),
        attention = enriched.filter((t) => t.isOverdue || t.hasWorkloadWarning).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3),
        upcoming = enriched.filter((t) => t.completionStatus !== "completed").sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);
      const pulse = [
        ["pending", "Pending tasks", pending, ranked.filter((t) => !t.isOverdue), (t) => `Priority ${Math.round(t.priorityScore)}`, "No pending tasks"],
        ["overdue", "Overdue tasks", overdue, enriched.filter((t) => t.isOverdue), (t) => fmtDateTime(t.deadline), "No overdue tasks"],
        ["today", "Due today", dueToday, enriched.filter((t) => !t.isOverdue && t.completionStatus !== "completed" && dueLabel(t.deadline) === "Due today"), (t) => fmtDateTime(t.deadline), "Nothing due today"],
        ["completed", "Completed", completed, enriched.filter((t) => t.completionStatus === "completed"), (t) => courses.find((course) => course.courseId === t.courseId)?.courseName || "Completed", "No completed tasks"],
      ];
      $("#stats").innerHTML = pulse.map(([key, label, count, items, detail, empty]) => {
        const visible = items.slice(0, 5);
        return `<article class="stat" data-pulse="${key}" role="button" tabindex="0" aria-controls="pulse-${key}" aria-expanded="false"><strong>${count}</strong><span>${label}</span><div id="pulse-${key}" class="pulse-popover" role="dialog" aria-label="${label}" aria-hidden="true"><header><strong>${label} <span>&middot; ${count}</span></strong></header>${visible.length ? `<div class="pulse-task-list">${visible.map((t) => `<a href="course-detail.html?courseId=${encodeURIComponent(t.courseId)}&taskId=${encodeURIComponent(t.taskId)}"><span>${esc(t.taskName || t.name)}</span><small>${esc(detail(t))}</small></a>`).join("")}</div>` : `<p class="pulse-empty">${empty}</p>`}${items.length > visible.length ? `<a class="pulse-view-all" href="tasks.html?status=${key}">View all &rarr;</a>` : ""}</div></article>`;
      }).join("");
      updatePulse(openPulse);
      $("#attentionArea").innerHTML = `<article class="card overview-card attention-card"><div class="attention-head"><div class="attention-title"><span class="attention-warning-icon" aria-hidden="true">!</span><div><h2>Needs Attention</h2><p>These tasks are at risk due to upcoming deadlines or high workload.</p></div></div><span class="overview-caption">Sorted by urgency</span></div><div class="attention-list">${attention.length ? attention.map((t) => { const course = courses.find((item) => item.courseId === t.courseId); const taskNameField = t.taskName || t.name; return `<div class="attention-task"><button class="task-check" type="button" data-dashboard-complete="${t.taskId}" aria-label="Mark ${esc(taskNameField)} complete"></button><a class="attention-task-link" href="course-detail.html?courseId=${encodeURIComponent(t.courseId)}&taskId=${encodeURIComponent(t.taskId)}"><span class="attention-copy"><strong>${esc(taskNameField)}</strong><small>${esc(course?.courseName || "Course")}</small></span><span class="attention-meta"><span class="attention-deadline"><i aria-hidden="true">&#128197;</i>${dueLabel(t.deadline)}</span><span class="attention-progress"><i style="--task-progress:${t.currentProgress}" aria-hidden="true"></i>${t.currentProgress}%</span><span><i aria-hidden="true">&#9716;</i>~${Number(t.remainingWorkload.toFixed(1))}h</span></span></a><span class="attention-status ${t.isOverdue ? "overdue" : "warning"}"><span aria-hidden="true">${t.isOverdue ? "&#128308;" : "&#128293;"}</span>${t.isOverdue ? "Overdue" : "Workload warning"}</span><span class="row-arrow" aria-hidden="true">&rsaquo;</span></div>`; }).join("") : `<div class="mini-empty"><img src="../source/studyflow-mascot-pack/cat-good-job.png" alt=""><strong>You're all caught up.</strong><span>No tasks currently need attention.</span></div>`}</div></article>`;
      $("#progressArea").innerHTML = `<article class="card overview-card progress-card"><div class="overview-head"><div><span class="section-icon" aria-hidden="true">▥</span><h2>Your Progress</h2></div></div><div class="progress-summary"><div class="progress-ring" style="--progress:${progress}" role="img" aria-label="${progress}% overall progress"><span>${progress}%</span></div><div><p>Overall completion</p><div class="progress-value">${progress}%</div><div class="progress progress-large" aria-hidden="true"><span style="width:${progress}%"></span></div><div class="progress-counts"><strong>${completed} completed</strong><span>${pending} remaining</span></div></div></div><div class="progress-message"><img src="../source/studyflow-decoration-pack/plant-kawaii.png" alt="" aria-hidden="true"><span><strong>${progress === 100 ? "Beautiful work!" : "You're getting there!"}</strong> Keep going, you've got this.</span></div></article>`;
      $("#upcomingTasks").innerHTML = upcoming.length ? `<div class="upcoming-head"><span>Deadline</span><span>Task</span><span>Course</span><span>Priority</span><span>Progress</span><span></span></div>${upcoming.map((task) => { const course = courses.find((item) => item.courseId === task.courseId), taskName = task.taskName || task.name; return `<div class="upcoming-row"><time datetime="${esc(task.deadline)}">${fmtDate(task.deadline)}</time><a class="task-link" href="course-detail.html?courseId=${encodeURIComponent(task.courseId)}"><span>${esc(taskName)}</span><span class="row-arrow" aria-hidden="true">›</span></a><span>${esc(course?.courseName || "Course")}</span><strong>${Math.round(task.priorityScore)}</strong><div class="task-progress"><div class="progress" aria-label="${task.currentProgress}% complete"><span style="width:${task.currentProgress}%"></span></div><span>${task.currentProgress}%</span></div></div>`; }).join("")}` : `<div class="mini-empty compact"><strong>You're all caught up.</strong><span>No pending tasks.</span></div>`;
      document.querySelectorAll("[data-dashboard-complete]").forEach((button) => button.onclick = async () => {
        try {
          await taskService.toggleCompleted(button.dataset.dashboardComplete);
          await render();
        } catch (error) {
          toast(error.message);
        }
      });
    } catch (error) {
      toast(error.message);
    }
  };
  const togglePulse = (event) => {
    const card = event.target.closest("[data-pulse]");
    if (!card || event.target.closest(".pulse-popover")) return;
    updatePulse(openPulse === card.dataset.pulse ? null : card.dataset.pulse);
  };
  $("#stats").addEventListener("click", togglePulse);
  $("#stats").addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-pulse]")) {
      event.preventDefault();
      togglePulse(event);
    }
  });
  document.addEventListener("click", (event) => {
    if (openPulse && !event.target.closest("[data-pulse]")) updatePulse(null);
  });
  render();
  addEventListener("pageshow", render);
}

function initCourseManagement(u) {
  const main = document.querySelector(".course-main");
  let query = "", statusFilter = "all", sort = "name", view = localStorage.getItem("studyflow_course_view") === "list" ? "list" : "grid";
  main.innerHTML = `<img class="course-decoration course-plant" src="../source/studyflow-decoration-pack/plant-pot.png" alt="" aria-hidden="true"><section class="course-management-head" aria-labelledby="coursesTitle"><div><img class="course-rays" src="../source/studyflow-decoration-pack/accent-rays-yellow.png" alt="" aria-hidden="true"><h1 id="coursesTitle">My Courses</h1><p>Manage your courses and keep your study organized.</p></div><div class="course-hero-art" aria-hidden="true"><img class="course-mascot" src="../source/studyflow-mascot-pack/cat-reading.png" alt=""><img class="course-books" src="../source/studyflow-decoration-pack/books-stack.png" alt=""><img class="course-note" src="../source/studyflow-note/you-got-this.png" alt=""></div><button id="addCourseBtn" class="btn btn-primary"><span aria-hidden="true">+</span> Add course</button></section><section class="course-toolbar" aria-label="Course controls"><label class="course-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search courses</span><input id="courseSearch" class="input" type="search" placeholder="Search courses..."></label><label><span class="sr-only">Filter by status</span><select id="courseStatus" class="select"><option value="all">All Status</option><option value="not-started">Not Started</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label><label><span class="sr-only">Sort courses</span><select id="courseSort" class="select"><option value="name">Sort by: Name</option><option value="progress-desc">Progress: High to low</option><option value="progress-asc">Progress: Low to high</option></select></label><div class="view-toggle" role="group" aria-label="Course view"><button type="button" data-view="grid" aria-label="Grid view">▦ <span>Grid</span></button><button type="button" data-view="list" aria-label="List view">☷ <span>List</span></button></div></section><p id="courseResultCount" class="course-result-count" aria-live="polite"></p><section id="managedCourseGrid" class="course-grid management-grid"></section><img class="course-decoration course-leaves" src="../source/studyflow-decoration-pack/leaf-bush.png" alt="" aria-hidden="true">`;
  const statusOf = (progress, total) => total === 0 || progress === 0 ? ["not-started", "Not Started"] : progress === 100 ? ["completed", "Completed"] : ["in-progress", "In Progress"];
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId(), 
        tasks = await taskService.getTasksByUserId() ?? [];
      const visible = courses.map((course) => {
        const courseTasks = tasks.filter((task) => task.courseId === course.courseId), 
          completed = courseTasks.filter((task) => Number(task.currentProgress) === 100).length, 
          progress = taskService.getProgress(courseTasks);
        return { course, courseTasks, completed, progress, status: statusOf(progress, courseTasks.length) };
      }).filter(({ course, status }) => course.courseName.toLowerCase().includes(query) && (statusFilter === "all" || status[0] === statusFilter)).sort((a, b) => sort === "name" ? a.course.courseName.localeCompare(b.course.courseName) : sort === "progress-desc" ? b.progress - a.progress : a.progress - b.progress);
      const grid = $("#managedCourseGrid");
      grid.className = `course-grid management-grid ${view}-view`;
      $("#courseResultCount").textContent = courses.length ? `Showing ${visible.length} of ${courses.length} ${courses.length === 1 ? "course" : "courses"}` : "";
      grid.innerHTML = visible.length ? visible.map(({ course, courseTasks, completed, progress, status }) => `<article class="card course-card management-card status-${status[0]}" style="--course-color:${course.color || "var(--blue)"}"><div class="course-status"><span class="status-dot"></span>${status[1]}<details class="course-menu"><summary aria-label="Course actions">&bull;&bull;&bull;</summary><div><button data-edit-course="${course.courseId}">Edit course</button><button class="danger" data-delete-course="${course.courseId}">Delete course</button></div></details></div><div class="course-card-main"><span class="course-initial" aria-hidden="true">${esc(course.courseName.slice(0, 1).toUpperCase())}</span><div class="course-card-content"><a class="course-card-title" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}"><h3>${esc(course.courseName)}</h3><small>${courseTasks.length} ${courseTasks.length === 1 ? "task" : "tasks"}</small></a><div class="course-progress-inline"><div class="progress" aria-label="${progress}% complete"><span style="width:${progress}%;background:${course.color || "var(--blue)"}"></span></div><strong>${progress}%</strong></div><div class="course-counts"><span>${completed} completed</span><span>${courseTasks.length - completed} remaining</span></div></div><a class="course-card-arrow" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}" aria-label="View ${esc(course.courseName)}">›</a></div><div class="management-actions"><a class="btn btn-outline view-course" href="course-detail.html?courseId=${encodeURIComponent(course.courseId)}">Open course →</a></div></article>`).join("") : courses.length ? `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-thinking.png" alt="StudyFlow cat thinking"><h3>No matching courses</h3><p>Try another search or status.</p></div>` : `<div class="empty course-empty-state"><img src="../source/studyflow-mascot-pack/cat-reading.png" alt="StudyFlow cat reading"><h3>No courses yet</h3><p>Add your first course and start organizing your study.</p><button class="btn btn-primary" data-add-course>+ Add course</button></div>`;
      document.querySelectorAll("[data-edit-course]").forEach((button) => button.onclick = async () => {
        const course = courses.find((item) => item.courseId === button.dataset.editCourse);
        modal("Edit course", courseForm(course), async (data, close) => {
          try {
            await courseService.updateCourse(course.courseId, { courseName: data.get("courseName"), color: data.get("color") });
            close(); 
            await render(); 
            toast("Course updated");
          } catch (error) { 
            toast(error.message); 
          }
        });
      });
      document.querySelectorAll("[data-delete-course]").forEach((button) => button.onclick = async () => {
        if (confirm("Delete course and all its tasks?")) {
          try {
            await courseService.deleteCourse(button.dataset.deleteCourse);
            await render(); 
            toast("Course deleted");
          } catch (error) {
            toast(error.message);
          }
        }
      });
      $("[data-add-course]")?.addEventListener("click", addCourse);
    } catch (error) {
      toast(error.message);
    }
  };
  const addCourse = async () => modal("Add course", courseForm(), async (data, close) => {
    try {
      await courseService.createCourse({ courseName: data.get("courseName"), color: data.get("color") });
      close(); 
      await render(); 
      toast("Course added");
    } catch (error) { 
      toast(error.message); 
    }
  });
  $("#addCourseBtn").onclick = addCourse;
  $("#courseSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
  $("#courseStatus").onchange = (event) => { statusFilter = event.target.value; render(); };
  $("#courseSort").onchange = (event) => { sort = event.target.value; render(); };
  document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { view = button.dataset.view; localStorage.setItem("studyflow_course_view", view); document.querySelectorAll("[data-view]").forEach((item) => { const active = item.dataset.view === view; item.classList.toggle("active", active); item.setAttribute("aria-pressed", active); }); render(); });
  document.querySelector(`[data-view="${view}"]`).click();
}

function initCourses() {
  const u = initShell();
  if (u) initCourseManagement(u);
}

function initCourseDetail() {
  const u = initShell();
  if (!u) return;
  const params = new URLSearchParams(location.search), courseId = params.get("courseId");
  if (!courseId) {
    location.href = "course.html";
    return;
  }
  let filter = "all",
    sort = "priority",
    selectedTaskId = params.get("taskId");
  const render = async () => {
    try {
      const raw = await taskService.list(courseId),
        ranked = smartService.rankTasks(raw),
        all = [
          ...ranked,
          ...raw.filter((task) => Number(task.currentProgress) === 100).map((task) => smartService.enrich(task)),
        ];
      const course = await courseService.getCourseById(courseId);
      if (!course || course.username !== u.username) {
        location.href = "course.html";
        return;
      }
      const counts = {
        pending: all.filter((t) => t.displayStatus === "pending").length,
        completed: all.filter((t) => t.displayStatus === "completed").length,
        overdue: all.filter((t) => t.displayStatus === "overdue").length,
      };
      const progress = taskService.getProgress(all);
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
        ? groupedTasks(list, [], selectedTaskId)
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
          (b.onclick = async () => {
            try {
              const t = raw.find((x) => x.taskId === b.dataset.complete);
              await taskService.toggleCompleted(t.taskId);
              await render();
            } catch (error) {
              toast(error.message);
            }
          }),
      );
      document.querySelectorAll("[data-delete]").forEach(
        (b) =>
          (b.onclick = async () => {
            if (confirm("Delete this task?")) {
              try {
                await taskService.remove(b.dataset.delete);
                if (selectedTaskId === b.dataset.delete) selectedTaskId = null;
                await render();
              } catch (error) {
                toast(error.message);
              }
            }
          }),
      );
      document.querySelectorAll("[data-edit]").forEach(
        (b) =>
          (b.onclick = async () => {
            const t = raw.find((x) => x.taskId === b.dataset.edit);
            modal("Edit task", taskForm(t), async (d, close) => {
              try {
                await taskService.update(t.taskId, taskData(d));
                close();
                await render();
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
          if (event.target.closest("button, a, details")) return;
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
      $("#sortSelect").value = sort;
      $("#sortSelect").onchange = (e) => {
        sort = e.target.value;
        render();
      };
      $("#addTaskBtn").onclick = () =>
        modal("Add task", taskForm({}), async (d, close) => {
          try {
            await taskService.create({ courseId, ...taskData(d) });
            close();
            await render();
          } catch (e) {
            toast(e.message);
          }
        });
      $("#editCourse").onclick = async () =>
        modal("Edit course", courseForm(course), async (d, close) => {
          try {
            await courseService.updateCourse(courseId, {
              courseName: d.get("courseName"),
              color: d.get("color"),
            });
            close();
            location.reload();
          } catch (e) {
            toast(e.message);
          }
        });
      $("#deleteCourse").onclick = async () => {
        if (confirm("Delete course and all its tasks?")) {
          try {
            await courseService.deleteCourse(courseId);
            location.href = "course.html";
          } catch (e) {
            toast(e.message);
          }
        }
      };
      $("#courseRecommend").onclick = () => {
        const r = smartService.recommended(raw, 3);
        modal(
          "Next tasks in this course",
          r.length
            ? `<div class="recommend-list">${r.map((t, i) => { const taskNameField = t.taskName || t.name; return `<article class="recommend"><div class="rank">${i + 1}</div><div><h3>${esc(taskNameField)}</h3><p>${dueLabel(t.deadline)} · ${t.remainingWorkload.toFixed(1)}h remaining</p></div></article>`; }).join("")}</div>`
            : '<div class="empty">No pending tasks.</div>',
          () => {},
        );
      };
    } catch (error) {
      toast(error.message);
    }
  };
  render();
}

function initAllTasks() {
  const user = initShell();
  if (!user) return;
  const requestedStatus = new URLSearchParams(location.search).get("status");
  let status = ["pending", "overdue", "today", "upcoming", "completed"].includes(requestedStatus) ? requestedStatus : "all", courseId = "all", query = "", sort = "priority", selectedTaskId = null;
  const render = async () => {
    try {
      const courses = await courseService.getCoursesByUserId();
      const raw = await taskService.getTasksByUserId();
      const tasks = raw.map(smartService.enrich);
      const counts = Object.fromEntries(["overdue", "today", "upcoming", "completed"].map((key) => [key, tasks.filter((task) => taskGroup(task) === key).length]));
      $("#taskStats").innerHTML = `<article class="card course-stat"><span>Overdue</span><strong class="danger-text">${counts.overdue}</strong></article><article class="card course-stat"><span>Due today</span><strong>${counts.today}</strong></article><article class="card course-stat"><span>Upcoming</span><strong>${counts.upcoming}</strong></article><article class="card course-stat"><span>Completed</span><strong class="success-text">${counts.completed}</strong></article>`;
      $("#filters").innerHTML = [["all", "All"], ["pending", "Pending"], ["overdue", "Overdue"], ["today", "Today"], ["upcoming", "Upcoming"], ["completed", "Completed"]].map(([value, label]) => `<button class="filter ${status === value ? "active" : ""}" data-filter="${value}">${label}</button>`).join("");
      $("#courseFilter").innerHTML = `<option value="all">All courses</option>${courses.map((course) => `<option value="${course.courseId}">${esc(course.courseName)}</option>`).join("")}`;
      $("#courseFilter").value = courseId;
      let visible = tasks.filter((task) => (status === "all" || (status === "pending" ? !task.isOverdue && task.completionStatus !== "completed" : taskGroup(task) === status)) && (courseId === "all" || task.courseId === courseId) && (task.taskName || task.name).toLowerCase().includes(query));
      visible.sort((a, b) => sort === "deadline" ? new Date(a.deadline) - new Date(b.deadline) : sort === "importance" ? b.importanceScore - a.importanceScore : b.priorityScore - a.priorityScore);
      $("#taskList").innerHTML = visible.length ? groupedTasks(visible, courses, selectedTaskId) : `<div class="empty course-empty-state"><h3>No matching tasks</h3><p>Try another filter or create a new task.</p></div>`;
      document.querySelectorAll("[data-filter]").forEach((button) => button.onclick = () => { status = button.dataset.filter; render(); });
      document.querySelectorAll("[data-complete]").forEach((button) => button.onclick = async () => { try { await taskService.toggleCompleted(button.dataset.complete); render(); } catch (error) { toast(error.message); } });
      document.querySelectorAll("[data-edit]").forEach((button) => button.onclick = () => {
        const task = raw.find((item) => item.taskId === button.dataset.edit);
        modal("Edit task", taskForm(task), async (data, close) => { try { await taskService.update(task.taskId, taskData(data)); close(); render(); } catch (error) { toast(error.message); } });
      });
      document.querySelectorAll("[data-delete]").forEach((button) => button.onclick = async () => { if (confirm("Delete this task?")) { try { await taskService.remove(button.dataset.delete); render(); } catch (error) { toast(error.message); } } });
      document.querySelectorAll(".task-row").forEach((row) => {
        const preview = row.querySelector(".task-preview");
        preview.style.setProperty("--details-height", `${preview.scrollHeight}px`);
        row.onclick = (event) => {
          if (event.target.closest("button, a, details")) return;
          selectedTaskId = selectedTaskId === row.dataset.taskId ? null : row.dataset.taskId;
          render();
        };
      });
      $("#taskSearch").value = query;
      $("#sortSelect").value = sort;
    } catch (error) { toast(error.message); }
  };
  $("#taskSearch").oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
  $("#courseFilter").onchange = (event) => { courseId = event.target.value; render(); };
  $("#sortSelect").onchange = (event) => { sort = event.target.value; render(); };
  $("#addTaskBtn").onclick = async () => {
    const courses = await courseService.getCoursesByUserId();
    if (!courses.length) return toast("Create a course before adding tasks");
    modal("Add task", taskFormWithCourse({}, courses), async (data, close) => { try { await taskService.create(taskData(data)); close(); render(); toast("Task added"); } catch (error) { toast(error.message); } });
  };
  render();
}

wireAuthTabs();
wireAuth();
initPageTransitions();
const page = document.body.dataset.page;
if (page === "dashboard") initDashboard();
if (page === "course") initCourses();
if (page === "course-detail") initCourseDetail();
if (page === "tasks") initAllTasks();
