import { initApp } from "./appInit.js";
import { buildNavbar, getEndpointData } from "./core.js";
import { constants } from "./constants.js";
import { logoutUser } from "./authentication.js";

await initApp();

/* ======================================================
    NAVBAR
====================================================== */
document.querySelector(".navbar").innerHTML = buildNavbar();
const logoutBtn = document.querySelector("#logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}

/* ======================================================
    PRIVACY HELPER (IMPORTANT)
====================================================== */
function canViewField(isOwner, privacy, fieldKey) {
    if (isOwner) return true;
    if (!privacy) return false;
    if (!privacy.publicProfile) return false;

    const privacyMap = {
        email: "showEmail",
        location: "showLocation",
        interests: "showInterests",
        bio: "showBio",
        website: "showWebsite",
        displayName: "showDisplayName"
    };

    const flag = privacyMap[fieldKey];
    if (!flag) return false;

    return privacy[flag] === true;
}

/* ======================================================
    MAIN
====================================================== */
async function main() {
    const { snapshot } = constants.USER_CONFIGS;
    const params = new URLSearchParams(location.search);
    const requestedUsername = params.get("username");

    // Guest + no username
    if (snapshot.isGuest && !requestedUsername) {
        document.body.innerHTML = 
        `<nav class="navbar"></nav>

         <div class="auth-callout">
             <h3 class="auth-callout-title">
                 You must be logged in to view your threads
             </h3>
 
             <p class="auth-callout-text">
                 Create an account or log in to manage your discussions and posts.
             </p>
 
             <div class="auth-callout-actions">
                 <a href="./login.html" class="btn btn-primary">Login</a>
                 <a href="./signup.html" class="btn btn-secondary">Sign up</a>
             </div>
         </div>
    `;
        document.querySelector(".navbar").innerHTML = buildNavbar(); // rebuild navbar
        console.error("Guest access to Profile is invalid.");
        return;
    }

    // Self profile
    if (!requestedUsername || requestedUsername === snapshot.username) {
        if (requestedUsername) {
            history.replaceState({}, "", "/views/profile.html");
        }
        renderProfile(snapshot, true);
        return;
    }

    // Viewing another user
    const users = await getEndpointData(
        `user?username=${requestedUsername}`,
        false,
        constants.SERVER_URI
    );

    if (!users.length) {
        showMessage("User not found.");
        return;
    }

    const targetUser = users[0];
    const privacy = targetUser.profile?.privacy || {};

    if (!privacy.publicProfile) {
        showMessage("This profile is private.");
        return;
    }

    renderProfile(targetUser, false);
}

/* ======================================================
    RENDER PROFILE
====================================================== */
function renderProfile(user, isOwner) {
    const profile = user.profile || {};
    const privacy = profile.privacy || {};

    document.querySelector("#profileHeading").textContent =
        isOwner ? "My Profile" : `${user.username}'s Profile`;

    document.querySelector("#profileUsername").textContent = user.username;
    document.querySelector("#profileRole").textContent = user.role;
    document.querySelector("#profileCreatedAt").textContent =
        new Date(user.createdAt).toLocaleDateString();

    const emailEl = document.querySelector("#profileEmail");
    emailEl.textContent = canViewField(isOwner, privacy, "email")
        ? user.email || "--"
        : "Private";

    // Extra fields
    const card = document.querySelector(".profile-card");

    const fields = [
        { key: "displayName", label: "Display Name" },
        { key: "bio", label: "Bio" },
        { key: "location", label: "Location" },
        { key: "website", label: "Website" },
        { key: "interests", label: "Interests" }
    ];

    fields.forEach(({ key, label }) => {
        if (!canViewField(isOwner, privacy, key)) return;

        const row = document.createElement("div");
        row.className = "row extra-row";

        const lbl = document.createElement("span");
        lbl.className = "label";
        lbl.textContent = label;

        const val = document.createElement("span");

        if (Array.isArray(profile[key])) {
            val.textContent = profile[key].join(", ");
        } else {
            val.textContent = profile[key] || "--";
        }

        row.append(lbl, val);
        card.append(row);
    });

    // Edit profile button
    const actions = document.querySelector("#profileActions");
    if (isOwner) actions.classList.remove("hidden");
}

/* ======================================================
    UI HELPERS
====================================================== */
function showMessage(msg) {
    document.querySelector(".profile-container").innerHTML =
        `<p class="profile-message">${msg}</p>`;
}

main();
