/* ============================================================
   To Do List App — app.js
   Menangani: state, penyimpanan (localStorage), render, dan
   semua interaksi user (tambah, centang, hapus, hapus semua).
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Konfigurasi & elemen DOM ---------- */
  const STORAGE_KEY = "todoApp.tasks.v1";
  const PROFILE_KEY = "todoApp.profile.v1";

  const el = {
    taskInput: document.getElementById("taskInput"),
    dueDateInput: document.getElementById("dueDateInput"),
    submitBtn: document.getElementById("submitBtn"),
    priorityBtns: Array.from(document.querySelectorAll(".pri-btn")),

    todoList: document.getElementById("todoList"),
    doneList: document.getElementById("doneList"),
    todoEmpty: document.getElementById("todoEmpty"),
    doneEmpty: document.getElementById("doneEmpty"),
    todoCount: document.getElementById("todoCount"),
    doneCount: document.getElementById("doneCount"),

    tabBtns: Array.from(document.querySelectorAll(".tab-btn")),
    todoPanel: document.getElementById("todoPanel"),
    donePanel: document.getElementById("donePanel"),

    overdueBanner: document.getElementById("overdueBanner"),
    overdueText: document.getElementById("overdueText"),

    deleteAllBtn: document.getElementById("deleteAllBtn"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalCancel: document.getElementById("modalCancel"),
    modalConfirm: document.getElementById("modalConfirm"),

    clockDay: document.getElementById("clockDay"),
    clockDate: document.getElementById("clockDate"),
    clockTime: document.getElementById("clockTime"),
  };

  let selectedPriority = "Medium";
  let tasks = loadTasks();

  /* ---------- Util: tanggal & waktu ---------- */
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

  function pad(n) { return n.toString().padStart(2, "0"); }

  function todayKey(d = new Date()) {
    // Kunci tanggal lokal, lepas dari zona waktu (YYYY-MM-DD)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatDateShort(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return `${d} ${BULAN[m - 1]} ${y}`;
  }

  function updateClock() {
    const now = new Date();
    el.clockDay.textContent = HARI[now.getDay()];
    el.clockDate.textContent = formatDateShort(todayKey(now));
    el.clockTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  /* ---------- Penyimpanan ---------- */
  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Gagal memuat data, mulai dari kosong.", e);
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error("Gagal menyimpan data.", e);
    }
  }

  /* ---------- Logika status tugas ---------- */
  function isOverdue(task) {
    if (task.done || !task.dueDate) return false;
    return task.dueDate < todayKey();
  }

  function makeId() {
    return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /* ---------- Render ---------- */
  function render() {
    const active = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done);
    const overdue = active.filter(isOverdue);

    // Urutkan: overdue dulu, lalu berdasarkan prioritas (High > Medium > Low)
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    active.sort((a, b) => {
      const ao = isOverdue(a) ? 0 : 1;
      const bo = isOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return priorityRank[a.priority] - priorityRank[b.priority];
    });
    done.sort((a, b) => (b.doneDate || "").localeCompare(a.doneDate || ""));

    renderList(el.todoList, active, false);
    renderList(el.doneList, done, true);

    el.todoEmpty.hidden = active.length > 0;
    el.doneEmpty.hidden = done.length > 0;

    el.todoCount.textContent = active.length;
    el.doneCount.textContent = done.length;

    // Banner overdue
    if (overdue.length > 0) {
      el.overdueBanner.hidden = false;
      el.overdueText.textContent =
        overdue.length === 1
          ? "1 agenda sudah melewati tenggat waktu."
          : `${overdue.length} agenda sudah melewati tenggat waktu.`;
    } else {
      el.overdueBanner.hidden = true;
    }
  }

  function renderList(container, list, isDoneList) {
    container.innerHTML = "";
    list.forEach((task) => {
      container.appendChild(buildTaskItem(task, isDoneList));
    });
  }

  function buildTaskItem(task, isDoneList) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.done ? " done" : "");
    if (isOverdue(task)) li.classList.add("overdue");
    li.dataset.priority = task.priority;
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", `Tandai selesai: ${task.text}`);
    checkbox.addEventListener("change", () => toggleDone(task.id));

    // Konten utama
    const main = document.createElement("div");
    main.className = "task-main";

    const text = document.createElement("p");
    text.className = "task-text";
    text.textContent = task.text;

    const meta = document.createElement("div");
    meta.className = "task-meta";

    const badge = document.createElement("span");
    badge.className = `badge badge-${task.priority.toLowerCase()}`;
    badge.textContent = task.priority;
    meta.appendChild(badge);

    const dateSpan = document.createElement("span");
    dateSpan.className = "meta-date";
    dateSpan.textContent = isDoneList
      ? `Selesai ${formatDateShort(task.doneDate)}`
      : `Dibuat ${formatDateShort(task.createdDate)}`;
    meta.appendChild(dateSpan);

    if (!isDoneList && task.dueDate) {
      const dueSpan = document.createElement("span");
      dueSpan.className = isOverdue(task) ? "meta-overdue" : "meta-date";
      dueSpan.textContent = isOverdue(task)
        ? `Terlambat sejak ${formatDateShort(task.dueDate)}`
        : `Tenggat ${formatDateShort(task.dueDate)}`;
      meta.appendChild(dueSpan);
    }

    main.appendChild(text);
    main.appendChild(meta);

    // Tombol hapus satuan
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "task-delete";
    delBtn.innerHTML = "&#10005;";
    delBtn.setAttribute("aria-label", `Hapus: ${task.text}`);
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(main);
    li.appendChild(delBtn);
    return li;
  }

  /* ---------- Aksi ---------- */
  function addTask() {
    const text = el.taskInput.value.trim();
    if (!text) {
      el.taskInput.classList.add("input-error");
      el.taskInput.focus();
      setTimeout(() => el.taskInput.classList.remove("input-error"), 350);
      return;
    }

    const task = {
      id: makeId(),
      text,
      priority: selectedPriority,
      createdDate: todayKey(),
      dueDate: el.dueDateInput.value || null,
      done: false,
      doneDate: null,
    };

    tasks.push(task);
    saveTasks();
    render();

    el.taskInput.value = "";
    el.dueDateInput.value = "";
    el.taskInput.focus();
  }

  function toggleDone(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    task.doneDate = task.done ? todayKey() : null;
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }

  function deleteAllTasks() {
    tasks = [];
    saveTasks();
    render();
    closeModal();
  }

  /* ---------- Tabs (tampilan mobile) ---------- */
  function switchTab(name) {
    el.tabBtns.forEach((btn) => {
      const isActive = btn.dataset.tab === name;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", String(isActive));
    });
    el.todoPanel.hidden = name !== "todo";
    el.donePanel.hidden = name !== "done";
  }

  /* ---------- Modal konfirmasi ---------- */
  function openModal() { el.modalBackdrop.hidden = false; }
  function closeModal() { el.modalBackdrop.hidden = true; }

  /* ---------- Event listeners ---------- */
  el.submitBtn.addEventListener("click", addTask);

  el.taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addTask();
  });

  el.priorityBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPriority = btn.dataset.priority;
      el.priorityBtns.forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
    });
  });

  el.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  el.deleteAllBtn.addEventListener("click", () => {
    if (tasks.length === 0) return;
    openModal();
  });
  el.modalCancel.addEventListener("click", closeModal);
  el.modalConfirm.addEventListener("click", deleteAllTasks);
  el.modalBackdrop.addEventListener("click", (e) => {
    if (e.target === el.modalBackdrop) closeModal();
  });

  /* ---------- Inisialisasi ---------- */
  function init() {
    // Set default tanggal minimum pada input tenggat = hari ini
    el.dueDateInput.min = todayKey();

    updateClock();
    setInterval(updateClock, 1000);

    render();
  }

  init();
})();
