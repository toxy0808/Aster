async function loadDashboard() {
    try {
        const response = await fetch("/api/overview");

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const data = await response.json();

        updateStatCards(data);
        updateKings(data);
        updateActivityPage(data);

    } catch (error) {
        console.error("ASTER DASHBOARD ERROR:", error);
    }
}


function updateStatCards(data) {

    const values = document.querySelectorAll(
        "#overview-view .stat-value"
    );

    if (values.length >= 4) {

        values[0].textContent =
            Number(data.stats.members).toLocaleString();

        values[1].textContent =
            Number(data.stats.messages).toLocaleString();

        values[2].textContent =
            Number(data.stats.xp).toLocaleString();

        values[3].textContent =
            formatVoiceTime(data.stats.voice);
    }
}


function updateKings(data) {

    const kingCards = document.querySelectorAll(
        "#overview-view .king-card"
    );

    if (kingCards.length < 2) return;

    const chatKing = data.kings.chat;
    const voiceKing = data.kings.voice;


    const chatName =
        kingCards[0].querySelector(".king-info strong");

    const chatValue =
        kingCards[0].querySelector(".king-value");


    if (chatKing) {

        chatName.textContent = chatKing.user_id;

        chatValue.innerHTML =
            `${Number(chatKing.amount).toLocaleString()}<small>MESSAGES</small>`;

    } else {

        chatName.textContent = "No data";

        chatValue.innerHTML =
            `0<small>MESSAGES</small>`;
    }


    const voiceName =
        kingCards[1].querySelector(".king-info strong");

    const voiceValue =
        kingCards[1].querySelector(".king-value");


    if (voiceKing) {

        voiceName.textContent = voiceKing.user_id;

        voiceValue.innerHTML =
            `${formatVoiceTime(voiceKing.amount)}<small>VOICE TIME</small>`;

    } else {

        voiceName.textContent = "No data";

        voiceValue.innerHTML =
            `0m<small>VOICE TIME</small>`;
    }
}


function updateActivityPage(data) {

    const messages =
        document.getElementById("activity-messages");

    const voice =
        document.getElementById("activity-voice");

    const xp =
        document.getElementById("activity-xp");


    if (messages) {
        messages.textContent =
            Number(data.activity24h?.messages || 0)
                .toLocaleString();
    }


    if (voice) {
        voice.textContent =
            formatVoiceTime(
                data.activity24h?.voice || 0
            );
    }


    if (xp) {
        xp.textContent =
            Number(data.stats.xp || 0)
                .toLocaleString();
    }
}


function formatVoiceTime(minutes) {

    const value = Number(minutes) || 0;

    const hours = Math.floor(value / 60);

    const mins = value % 60;


    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }


    return `${mins}m`;
}


// =========================
// ASTER SIDEBAR NAVIGATION
// =========================

const navItems =
    document.querySelectorAll(".nav-item");


const views = {

    "Overview":
        document.getElementById("overview-view"),

    "Activity":
        document.getElementById("activity-view")

};


navItems.forEach(item => {

    item.addEventListener("click", () => {

        const section =
            item.textContent.trim();


        navItems.forEach(nav => {
            nav.classList.remove("active");
        });


        item.classList.add("active");


        document
            .querySelectorAll(".dashboard-view")
            .forEach(view => {

                view.style.display = "none";

            });


        if (views[section]) {

            views[section].style.display =
                "block";

        }


        console.log(
            `✦ ASTER NAVIGATION → ${section}`
        );

    });

});


// =========================
// ACTIVITY PERIOD BUTTONS
// =========================

document
    .querySelectorAll(".period-selector button")
    .forEach(button => {

        button.addEventListener("click", () => {

            const parent =
                button.parentElement;

            parent
                .querySelectorAll("button")
                .forEach(btn => {

                    btn.classList.remove("selected");

                });


            button.classList.add("selected");


            console.log(
                `✦ ASTER ACTIVITY PERIOD → ${button.textContent}`
            );

        });

    });


// Initial load
loadDashboard();


// Refresh dashboard data every 30 seconds
setInterval(loadDashboard, 30000);