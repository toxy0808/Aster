function replaceDonorVariables(template, context = {}) {

    const guild =
        context.guild || null;

    const user =
        context.user ||
        context.member?.user ||
        null;

    const member =
        context.member ||
        null;

    const channel =
        context.channel ||
        null;

    const role =
        context.role ||
        null;

    const settings =
        context.settings ||
        {};

    const amount =
        context.amount;

    const currency =
        context.currency ||
        "USD";

    const tier =
        context.tier ||
        "";

    const values = {

        user:
            user
                ? `<@${user.id}>`
                : "",

        username:
            user?.username ||
            "",

        member:
            member
                ? `<@${member.id}>`
                : user
                    ? `<@${user.id}>`
                    : "",

        guild:
            guild?.name ||
            "",

        channel:
            channel
                ? `<#${channel.id}>`
                : "",

        link:
            settings.kofi_url ||
            "",

        role:
            role
                ? `<@&${role.id}>`
                : "",

        tier:
            tier,

        amount:
            amount !== undefined &&
            amount !== null &&
            amount !== ""
                ? `$${Number(amount).toFixed(2)}`
                : "",

        currency:
            currency
    };

    return String(template || "")
        .replace(
            /\{([a-zA-Z0-9_]+)\}/g,
            (match, key) => {

                const normalized =
                    key.toLowerCase();

                if (
                    Object.prototype.hasOwnProperty.call(
                        values,
                        normalized
                    )
                ) {
                    return String(
                        values[normalized]
                    );
                }

                return match;
            }
        );
}

module.exports = {
    replaceDonorVariables
};