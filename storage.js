(() => {
  const KEY = "care-hand-demo-v1";
  let memoryState = null;

  function localDay(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function makeDemoState() {
    const now = new Date();
    const today = localDay(now);
    const stamp = (hour, minute) => {
      const date = new Date(now);
      date.setHours(hour, minute, 0, 0);
      return date.toISOString();
    };
    return {
      schemaVersion: 1,
      family: { id: "family-demo-lin", name: "林家照護小組", elderName: "林奶奶", demo: true },
      members: [
        { id: "member-an", name: "林小安", relation: "孫女・主要照顧者", role: "主要照顧者", color: "green" },
        { id: "member-wei", name: "林建維", relation: "兒子", role: "家人", color: "blue" },
        { id: "member-mei", name: "林美玲", relation: "女兒", role: "家人", color: "purple" },
        { id: "member-jun", name: "林怡君", relation: "媳婦", role: "家人", color: "peach" },
      ],
      currentMemberId: "member-an",
      records: [
        { id: "record-demo-1", date: today, time: "08:10", category: "日常照護", content: "早餐已準備好，陪奶奶一起用餐。", note: "精神和心情看起來和平常差不多。", createdBy: "member-an", createdAt: stamp(8, 10), updatedAt: stamp(8, 10) },
        { id: "record-demo-2", date: today, time: "11:45", category: "飲食與飲水", content: "上午有提醒奶奶喝水，午餐吃了大半份。", note: "喜歡今天的蒸蛋。", createdBy: "member-wei", createdAt: stamp(11, 45), updatedAt: stamp(11, 45) },
        { id: "record-demo-3", date: today, time: "14:20", category: "日常活動", content: "在家人陪同下於客廳活動了一會兒。", note: "活動後休息，過程平順。", createdBy: "member-mei", createdAt: stamp(14, 20), updatedAt: stamp(14, 20) },
      ],
      tasks: [
        { id: "task-demo-1", title: "準備晚餐", description: "依奶奶平常喜歡的餐點準備。", dueDate: today, dueTime: "18:00", assigneeId: "member-jun", status: "pending", createdAt: stamp(9, 0), updatedAt: stamp(9, 0) },
        { id: "task-demo-2", title: "確認明天回診交通安排", description: "和家人確認接送時間。", dueDate: today, dueTime: "19:00", assigneeId: "member-wei", status: "pending", createdAt: stamp(9, 10), updatedAt: stamp(9, 10) },
        { id: "task-demo-3", title: "整理客廳活動空間", description: "收好地上的物品，保持動線清楚。", dueDate: today, dueTime: "10:00", assigneeId: "member-an", status: "done", createdAt: stamp(8, 0), updatedAt: stamp(10, 5), completedAt: stamp(10, 5) },
      ],
      handoffs: [],
    };
  }

  function read() {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored) return JSON.parse(stored);
    } catch (error) {
      if (memoryState) return memoryState;
    }
    memoryState = makeDemoState();
    write(memoryState);
    return memoryState;
  }

  function write(state) {
    memoryState = state;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      return "localStorage";
    } catch (error) {
      return "memory";
    }
  }

  function reset() {
    memoryState = makeDemoState();
    try { window.localStorage.removeItem(KEY); } catch (error) { /* in-memory demo remains usable */ }
    write(memoryState);
    return memoryState;
  }

  window.CareStore = Object.freeze({ read, write, reset, localDay, storageKey: KEY });
})();
