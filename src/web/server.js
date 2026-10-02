const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../database/database");

function startServer(discordClient) {
    const app = express();

    // Raw body parser is strictly required for Stripe signature verification
    app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            console.error(`[ASTER STRIPE] Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const { discord_user_id, guild_id, tier_id } = session.metadata || {};

            if (!discord_user_id || !guild_id || !tier_id) {
                console.error("[ASTER STRIPE] Missing metadata in payment session.");
                return res.json({ received: true });
            }

            const tierData = db.donor.getTier(guild_id, tier_id);

            if (tierData) {
                try {
                    const guild = await discordClient.guilds.fetch(guild_id);
                    const member = await guild.members.fetch(discord_user_id);

                    // Assign donor role
                    await member.roles.add(tierData.role_id);

                    // Record transaction in database
                    db.donor.recordTransaction(
                        session.id,
                        guild_id,
                        discord_user_id,
                        tier_id,
                        session.amount_total
                    );

                    console.log(`[ASTER STRIPE] Assigned role ${tierData.role_id} to user ${discord_user_id}`);
                } catch (error) {
                    console.error(`[ASTER STRIPE] Failed to assign role: ${error.message}`);
                }
            } else {
                console.error(`[ASTER STRIPE] Tier ${tier_id} not found in database for guild ${guild_id}`);
            }
        }

        res.json({ received: true });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[ASTER STRIPE] Express server listening on port ${PORT}`);
    });
}

module.exports = startServer;