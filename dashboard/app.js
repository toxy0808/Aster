async function loadDashboard() {
    try {
        const [overviewResponse, activityResponse] =
            await Promise.all([
                fetch("/api/overview"),
                fetch("/api/activity")
            ]);

        if (!overviewResponse.ok ||
            !activityResponse.ok) {
            throw new Error("API request failed");
        }

        const data =
            await overviewResponse.json();

        const activityData =
            await activityResponse.json();

        updateStatCards(data);
        updateKings(data);
        updateActivityPage(data);
        updateActivityChart(activityData);

    } catch (error) {
        console.error(
            "ASTER DASHBOARD ERROR:",
            error
        );
    }
}

/* =========================================================
   ANIMATED NUMBERS
   ========================================================= */
function animateNumber(element, target, duration = 700) {
    const end = Number(target) || 0;
    const start = Number(element.dataset.value || 0);

    if (start === end) {
        element.textContent = end.toLocaleString();
        return;
    }

    element.dataset.value = end;

    element.classList.remove("value-refresh");

    // Force reflow so the animation can restart
    void element.offsetWidth;

    element.classList.add("value-refresh");

    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min(
            (now - startTime) / duration,
            1
        );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const value =
            Math.round(
                start + (end - start) * eased
            );

        element.textContent =
            value.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            setTimeout(() => {
                element.classList.remove(
                    "value-refresh"
                );
            }, 180);
        }
    }

    requestAnimationFrame(tick);
}

/* =========================================================
   STAT CARDS
   ========================================================= */

function updateStatCards(data) {
    const values =
        document.querySelectorAll(
            "#overview-view .stat-value"
        );

    if (values.length < 4) return;

    animateNumber(
        values[0],
        data.stats.members
    );

    animateNumber(
        values[1],
        data.stats.messages
    );

    animateNumber(
        values[2],
        data.stats.xp
    );

    animateVoice(
        values[3],
        data.stats.voice
    );
}

function animateVoice(element, minutes) {
    const value = Number(minutes) || 0;

    element.dataset.value = value;
    element.textContent =
        formatVoiceTime(value);
}

/* =========================================================
   KINGS
   ========================================================= */

function updateKings(data) {
    const kingCards =
        document.querySelectorAll(
            "#overview-view .king-card"
        );

    if (kingCards.length < 2) return;

    const chatKing = data.kings.chat;
    const voiceKing = data.kings.voice;

    const chatName =
        kingCards[0].querySelector(
            ".king-info strong"
        );

    const chatValue =
        kingCards[0].querySelector(
            ".king-value"
        );

    if (chatKing) {
        chatName.textContent =
            chatKing.user_id;

        chatValue.innerHTML =
            `${Number(
                chatKing.amount
            ).toLocaleString()}<small>MESSAGES</small>`;
    } else {
        chatName.textContent =
            "No data";

        chatValue.innerHTML =
            `0<small>MESSAGES</small>`;
    }

    const voiceName =
        kingCards[1].querySelector(
            ".king-info strong"
        );

    const voiceValue =
        kingCards[1].querySelector(
            ".king-value"
        );

    if (voiceKing) {
        voiceName.textContent =
            voiceKing.user_id;

        voiceValue.innerHTML =
            `${formatVoiceTime(
                voiceKing.amount
            )}<small>VOICE TIME</small>`;
    } else {
        voiceName.textContent =
            "No data";

        voiceValue.innerHTML =
            `0m<small>VOICE TIME</small>`;
    }
}

/* =========================================================
   ACTIVITY
   ========================================================= */

function updateActivityPage(data) {
    const messages =
        document.getElementById(
            "activity-messages"
        );

    const voice =
        document.getElementById(
            "activity-voice"
        );

    const xp =
        document.getElementById(
            "activity-xp"
        );

    if (messages) {
        animateNumber(
            messages,
            data.activity24h?.messages || 0
        );
    }

    if (voice) {
        voice.textContent =
            formatVoiceTime(
                data.activity24h?.voice || 0
            );
    }

    if (xp) {
        animateNumber(
            xp,
            data.stats.xp || 0
        );
    }
}

/* =========================================================
   LIVE ACTIVITY CHART
   ========================================================= */

function updateActivityChart(data) {
    const chart =
        document.querySelector(
            ".chart-bars"
        );

    if (!chart) return;

    const activity =
        Array.isArray(data.activity)
            ? data.activity
            : [];

    if (!activity.length) return;

    chart.innerHTML = "";

    const values =
        activity.map(item => {
            const chat =
                Number(item.chat) || 0;

            const voice =
                Number(item.voice) || 0;

            return chat + voice;
        });

    const max =
        Math.max(...values, 1);

    activity.forEach((item, index) => {
        const bar =
            document.createElement("span");

        const total =
            (Number(item.chat) || 0) +
            (Number(item.voice) || 0);

        const height =
            Math.max(
                total > 0
                    ? (total / max) * 100
                    : 2,
                2
            );

        bar.style.height =
            `${height}%`;

        bar.title =
            `${item.hour}:00 — ` +
            `${Number(item.chat) || 0} messages · ` +
            `${Number(item.voice) || 0} voice`;

        bar.style.animationDelay =
            `${index * 0.025}s`;

        chart.appendChild(bar);
    });
}

/* =========================================================
   VOICE FORMAT
   ========================================================= */

function formatVoiceTime(minutes) {
    const value =
        Number(minutes) || 0;

    const hours =
        Math.floor(value / 60);

    const mins =
        value % 60;

    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }

    return `${mins}m`;
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const navItems =
    document.querySelectorAll(
        ".nav-item"
    );

const views = {
    "Overview":
        document.getElementById(
            "overview-view"
        ),

    "Activity":
        document.getElementById(
            "activity-view"
        )
};

navItems.forEach(item => {
    item.addEventListener(
        "click",
        () => {
            const section =
                item.textContent.trim();

            navItems.forEach(nav =>
                nav.classList.remove(
                    "active"
                )
            );

            item.classList.add(
                "active"
            );

            document
                .querySelectorAll(
                    ".dashboard-view"
                )
                .forEach(view => {
                    view.style.display =
                        "none";
                });

            if (views[section]) {
                views[section].style.display =
                    "block";
            }

            console.log(
                `✦ ASTER NAVIGATION → ${section}`
            );
        }
    );
});

/* =========================================================
   PERIOD SELECTOR
   ========================================================= */

document
    .querySelectorAll(".period-selector button")
    .forEach(button => {

        button.addEventListener("click", async () => {

            const parent =
                button.parentElement;

            parent
                .querySelectorAll("button")
                .forEach(btn =>
                    btn.classList.remove("selected")
                );

            button.classList.add("selected");

            const period =
                button.textContent
                    .trim()
                    .toLowerCase();

            try {
                const response =
                    await fetch(
                        `/api/activity?period=${period}`
                    );

                if (!response.ok) {
                    throw new Error(
                        "Activity request failed"
                    );
                }

                const data =
                    await response.json();

                updateActivityChart(data);

                console.log(
                    `✦ ASTER ACTIVITY PERIOD → ${period.toUpperCase()}`
                );

            } catch (error) {
                console.error(
                    "ASTER ACTIVITY PERIOD ERROR:",
                    error
                );
            }
        });
    });


/* =========================================================
   START
   ========================================================= */

loadDashboard();
let dashboardRefreshing = false;

async function refreshDashboard() {
    if (dashboardRefreshing) return;

    dashboardRefreshing = true;

    document.body.classList.add(
        "dashboard-refreshing"
    );

    try {
        await loadDashboard();
    } finally {
        setTimeout(() => {
            document.body.classList.remove(
                "dashboard-refreshing"
            );

            dashboardRefreshing = false;
        }, 350);
    }
}

setInterval(
    refreshDashboard,
    30000
);