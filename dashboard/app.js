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
        element.textContent =
            end.toLocaleString();
        return;
    }

    element.dataset.value = end;

    element.classList.remove("value-refresh");

    void element.offsetWidth;

    element.classList.add("value-refresh");

    const startTime = performance.now();

    function tick(now) {
        const progress =
            Math.min(
                (now - startTime) / duration,
                1
            );

        const eased =
            1 - Math.pow(1 - progress, 3);

        const value =
            Math.round(
                start +
                (end - start) * eased
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
    const value =
        Number(minutes) || 0;

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

    const chatKing =
        data.kings.chat;

    const voiceKing =
        data.kings.voice;


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
   ACTIVITY CHART
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


        const label =
            item.hour !== undefined
                ? `${item.hour}:00`
                : item.day || "Unknown";


        bar.title =
            `${label} — ` +
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


function getSectionName(item) {

    const clone =
        item.cloneNode(true);

    const icon =
        clone.querySelector("span");

    if (icon) {
        icon.remove();
    }

    return clone.textContent.trim();
}


function getViewId(section) {

    return section
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}


function showView(section) {

    const id =
        getViewId(section);

    const target =
        document.getElementById(
            `${id}-view`
        );


    if (!target) {
        console.warn(
            `ASTER: View not found → ${section}`
        );
        return;
    }


    document
        .querySelectorAll(
            ".dashboard-view"
        )
        .forEach(view => {

            view.style.display =
                "none";

        });


    target.style.display =
        "block";


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            getSectionName(item) === section
        );

    });


    if (section === "Members") {
    loadMembers();
}

if (section === "Leaderboards") {
    loadLeaderboards();
}


    console.log(
        `✦ ASTER NAVIGATION → ${section}`
    );
}


navItems.forEach(item => {

    item.addEventListener(
        "click",
        event => {

            event.preventDefault();

            const section =
                getSectionName(item);

            showView(section);
        }
    );

});


/* =========================================================
   MEMBERS
   ========================================================= */

let membersSearchTimer = null;


async function loadMembers(search = "") {

    const list =
        document.getElementById(
            "members-list"
        );

    if (!list) return;


    list.innerHTML = `
        <div class="member-empty">
            Loading members...
        </div>
    `;


    try {

        const response =
            await fetch(
                `/api/members?search=${encodeURIComponent(search)}`
            );


        if (!response.ok) {
            throw new Error(
                "Members request failed"
            );
        }


        const data =
            await response.json();


        renderMembers(
            data.members || []
        );


    } catch (error) {

        console.error(
            "ASTER MEMBERS ERROR:",
            error
        );


        list.innerHTML = `
            <div class="member-empty">
                Failed to load members.
            </div>
        `;
    }
}


function renderMembers(members) {

    const list =
        document.getElementById(
            "members-list"
        );

    if (!list) return;


    if (!members.length) {

        list.innerHTML = `
            <div class="member-empty">
                No members found.
            </div>
        `;

        return;
    }


    list.innerHTML =
        members.map(member => {

            return `
                <div class="member-row">

                    <span class="member-id">
                        ${escapeHtml(
                            member.userId
                        )}
                    </span>

                    <span>
                        ${member.level}
                    </span>

                    <span>
                        ${Number(
                            member.xp
                        ).toLocaleString()}
                    </span>

                    <span>
                        ${Number(
                            member.messages
                        ).toLocaleString()}
                    </span>

                    <span>
                        ${formatVoiceTime(
                            member.voiceTime
                        )}
                    </span>

                </div>
            `;

        }).join("");
}


function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MEMBER SEARCH
   ========================================================= */

const memberSearch =
    document.getElementById(
        "member-search"
    );


if (memberSearch) {

    memberSearch.addEventListener(
        "input",
        () => {

            clearTimeout(
                membersSearchTimer
            );


            const search =
                memberSearch.value.trim();


            membersSearchTimer =
                setTimeout(() => {

                    loadMembers(search);

                }, 250);

        }
    );

}


/* =========================================================
   PERIOD SELECTOR
   ========================================================= */

document
    .querySelectorAll(
        ".period-selector button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const parent =
                    button.parentElement;


                parent
                    .querySelectorAll("button")
                    .forEach(btn =>
                        btn.classList.remove(
                            "selected"
                        )
                    );


                button.classList.add(
                    "selected"
                );


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

            }
        );

    });


/* =========================================================
   MOUSE GLOW
   ========================================================= */

document
    .querySelectorAll(
        ".stat-card, .panel, .king-card"
    )
    .forEach(card => {

        card.addEventListener(
            "mousemove",
            event => {

                const rect =
                    card.getBoundingClientRect();


                const x =
                    ((event.clientX - rect.left) /
                        rect.width) * 100;


                const y =
                    ((event.clientY - rect.top) /
                        rect.height) * 100;


                card.style.setProperty(
                    "--mouse-x",
                    `${x}%`
                );


                card.style.setProperty(
                    "--mouse-y",
                    `${y}%`
                );

            }
        );

    });

    /* =========================================================
   LEADERBOARDS
   ========================================================= */

async function loadLeaderboards() {

    try {

        const response =
            await fetch("/api/members");

        if (!response.ok) {
            throw new Error(
                "Leaderboard request failed"
            );
        }

        const data =
            await response.json();

        const members =
            data.members || [];

        renderLeaderboard(
            "xp-leaderboard",
            [...members]
                .sort((a, b) => b.xp - a.xp),
            member => member.xp.toLocaleString()
        );

        renderLeaderboard(
            "chat-leaderboard",
            [...members]
                .sort((a, b) => b.messages - a.messages),
            member => member.messages.toLocaleString()
        );

        renderLeaderboard(
            "voice-leaderboard",
            [...members]
                .sort((a, b) => b.voiceTime - a.voiceTime),
            member => formatVoiceTime(member.voiceTime)
        );

    } catch (error) {

        console.error(
            "ASTER LEADERBOARD ERROR:",
            error
        );

    }
}


function renderLeaderboard(
    elementId,
    members,
    formatValue
) {

    const element =
        document.getElementById(elementId);

    if (!element) return;

    const top =
        members
            .filter(member =>
                member.userId
            )
            .slice(0, 10);

    if (!top.length) {

        element.innerHTML = `
            <div class="member-empty">
                No ranking data.
            </div>
        `;

        return;
    }

    element.innerHTML =
        top.map((member, index) => `

            <div class="leaderboard-entry">

                <span class="leaderboard-rank">
                    #${index + 1}
                </span>

                <span class="leaderboard-user">
                    ${escapeHtml(member.userId)}
                </span>

                <span class="leaderboard-value">
                    ${formatValue(member)}
                </span>

            </div>

        `).join("");
}


/* =========================================================
   START
   ========================================================= */

showView("Overview");

loadDashboard();


let dashboardRefreshing =
    false;


async function refreshDashboard() {

    if (dashboardRefreshing) return;


    dashboardRefreshing = true;


    document.body.classList.add(
        "dashboard-refreshing"
    );


    try {

        await loadDashboard();


        const active =
            document.querySelector(
                ".nav-item.active"
            );


        if (
            active &&
            getSectionName(active) === "Members"
        ) {

            await loadMembers(
                memberSearch?.value.trim() || ""
            );

        }


    } finally {

        setTimeout(() => {

            document.body.classList.remove(
                "dashboard-refreshing"
            );


            dashboardRefreshing =
                false;

        }, 350);

    }
}


setInterval(
    refreshDashboard,
    30000
);