(() => {
  const pageNames = { home: "首頁", records: "照護紀錄", tasks: "待辦事項", handoff: "交接摘要", history: "交接歷史", members: "家庭成員" };
  const formDialog = document.querySelector("#form-dialog");
  const detailDialog = document.querySelector("#detail-dialog");
  const entryForm = document.querySelector("#entry-form");
  const toast = document.querySelector("#toast");
  let state = window.CareStore.read();
  let currentView = "home";
  let handoffMemberId = state.currentMemberId;
  let toastTimer;
  let runtime = { mode: "demo" };

  const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  const today = () => window.CareStore.localDay();
  const currentMember = () => state.members.find((member) => member.id === state.currentMemberId) || state.members[0];
  const memberById = (id) => state.members.find((member) => member.id === id);
  const timeNow = () => new Date().toISOString();
  const newId = () => window.crypto?.randomUUID ? window.crypto.randomUUID() : `care-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sortRecords = (items) => [...items].sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  const sortTasks = (items) => [...items].sort((a, b) => `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`));
  const recordsToday = () => sortRecords(state.records.filter((record) => record.date === today()));
  const pendingTasks = () => sortTasks(state.tasks.filter((task) => task.status === "pending"));
  const completedToday = () => state.tasks.filter((task) => task.status === "done" && task.dueDate === today());
  const handoffSignature = () => JSON.stringify({ records: recordsToday().map((record) => [record.id, record.updatedAt]), tasks: state.tasks.map((task) => [task.id, task.status, task.updatedAt]).sort((a, b) => a[0].localeCompare(b[0])) });
  const dateText = (day) => {
    if (!day) return "未設定日期";
    const [year, month, date] = day.split("-").map(Number);
    const target = new Date(year, month - 1, date, 12);
    return new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric", weekday: "long" }).format(target);
  };
  const timestampText = (value) => value ? new Intl.DateTimeFormat("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "";
  const categoryClass = (category) => category === "飲食與飲水" ? "food" : category === "日常活動" ? "activity" : category === "身體狀況觀察" ? "body" : "";
  const categoryIcon = (category) => category === "飲食與飲水" ? "◒" : category === "日常活動" ? "⌁" : category === "身體狀況觀察" ? "♡" : "✳";
  const mark = (message) => {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  };
  const save = (message) => {
    const mode = window.CareStore.write(state);
    renderAll();
    if (message) mark(mode === "memory" ? `${message}（目前僅暫存在頁面，瀏覽器無法儲存）` : message);
  };

  function renderMemberControls() {
    const options = state.members.map((member) => `<option value="${esc(member.id)}" ${member.id === state.currentMemberId ? "selected" : ""}>${esc(member.name)}</option>`).join("");
    document.querySelector("#current-member").innerHTML = options;
    document.querySelector("#handoff-member").innerHTML = state.members.map((member) => `<option value="${esc(member.id)}" ${member.id === handoffMemberId ? "selected" : ""}>${esc(member.name)}</option>`).join("");
    document.querySelector("#sidebar-member-name").textContent = currentMember().name;
    document.querySelector("#greeting-name").textContent = currentMember().name.replace(/^林/, "");
    document.querySelector("#top-avatar").textContent = currentMember().name.slice(-1);
  }

  function recordRow(record, compact = false) {
    const author = memberById(record.createdBy)?.name || "家庭成員";
    const detail = [record.content, record.note].filter(Boolean).join("｜");
    if (compact) return `<article class="record-row" data-record="${esc(record.id)}"><span class="record-symbol ${categoryClass(record.category)}">${categoryIcon(record.category)}</span><div class="record-row-main"><div class="record-row-top"><strong class="record-row-title">${esc(record.content)}</strong><time class="record-row-time">${esc(record.time)}</time></div><p class="record-row-snippet">${esc(detail)}</p><div class="record-row-author">${esc(author)}・${esc(record.category)}</div></div></article>`;
    return `<article class="record-card" data-record="${esc(record.id)}"><div class="record-card-head"><span class="category-pill ${categoryClass(record.category)}">${esc(record.category)}</span><time>${esc(record.date)}　${esc(record.time)}</time></div><h3>${esc(record.content)}</h3><p>${esc(record.note || "沒有補充備註。")}</p><div class="record-card-foot"><span>建立者：${esc(author)}</span><span>查看完整內容　→</span></div></article>`;
  }

  function taskCard(task) {
    const done = task.status === "done";
    const assignee = memberById(task.assigneeId)?.name || "尚未指定";
    const due = `${dateText(task.dueDate)}・${task.dueTime || "未設定時間"}`;
    return `<article class="task-card ${done ? "is-done" : ""}"><button class="task-check" data-task-toggle="${esc(task.id)}" aria-label="${done ? "重新開啟" : "標記完成"}：${esc(task.title)}">${done ? "✓" : ""}</button><div class="task-main"><div class="task-title-row"><strong class="task-name">${esc(task.title)}</strong><span class="task-status ${done ? "status-done" : "status-pending"}">${done ? "已完成" : "待處理"}</span></div>${task.description ? `<p class="task-description">${esc(task.description)}</p>` : ""}<div class="task-meta"><span>◷ ${esc(due)}</span><span>負責人 <strong>${esc(assignee)}</strong></span></div></div><div class="task-actions"><button class="small-action" data-task-edit="${esc(task.id)}">編輯</button></div></article>`;
  }

  function renderHome() {
    document.querySelector("#today-date").textContent = dateText(today());
    document.querySelector("#today-eyebrow").textContent = dateText(today());
    const todayRecords = recordsToday();
    const done = completedToday();
    const pending = pendingTasks();
    document.querySelector("#stat-records").textContent = todayRecords.length;
    document.querySelector("#stat-done").textContent = done.length;
    document.querySelector("#stat-pending").textContent = pending.length;
    document.querySelector("#record-nav-count").textContent = state.records.length;
    document.querySelector("#task-nav-count").textContent = pending.length;
    document.querySelector("#home-records").innerHTML = todayRecords.length ? todayRecords.slice(0, 3).map((item) => recordRow(item, true)).join("") : `<div class="empty-state"><strong>今天還沒有照護紀錄</strong>新增一筆紀錄，讓家人知道今天的狀況。</div>`;
    document.querySelector("#home-tasks").innerHTML = pending.length ? pending.slice(0, 3).map(taskCard).join("") : `<div class="empty-state"><strong>目前沒有待處理任務</strong>有需要的話，可以新增一項照護待辦。</div>`;
  }

  function renderRecords() {
    const items = sortRecords(state.records);
    document.querySelector("#records-total").textContent = `${items.length} 則紀錄`;
    document.querySelector("#records-list").innerHTML = items.length ? items.map((item) => recordRow(item)).join("") : `<div class="panel empty-state"><strong>還沒有照護紀錄</strong>新增第一筆紀錄，開始整理家人的照護資訊。</div>`;
  }

  function renderTasks() {
    const pending = pendingTasks();
    const done = sortTasks(state.tasks.filter((task) => task.status === "done"));
    document.querySelector("#task-summary-strip").innerHTML = `<div class="task-summary-chip"><span>待處理</span><strong>${pending.length}</strong></div><div class="task-summary-chip"><span>今日完成</span><strong>${completedToday().length}</strong></div><div class="task-summary-chip"><span>全部任務</span><strong>${state.tasks.length}</strong></div>`;
    const ordered = [...pending, ...done];
    document.querySelector("#tasks-list").innerHTML = ordered.length ? ordered.map(taskCard).join("") : `<div class="panel empty-state"><strong>目前沒有照護待辦</strong>新增任務並指定負責人，讓交接分工更清楚。</div>`;
  }

  function summaryRecordItem(record) {
    const author = memberById(record.createdBy)?.name || "家庭成員";
    return `<li><div class="summary-item"><strong>${esc(record.content)}</strong><span>${esc(record.time)}・${esc(record.category)}・${esc(author)}${record.note ? `｜備註：${esc(record.note)}` : ""}</span></div></li>`;
  }

  function summaryTask(task, done) {
    return `<div class="summary-task"><span class="task-status ${done ? "status-done" : "status-pending"}">${done ? "已完成" : "待處理"}</span><div><strong>${esc(task.title)}</strong><small>${esc(task.dueDate)} ${esc(task.dueTime)}・負責人：${esc(memberById(task.assigneeId)?.name || "尚未指定")}${task.description ? `・${esc(task.description)}` : ""}</small></div></div>`;
  }

  function renderHandoff() {
    const dayRecords = recordsToday();
    const dayDone = completedToday();
    const pending = pendingTasks();
    document.querySelector("#handoff-date-title").textContent = `${dateText(today())}・林奶奶照護交接`;
    document.querySelector("#generated-time").textContent = `摘要產生於 ${new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())}`;
    const latest = [...state.records.map((item) => item.updatedAt), ...state.tasks.map((item) => item.updatedAt)].filter(Boolean).sort().at(-1);
    document.querySelector("#summary-updated").textContent = latest ? `資料更新 ${timestampText(latest)}` : "尚無資料更新";
    const notes = dayRecords.filter((item) => item.note);
    document.querySelector("#handoff-content").innerHTML = `
      <section class="summary-section"><h3><span>▤</span> 今日照護概況</h3><p>今天共有 <strong>${dayRecords.length}</strong> 則照護紀錄，${dayDone.length} 項任務已完成，${pending.length} 項任務待處理。</p></section>
      <section class="summary-section"><h3><span>✓</span> 今日已完成的照護事項</h3>${dayDone.length ? dayDone.map((task) => summaryTask(task, true)).join("") : `<p>目前沒有已完成的任務紀錄。</p>`}</section>
      <section class="summary-section"><h3><span>◷</span> 尚未完成的待辦</h3>${pending.length ? pending.map((task) => summaryTask(task, false)).join("") : `<p>目前沒有待處理任務。</p>`}</section>
      <section class="summary-section"><h3><span>♡</span> 今日照護紀錄</h3>${dayRecords.length ? `<ul>${dayRecords.map(summaryRecordItem).join("")}</ul>` : `<p>今天尚無照護紀錄。</p>`}</section>
      <section class="summary-section"><h3><span>✎</span> 需要留意的備註</h3>${notes.length ? `<ul>${notes.map((record) => `<li>${esc(record.note)}（${esc(record.time)}・${esc(memberById(record.createdBy)?.name || "家庭成員")}）</li>`).join("")}</ul>` : `<p>今天沒有另外留下備註。</p>`}</section>`;
    const lastHandoff = [...state.handoffs].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const confirmButton = document.querySelector("#confirm-handoff");
    const note = document.querySelector("#confirm-note");
    if (lastHandoff && lastHandoff.date === today() && lastHandoff.snapshot?.signature === handoffSignature() && lastHandoff.confirmedBy === document.querySelector("#handoff-member").value) {
      confirmButton.disabled = true;
      confirmButton.innerHTML = "已由此成員確認接手";
      note.textContent = `確認者：${memberById(lastHandoff.confirmedBy)?.name || "家庭成員"}・${timestampText(lastHandoff.confirmedAt)}`;
    } else {
      confirmButton.disabled = false;
      confirmButton.innerHTML = "我已閱讀並接手 <span>→</span>";
      note.textContent = lastHandoff?.date === today() ? `最近一次確認：${memberById(lastHandoff.confirmedBy)?.name || "家庭成員"}・${timestampText(lastHandoff.confirmedAt)}` : "確認後會記錄接手者和時間。";
    }
  }

  function renderHistory() {
    const handoffs = [...state.handoffs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    document.querySelector("#history-count").textContent = `${handoffs.length} 次交接`;
    document.querySelector("#history-list").innerHTML = handoffs.length ? handoffs.map((item) => {
      const recordCount = item.snapshot?.records?.length || 0;
      const pendingCount = item.snapshot?.tasks?.filter((task) => task.status === "pending").length || 0;
      const preview = item.snapshot?.records?.[0]?.content || "當日沒有照護紀錄。";
      const confirmer = memberById(item.confirmedBy)?.name || "家庭成員";
      return `<article class="history-card" data-history="${esc(item.id)}"><div class="history-head"><span class="history-date-icon">⇄</span><div><strong>${esc(dateText(item.date))} 照護交接</strong><small>發起者：${esc(memberById(item.initiatedBy)?.name || "家庭成員")}</small></div><span class="history-status">已確認</span></div><p class="history-preview">${esc(preview)}　另有 ${recordCount} 則紀錄、${pendingCount} 項待處理任務。</p><div class="history-foot"><span>接手確認：${esc(confirmer)}・${esc(timestampText(item.confirmedAt))}</span><span>查看摘要 →</span></div></article>`;
    }).join("") : `<div class="panel empty-state"><strong>還沒有交接歷史</strong>完成一次「閱讀並接手」後，交接內容會出現在這裡。</div>`;
  }

  function renderMembers() {
    document.querySelector("#members-list").innerHTML = state.members.map((member) => `<article class="member-card"><span class="member-avatar avatar-${esc(member.color)}">${esc(member.name.slice(-1))}</span><div class="member-card-info"><strong>${esc(member.name)}</strong><p>${esc(member.relation)}</p></div><span class="member-role">${esc(member.role)}</span></article>`).join("");
  }

  function renderMode() {
    const badge = document.querySelector("#mode-badge");
    badge.textContent = runtime.mode === "liff" ? "LIFF 已初始化・Demo 資料" : "Demo Mode";
    badge.title = runtime.message || "使用模擬家庭資料；尚未驗證正式帳號";
  }

  function renderAll() {
    renderMemberControls();
    renderHome();
    renderRecords();
    renderTasks();
    renderHandoff();
    renderHistory();
    renderMembers();
    renderMode();
  }

  function changeView(view) {
    if (!pageNames[view]) return;
    currentView = view;
    document.querySelectorAll(".page-view").forEach((panel) => panel.classList.toggle("is-hidden", panel.id !== `view-${view}`));
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    document.querySelector("#current-page-name").textContent = pageNames[view];
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openRecordForm() {
    document.querySelector("#dialog-kicker").textContent = "CARE JOURNAL";
    document.querySelector("#dialog-title").textContent = "新增照護紀錄";
    document.querySelector("#dialog-description").textContent = "記下家人需要知道的照護資訊。請依實際觀察填寫。";
    const now = new Date();
    const localTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    entryForm.dataset.kind = "record";
    entryForm.innerHTML = `<div class="dialog-form"><label>紀錄日期<input type="date" name="date" value="${today()}" required></label><label>紀錄時間<input type="time" name="time" value="${localTime}" required></label><label>照護類別<select name="category" required><option value="">請選擇類別</option><option>飲食與飲水</option><option>日常活動</option><option>身體狀況觀察</option><option>日常照護</option><option>其他</option></select></label><label>紀錄內容<input name="content" maxlength="160" placeholder="簡單描述實際發生的事情" required></label><label>備註<textarea name="note" maxlength="500" placeholder="可留給下一位家人的提醒（選填）"></textarea></label><div class="form-actions"><button type="button" class="button button-secondary" data-close-dialog>取消</button><button type="submit" class="button button-primary">儲存紀錄</button></div></div>`;
    formDialog.showModal();
    entryForm.querySelector('[name="content"]').focus();
  }

  function openTaskForm(taskId = "") {
    const task = state.tasks.find((item) => item.id === taskId);
    document.querySelector("#dialog-kicker").textContent = "CARE TASK";
    document.querySelector("#dialog-title").textContent = task ? "編輯照護待辦" : "新增照護待辦";
    document.querySelector("#dialog-description").textContent = "指定負責人和時間，讓每件事都有清楚安排。";
    const assignees = state.members.map((member) => `<option value="${esc(member.id)}" ${(task?.assigneeId || state.currentMemberId) === member.id ? "selected" : ""}>${esc(member.name)}</option>`).join("");
    entryForm.dataset.kind = "task";
    entryForm.dataset.taskId = taskId;
    entryForm.innerHTML = `<div class="dialog-form"><label>任務名稱<input name="title" value="${esc(task?.title || "")}" maxlength="100" placeholder="例如：準備晚餐" required></label><label>任務說明<textarea name="description" maxlength="300" placeholder="補充需要交代的內容（選填）">${esc(task?.description || "")}</textarea></label><label>預定日期<input type="date" name="dueDate" value="${esc(task?.dueDate || today())}" required></label><label>預定時間<input type="time" name="dueTime" value="${esc(task?.dueTime || "18:00")}" required></label><label>負責成員<select name="assigneeId" required>${assignees}</select></label><div class="form-actions"><button type="button" class="button button-secondary" data-close-dialog>取消</button><button type="submit" class="button button-primary">${task ? "儲存修改" : "新增待辦"}</button></div></div>`;
    formDialog.showModal();
    entryForm.querySelector('[name="title"]').focus();
  }

  function showRecordDetail(id) {
    const record = state.records.find((item) => item.id === id);
    if (!record) return;
    const author = memberById(record.createdBy)?.name || "家庭成員";
    document.querySelector("#record-detail").innerHTML = `<div class="detail-content"><span class="category-pill ${categoryClass(record.category)}">${esc(record.category)}</span><h2>${esc(record.content)}</h2><p>${esc(record.note || "沒有補充備註。")}</p><div class="detail-meta"><div><small>紀錄時間</small><strong>${esc(dateText(record.date))}・${esc(record.time)}</strong></div><div><small>建立者</small><strong>${esc(author)}</strong></div><div><small>建立時間</small><strong>${esc(timestampText(record.createdAt))}</strong></div><div><small>最近更新</small><strong>${esc(timestampText(record.updatedAt))}</strong></div></div></div>`;
    detailDialog.showModal();
  }

  function showHandoffDetail(id) {
    const handoff = state.handoffs.find((item) => item.id === id);
    if (!handoff) return;
    const records = handoff.snapshot?.records || [];
    const tasks = handoff.snapshot?.tasks || [];
    document.querySelector("#record-detail").innerHTML = `<div class="detail-content"><span class="history-status">已確認交接</span><h2>${esc(dateText(handoff.date))} 照護交接</h2><p>發起者：${esc(memberById(handoff.initiatedBy)?.name || "家庭成員")}<br>接手者：${esc(memberById(handoff.confirmedBy)?.name || "家庭成員")}<br>確認時間：${esc(timestampText(handoff.confirmedAt))}</p><h3>照護紀錄（${records.length}）</h3>${records.map((record) => `<div class="summary-item"><strong>${esc(record.content)}</strong><span>${esc(record.time)}・${esc(record.category)}・${esc(memberById(record.createdBy)?.name || "家庭成員")}${record.note ? `｜備註：${esc(record.note)}` : ""}</span></div>`).join("") || "<p>當日沒有照護紀錄。</p>"}<h3>任務狀態（${tasks.length}）</h3>${tasks.map((task) => `<div class="summary-task"><span class="task-status ${task.status === "done" ? "status-done" : "status-pending"}">${task.status === "done" ? "已完成" : "待處理"}</span><div><strong>${esc(task.title)}</strong><small>${esc(task.dueDate)} ${esc(task.dueTime)}・${esc(memberById(task.assigneeId)?.name || "尚未指定")}</small></div></div>`).join("") || "<p>當日沒有任務。</p>"}</div>`;
    detailDialog.showModal();
  }

  document.body.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) { changeView(viewButton.dataset.view); return; }
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "add-record") { openRecordForm(); return; }
    if (action === "add-task") { openTaskForm(); return; }
    if (event.target.closest("[data-close-dialog]")) { formDialog.close(); return; }
    if (event.target.closest("[data-close-detail]")) { detailDialog.close(); return; }
    const record = event.target.closest("[data-record]");
    if (record) { showRecordDetail(record.dataset.record); return; }
    const history = event.target.closest("[data-history]");
    if (history) { showHandoffDetail(history.dataset.history); return; }
    const edit = event.target.closest("[data-task-edit]");
    if (edit) { openTaskForm(edit.dataset.taskEdit); return; }
    const toggle = event.target.closest("[data-task-toggle]");
    if (toggle) {
      const task = state.tasks.find((item) => item.id === toggle.dataset.taskToggle);
      if (!task) return;
      task.status = task.status === "done" ? "pending" : "done";
      task.updatedAt = timeNow();
      if (task.status === "done") task.completedAt = task.updatedAt;
      else delete task.completedAt;
      save(task.status === "done" ? "任務已標記完成" : "任務已重新開啟");
    }
  });

  entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!entryForm.reportValidity()) return;
    const data = new FormData(entryForm);
    const now = timeNow();
    if (entryForm.dataset.kind === "record") {
      state.records.push({ id: newId(), date: data.get("date"), time: data.get("time"), category: data.get("category"), content: data.get("content").trim(), note: data.get("note").trim(), createdBy: state.currentMemberId, createdAt: now, updatedAt: now });
      formDialog.close();
      save("照護紀錄已新增");
      changeView(currentView === "home" ? "home" : "records");
      return;
    }
    const existing = state.tasks.find((task) => task.id === entryForm.dataset.taskId);
    const values = { title: data.get("title").trim(), description: data.get("description").trim(), dueDate: data.get("dueDate"), dueTime: data.get("dueTime"), assigneeId: data.get("assigneeId"), updatedAt: now };
    if (existing) Object.assign(existing, values);
    else state.tasks.push({ id: newId(), ...values, status: "pending", createdAt: now });
    formDialog.close();
    save(existing ? "待辦已更新" : "待辦已新增");
    changeView("tasks");
  });

  document.querySelector("#current-member").addEventListener("change", (event) => {
    state.currentMemberId = event.target.value;
    save("");
  });
  document.querySelector("#handoff-member").addEventListener("change", (event) => { handoffMemberId = event.target.value; renderHandoff(); });
  document.querySelector("#confirm-handoff").addEventListener("click", () => {
    const confirmerId = document.querySelector("#handoff-member").value;
    const handoff = {
      id: newId(), familyId: state.family.id, date: today(), initiatedBy: state.currentMemberId,
      confirmedBy: confirmerId, confirmedAt: timeNow(), createdAt: timeNow(),
      snapshot: { signature: handoffSignature(), records: recordsToday(), tasks: state.tasks.map((task) => ({ ...task })).sort((a, b) => `${a.dueDate}T${a.dueTime}`.localeCompare(`${b.dueDate}T${b.dueTime}`)) },
    };
    state.handoffs.push(handoff);
    save("已記錄接手確認");
  });
  formDialog.addEventListener("click", (event) => { if (event.target === formDialog) formDialog.close(); });
  detailDialog.addEventListener("click", (event) => { if (event.target === detailDialog) detailDialog.close(); });

  async function start() {
    runtime = await window.CareLiff.initialize();
    renderAll();
  }
  start();
})();
