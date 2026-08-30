if (process.env.GITHUB_ACTIONS !== "true") {
    require("dotenv").config();
}
const axios = require("axios");

const DISCORD_CLIENT_ID = process.env.APP_ID;
const DISCORD_USER_ID = process.env.DISCORD_USER_ID;
const DISCORD_BOT_TOKEN = process.env.TOKEN;

// ใช้คู่เดียวกับที่ตั้งไว้กับโปรเจค Genshin ได้เลย
const headers = {
    Cookie: `ltoken_v2=${process.env.HOYO_LTOKEN_V2}; ltuid_v2=${process.env.HOYO_LTUID_V2}; account_id_v2=${process.env.HOYO_LTUID_V2}`,
};

const PROFILE_URL = `https://sg-act-public-api.hoyolab.com/game_record/card/wapi/getGameRecordCard?uid=${process.env.HOYOLAB_ID}`;
const INDEX_URL = `https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/index?server=prod_gf_jp&role_id=${process.env.ZZZ_ID}`;
const NOTE_URL = `https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz/note?server=prod_gf_jp&role_id=${process.env.ZZZ_ID}`;

async function syncZzzStats() {
    try {
        const [profileRes, indexRes, noteRes] = await Promise.all([
            axios.get(PROFILE_URL, { headers, timeout: 10000 }),
            axios.get(INDEX_URL, { headers, timeout: 10000 }),
            axios.get(NOTE_URL, { headers, timeout: 10000 }),
        ]);

        const profile = profileRes.data.data.list[0];
        const stats = indexRes.data.data.stats;
        const gameDataShow = indexRes.data.data.game_data_show;
        const battery = noteRes.data.data.energy;

        const statMap = Object.fromEntries(profile.data.map((s) => [s.name, s.value]));

        const nickname = `${profile.nickname} (${profile.region_name})`;
        const level = `Level ${profile.level}`;
        const uid = `UID: ${profile.game_role_id}`;
        const title = gameDataShow?.personal_title ?? "";
        const daysActive = statMap["Days Active"] ?? "-";
        const achievements = statMap["No. of Achievements Earned"] ?? "-";
        const agents = statMap["Agents Recruited"] ?? "-";
        const bangboo = statMap["Bangboo Obtained"] ?? "-";
        const worldLevel = stats?.world_level_name ?? "-";
        const batteryStr = `${battery.progress.current}/${battery.progress.max}`;

        // Shiyu Defense (ยืนยันแล้วจาก medal_type: MedalTypeChangeHadal)
        const hadal = stats?.hadal_brief?.hadal_brief_v2;
        const shiyuStr = hadal
            ? `Layer ${hadal.cur_period_zone_layer_count} • ${hadal.rating} (${hadal.score}/${hadal.max_score})`
            : "Not Attempted";
        const shiyuSClears = stats?.challenge_full_s_times ?? 0;

        // Deadly Assault (ยืนยันแล้วจาก medal_type: MedalTypeMemHadal — ชื่อ field ในนี้สลับกับความหมายจริง)
        const da = stats?.memory_battlefield;
        const daStr = da
            ? `${da.total_score} pts • ${da.total_star}★${da.has_hard ? ` (Hard: ${da.hard_total_score})` : ""}`
            : "Not Attempted";
        const daFullStars = stats?.memory_battlefield_full_stars_times ?? 0;

        const dynamic = [
            { type: 1, name: "nickname", value: nickname },
            { type: 1, name: "level", value: level },
            { type: 1, name: "uid", value: uid },
            { type: 1, name: "title", value: title },
            { type: 1, name: "days_str", value: "Days Active" },
            { type: 1, name: "days", value: String(daysActive) },
            { type: 1, name: "ach_str", value: "Achievements" },
            { type: 1, name: "ach", value: String(achievements) },
            { type: 1, name: "agents_str", value: "Agents" },
            { type: 1, name: "agents", value: String(agents) },
            { type: 1, name: "bangboo_str", value: "Bangboo" },
            { type: 1, name: "bangboo", value: String(bangboo) },
            { type: 1, name: "world_str", value: "Inter-Knot Level" },
            { type: 1, name: "world", value: worldLevel },
            { type: 1, name: "battery_str", value: "Battery" },
            { type: 1, name: "battery", value: batteryStr },
            { type: 1, name: "shiyu_str", value: "Shiyu Defense" },
            { type: 1, name: "shiyu", value: shiyuStr },
            { type: 1, name: "shiyu_s_str", value: "Shiyu S-Clears" },
            { type: 1, name: "shiyu_s", value: String(shiyuSClears) },
            { type: 1, name: "da_str", value: "Deadly Assault" },
            { type: 1, name: "da", value: daStr },
            { type: 1, name: "da_stars_str", value: "DA Full-Star Clears" },
            { type: 1, name: "da_stars", value: String(daFullStars) },
        ];

        const discordApiUrl =
            `https://discord.com/api/v9/applications/${DISCORD_CLIENT_ID}` +
            `/users/${DISCORD_USER_ID}/identities/0/profile`;

        const response = await axios.patch(
            discordApiUrl,
            { data: { dynamic } },
            {
                headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`✅ Successfully synced ZZZ widget for ${profile.nickname}. Status: ${response.status}`);
    } catch (error) {
        if (error.response) {
            console.error("API Error:", error.response.status, error.response.data);
            process.exit(1);
        } else {
            console.error("Request Error:", error.message);
            process.exit(1);
        }
    }
}

syncZzzStats();
