// ======================================
// FOCUSFLOW - STUDENT PRODUCTIVITY
// ======================================

// STORAGE

const STORAGE_KEY = "focusflow_data_v1";

const defaultData = {
    name: "Student",
    tasks: [],
    plans: [],
    exams: [],
    sessions: 0,
    studyMinutes: 0,
    completedDates: {},
    lightMode: false
};

let data;

try {
    data = {
        ...defaultData,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    };
} catch {
    data = { ...defaultData };
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayString() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// ======================================
// INITIALIZATION
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    if (data.lightMode) {
        document.body.classList.add("light");
    }

    updateGreeting();
    updateDashboard();
    renderTasks();
    renderPlans();
    renderExams();
    updateAnalytics();
    setupNavigation();
    setupModals();
    setupForms();
    setupTimer();
    setupSettings();

    document.getElementById("todayDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short"
        });

    document.getElementById("welcomeDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

    document.getElementById("profileName").textContent = data.name;
    document.getElementById("nameInput").value = data.name;

    document.getElementById("themeBtn").addEventListener("click", toggleTheme);

    document.getElementById("menuBtn").addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("open");
    });

});

// ======================================
// GREETING
// ======================================

function updateGreeting() {

    const hour = new Date().getHours();

    let greeting = "Good evening";

    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";

    document.getElementById("greeting").innerHTML =
        `${greeting}, ${escapeHTML(data.name)} <span>✦</span>`;
}

// ======================================
// NAVIGATION
// ======================================

function setupNavigation() {

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {

        button.addEventListener("click", () => {
            openPage(button.dataset.page);
        });

    });

    document.querySelectorAll("[data-go]").forEach(button => {

        button.addEventListener("click", () => {
            openPage(button.dataset.go);
        });

    });
}

function openPage(pageId) {

    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active-page");
    });

    const page = document.getElementById(pageId);

    if (!page) return;

    page.classList.add("active-page");

    document.querySelectorAll(".nav-item[data-page]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageId
        );
    });

    const pageNames = {
        dashboard: "Dashboard",
        tasks: "My Tasks",
        planner: "Study Planner",
        timer: "Focus Timer",
        exams: "Exam Tracker",
        analytics: "Analytics"
    };

    document.getElementById("pageName").textContent = pageNames[pageId];

    if (pageId === "analytics") updateAnalytics();
    if (pageId === "exams") renderExams();

    document.getElementById("sidebar").classList.remove("open");

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ======================================
// DASHBOARD
// ======================================

function updateDashboard() {

    const completed = data.tasks.filter(task => task.completed).length;
    const pending = data.tasks.filter(task => !task.completed).length;

    const score = data.tasks.length
        ? Math.round((completed / data.tasks.length) * 100)
        : 0;

    document.getElementById("completedCount").textContent = completed;
    document.getElementById("pendingCount").textContent = pending;

    document.getElementById("studyHours").textContent =
        (data.studyMinutes / 60).toFixed(1) + "h";

    document.getElementById("productivityScore").textContent =
        score + "%";

    const todayTasks = data.tasks.filter(task =>
        task.date === todayString()
    );

    const todayCompleted = todayTasks.filter(task =>
        task.completed
    ).length;

    const progress = todayTasks.length
        ? Math.round((todayCompleted / todayTasks.length) * 100)
        : 0;

    document.getElementById("progressPercent").textContent =
        progress + "%";

    document.getElementById("progressRing").style.background =
        `conic-gradient(var(--purple) ${progress * 3.6}deg, #32263f 0deg)`;

    const dashboardTasks = document.getElementById("dashboardTasks");

    if (todayTasks.length === 0) {
        dashboardTasks.innerHTML =
            `<div class="empty-state">No tasks scheduled for today. Add your first task!</div>`;
    } else {

        dashboardTasks.innerHTML = todayTasks.slice(0, 5).map(task => `
            <div class="task-row">
                <input class="task-check"
                    type="checkbox"
                    data-task-check="${task.id}"
                    ${task.completed ? "checked" : ""}>

                <div class="task-info ${task.completed ? "task-done" : ""}">
                    <h4>${escapeHTML(task.title)}</h4>
                    <p>${escapeHTML(task.category)} · ${formatDate(task.date)}</p>
                </div>

                <span class="priority ${task.priority}">
                    ${task.priority}
                </span>
            </div>
        `).join("");
    }

    dashboardTasks.querySelectorAll("[data-task-check]").forEach(input => {
        input.addEventListener("change", () => {
            toggleTask(input.dataset.taskCheck);
        });
    });

    renderUpcomingExams();
}

// ======================================
// TASK MANAGER
// ======================================

let currentFilter = "all";

function setupForms() {

    document.getElementById("addTaskBtn").addEventListener("click", () => {
        openModal("taskModal");
    });

    document.getElementById("quickAddBtn").addEventListener("click", () => {
        openModal("taskModal");
    });

    document.getElementById("addPlanBtn").addEventListener("click", () => {
        openModal("planModal");
    });

    document.getElementById("addExamBtn").addEventListener("click", () => {
        openModal("examModal");
    });

    document.getElementById("taskDate").value = todayString();
    document.getElementById("examDate").min = todayString();

    document.getElementById("taskForm").addEventListener("submit", event => {

        event.preventDefault();

        const task = {
            id: Date.now().toString(),
            title: document.getElementById("taskTitle").value.trim(),
            category: document.getElementById("taskCategory").value,
            priority: document.getElementById("taskPriority").value,
            date: document.getElementById("taskDate").value,
            completed: false
        };

        if (!task.title || !task.date) return;

        data.tasks.push(task);

        saveData();
        renderTasks();
        updateDashboard();

        closeModal("taskModal");
        event.target.reset();

        document.getElementById("taskDate").value = todayString();

        showToast("Task added successfully!");
    });

    document.querySelectorAll("[data-filter]").forEach(button => {

        button.addEventListener("click", () => {

            currentFilter = button.dataset.filter;

            document.querySelectorAll("[data-filter]").forEach(btn => {
                btn.classList.remove("selected");
            });

            button.classList.add("selected");

            renderTasks();
        });

    });

}

function renderTasks() {

    const container = document.getElementById("allTasks");

    let tasks = [...data.tasks];

    if (currentFilter === "pending") {
        tasks = tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        tasks = tasks.filter(task => task.completed);
    }

    tasks.sort((a, b) => a.date.localeCompare(b.date));

    if (!tasks.length) {
        container.innerHTML =
            `<div class="empty-state">No tasks found. Add a new task to get started!</div>`;
        return;
    }

    container.innerHTML = tasks.map(task => `
        <div class="task-row">
            <input
                type="checkbox"
                class="task-check"
                data-task-check="${task.id}"
                ${task.completed ? "checked" : ""}>

            <div class="task-info ${task.completed ? "task-done" : ""}">
                <h4>${escapeHTML(task.title)}</h4>
                <p>${escapeHTML(task.category)} · Due ${formatDate(task.date)}</p>
            </div>

            <span class="priority ${task.priority}">
                ${task.priority}
            </span>

            <button class="delete-btn"
                data-delete-task="${task.id}"
                title="Delete task">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join("");

    container.querySelectorAll("[data-task-check]").forEach(input => {
        input.addEventListener("change", () => {
            toggleTask(input.dataset.taskCheck);
        });
    });

    container.querySelectorAll("[data-delete-task]").forEach(button => {
        button.addEventListener("click", () => {
            deleteTask(button.dataset.deleteTask);
        });
    });

}

function toggleTask(id) {

    const task = data.tasks.find(item => item.id === id);

    if (!task) return;

    task.completed = !task.completed;

    if (task.completed) {
        data.completedDates[todayString()] =
            (data.completedDates[todayString()] || 0) + 1;

        showToast("Great job! Task completed! ✨");
    }

    saveData();

    renderTasks();
    updateDashboard();
    updateAnalytics();
}

function deleteTask(id) {

    if (!confirm("Are you sure you want to delete this task?")) return;

    data.tasks = data.tasks.filter(task => task.id !== id);

    saveData();

    renderTasks();
    updateDashboard();
    updateAnalytics();

    showToast("Task deleted.");
}

// ======================================
// STUDY PLANNER
// ======================================

document.getElementById("planForm").addEventListener("submit", event => {

    event.preventDefault();

    const plan = {
        id: Date.now().toString(),
        subject: document.getElementById("planSubject").value.trim(),
        day: document.getElementById("planDay").value,
        time: document.getElementById("planTime").value,
        duration: Number(document.getElementById("planDuration").value)
    };

    if (!plan.subject || !plan.time || !plan.duration) return;

    data.plans.push(plan);

    saveData();
    renderPlans();

    closeModal("planModal");
    event.target.reset();

    showToast("Study session scheduled!");
});

function renderPlans() {

    const container = document.getElementById("studyPlans");

    const dayOrder = [
        "Monday", "Tuesday", "Wednesday",
        "Thursday", "Friday", "Saturday", "Sunday"
    ];

    const plans = [...data.plans].sort((a, b) => {
        return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
            || a.time.localeCompare(b.time);
    });

    if (!plans.length) {
        container.innerHTML =
            `<div class="empty-state">Your study schedule is empty. Add a session!</div>`;
        return;
    }

    container.innerHTML = plans.map(plan => `
        <div class="plan-row">
            <div class="plan-time">
                ${plan.time}
            </div>

            <div class="plan-details">
                <h4>${escapeHTML(plan.subject)}</h4>
                <span>${plan.day} · ${plan.duration} minutes</span>
            </div>

            <button class="delete-btn"
                data-delete-plan="${plan.id}">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join("");

    container.querySelectorAll("[data-delete-plan]").forEach(button => {

        button.addEventListener("click", () => {

            data.plans = data.plans.filter(plan =>
                plan.id !== button.dataset.deletePlan
            );

            saveData();
            renderPlans();

            showToast("Study session removed.");
        });

    });

}

// ======================================
// EXAM TRACKER
// ======================================

document.getElementById("examForm").addEventListener("submit", event => {

    event.preventDefault();

    const exam = {
        id: Date.now().toString(),
        subject: document.getElementById("examSubject").value.trim(),
        date: document.getElementById("examDate").value,
        type: document.getElementById("examType").value
    };

    if (!exam.subject || !exam.date) return;

    if (exam.date < todayString()) {
        showToast("Please select a future exam date.");
        return;
    }

    data.exams.push(exam);

    saveData();
    renderExams();
    renderUpcomingExams();

    closeModal("examModal");
    event.target.reset();

    document.getElementById("examDate").min = todayString();

    showToast("Exam added successfully!");
});

function getExamDays(date) {

    const today = new Date(todayString() + "T00:00:00");
    const examDate = new Date(date + "T00:00:00");

    return Math.ceil((examDate - today) / 86400000);
}

function renderExams() {

    const container = document.getElementById("examList");

    const exams = [...data.exams].sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    if (!exams.length) {
        container.innerHTML =
            `<div class="empty-state">No exams added yet. Start tracking your exams!</div>`;
        return;
    }

    container.innerHTML = exams.map(exam => {

        const days = getExamDays(exam.date);

        return `
            <div class="exam-card">
                <span class="exam-type">${escapeHTML(exam.type)}</span>

                <h3>${escapeHTML(exam.subject)}</h3>

                <p>${formatDate(exam.date)}</p>

                <div class="exam-days">
                    ${days === 0 ? "Today!" : days + " days"}
                </div>

                <p>${days === 0 ? "Your exam is today!" : "Remaining until exam"}</p>

                <button class="delete-btn"
                    data-delete-exam="${exam.id}"
                    style="margin-top:15px">
                    <i class="fa-solid fa-trash"></i> Remove
                </button>
            </div>
        `;
    }).join("");

    container.querySelectorAll("[data-delete-exam]").forEach(button => {

        button.addEventListener("click", () => {

            if (!confirm("Delete this exam?")) return;

            data.exams = data.exams.filter(exam =>
                exam.id !== button.dataset.deleteExam
            );

            saveData();
            renderExams();
            renderUpcomingExams();

            showToast("Exam removed.");
        });

    });

}

function renderUpcomingExams() {

    const container = document.getElementById("upcomingExams");

    const exams = data.exams
        .filter(exam => exam.date >= todayString())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);

    if (!exams.length) {
        container.innerHTML =
            `<div class="empty-state">No upcoming exams added.</div>`;
        return;
    }

    container.innerHTML = exams.map(exam => `
        <div class="plan-row">
            <div class="plan-time">${getExamDays(exam.date)} days</div>
            <div class="plan-details">
                <h4>${escapeHTML(exam.subject)}</h4>
                <span>${formatDate(exam.date)} · ${escapeHTML(exam.type)}</span>
            </div>
        </div>
    `).join("");

}

// ======================================
// POMODORO TIMER
// ======================================

let timerSeconds = 25 * 60;
let timerInterval = null;
let timerRunning = false;
let currentMode = "Focus";
let currentDuration = 25;

function setupTimer() {

    document.querySelectorAll(".mode-btn").forEach(button => {

        button.addEventListener("click", () => {

            stopTimer();

            document.querySelectorAll(".mode-btn").forEach(btn => {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            currentDuration = Number(button.dataset.minutes);
            currentMode = button.dataset.mode;

            timerSeconds = currentDuration * 60;

            updateTimerDisplay();

            document.getElementById("timerModeLabel").textContent =
                currentMode.toUpperCase() + " SESSION";

            document.getElementById("timerStatus").textContent =
                "Ready when you are.";

            document.getElementById("miniTimerLabel").textContent =
                currentMode.toUpperCase();
        });

    });

    document.getElementById("startTimer").addEventListener("click", () => {

        if (timerRunning) {
            stopTimer();
            return;
        }

        startTimer();
    });

    document.getElementById("resetTimer").addEventListener("click", () => {

        stopTimer();

        timerSeconds = currentDuration * 60;

        updateTimerDisplay();

        document.getElementById("timerStatus").textContent =
            "Timer reset. Ready to start!";

    });

    updateTimerDisplay();
}

function startTimer() {

    if (timerRunning) return;

    timerRunning = true;

    document.getElementById("startTimer").innerHTML =
        '<i class="fa-solid fa-pause"></i> Pause';

    document.getElementById("timerStatus").textContent =
        "Stay focused. You've got this!";

    timerInterval = setInterval(() => {

        timerSeconds--;

        updateTimerDisplay();

        if (timerSeconds <= 0) {
            finishTimer();
        }

    }, 1000);

}

function stopTimer() {

    clearInterval(timerInterval);

    timerRunning = false;

    const button = document.getElementById("startTimer");

    button.innerHTML = '<i class="fa-solid fa-play"></i> Start';

}

function finishTimer() {

    stopTimer();

    if (currentMode === "Focus") {

        data.sessions++;

        data.studyMinutes += currentDuration;

        saveData();

        document.getElementById("sessionCount").textContent =
            data.sessions;

        showToast("Focus session completed! Excellent work! 🎉");

        updateDashboard();
        updateAnalytics();

    } else {
        showToast("Break completed! Time to get back.");
    }

    document.getElementById("timerStatus").textContent =
        "Session completed!";

    timerSeconds = 0;
    updateTimerDisplay();

    document.getElementById("startTimer").disabled = true;

    setTimeout(() => {
        document.getElementById("startTimer").disabled = false;
    }, 1500);

}

function updateTimerDisplay() {

    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;

    const formatted =
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");

    document.getElementById("mainTimer").textContent = formatted;
    document.getElementById("miniTimer").textContent = formatted;

    document.getElementById("sessionCount").textContent =
        data.sessions;
}

// ======================================
// ANALYTICS
// ======================================

function updateAnalytics() {

    const completed = data.tasks.filter(task => task.completed).length;

    const rate = data.tasks.length
        ? Math.round((completed / data.tasks.length) * 100)
        : 0;

    document.getElementById("analyticsCompleted").textContent = completed;

    document.getElementById("analyticsHours").textContent =
        (data.studyMinutes / 60).toFixed(1) + "h";

    document.getElementById("analyticsSessions").textContent =
        data.sessions;

    document.getElementById("analyticsRate").textContent =
        rate + "%";

    renderWeeklyChart();
}

function renderWeeklyChart() {

    const container = document.getElementById("weeklyChart");

    const days = [];

    for (let i = 6; i >= 0; i--) {

        const date = new Date();

        date.setDate(date.getDate() - i);

        const key = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        days.push({
            name: date.toLocaleDateString("en-IN", { weekday: "short" }),
            count: data.completedDates[key] || 0
        });
    }

    const max = Math.max(1, ...days.map(day => day.count));

    container.innerHTML = days.map(day => {

        const height = Math.max(4, (day.count / max) * 100);

        return `
            <div class="chart-column">
                <div class="chart-bar"
                    style="height:${height}%"
                    title="${day.count} tasks completed">
                </div>
                <span>${day.name}</span>
            </div>
        `;

    }).join("");

}

// ======================================
// SETTINGS
// ======================================

function setupSettings() {

    document.getElementById("settingsBtn").addEventListener("click", () => {
        document.getElementById("nameInput").value = data.name;
        openModal("settingsModal");
    });

    document.getElementById("settingsForm").addEventListener("submit", event => {

        event.preventDefault();

        const name = document.getElementById("nameInput").value.trim();

        if (!name) {
            showToast("Please enter your name.");
            return;
        }

        data.name = name;

        saveData();

        document.getElementById("profileName").textContent = name;

        updateGreeting();

        closeModal("settingsModal");

        showToast("Profile updated successfully!");
    });

    document.getElementById("resetData").addEventListener("click", () => {

        const confirmed = confirm(
            "Are you sure? All your FocusFlow data will be permanently deleted."
        );

        if (!confirmed) return;

        const currentTheme = data.lightMode;

        data = {
            ...defaultData,
            lightMode: currentTheme
        };

        saveData();

        stopTimer();

        closeModal("settingsModal");

        renderTasks();
        renderPlans();
        renderExams();

        updateDashboard();
        updateAnalytics();
        updateGreeting();

        showToast("Workspace has been reset.");
    });

}

// ======================================
// THEME
// ======================================

function toggleTheme() {

    document.body.classList.toggle("light");

    data.lightMode = document.body.classList.contains("light");

    document.getElementById("themeBtn").innerHTML =
        data.lightMode
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';

    saveData();
}

// ======================================
// MODALS
// ======================================

function setupModals() {

    document.querySelectorAll("[data-close]").forEach(button => {

        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });

    });

    document.querySelectorAll(".modal-overlay").forEach(overlay => {

        overlay.addEventListener("click", event => {

            if (event.target === overlay) {
                closeModal(overlay.id);
            }

        });

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            document.querySelectorAll(".modal-overlay.show").forEach(modal => {
                closeModal(modal.id);
            });
        }

    });

}

function openModal(id) {
    document.getElementById(id).classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}

// ======================================
// TOAST NOTIFICATIONS
// ======================================

let toastTimeout;

function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);

}

// ======================================
// END OF FOCUSFLOW
// ======================================