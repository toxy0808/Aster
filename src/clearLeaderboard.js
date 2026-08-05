const leaderboardDB = require("./database/leaderboardMessages");

leaderboardDB.prepare(
    "DELETE FROM leaderboard_messages"
).run();

console.log("Leaderboard messages cleared");