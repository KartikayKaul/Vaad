import { initApp } from "./appInit.js";
import { buildNavbar, getEndpointData } from "./core.js";
import { constants } from "./constants.js";
import { logoutUser } from "./authentication.js";

await initApp();

// inject navbar
document.querySelector(".navbar").innerHTML = buildNavbar();
const logoutBtn = document.querySelector("#logoutBtn"); //logout
if(logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}


async function main() {
    // constants
    const { snapshot } = constants.USER_CONFIGS;
    const params = new URLSearchParams(location.search);
    const requestedUsername = params.get("username");

    // guest + no username = redirecting to login.html
    if (snapshot.isGuest && !requestedUsername) {
        // guests cannot view their own profile 
        location.href = "/views/login.html";
    }

    // SELF PROFILE checking
    if(!requestedUsername || requestedUsername == snapshot.username) {
        // cleaning the URL for self profile view
        if(requestedUsername) {
            history.replaceState({}, "", "/views/profile.html");
            }
            
            renderProfile(snapshot, { isOwner: true});
            return;
    }

    // Viewing another user
    const users = await getEndpointData(
        `user?username=${requestedUsername}`,
        false,
        constants.SERVER_URI
    );

    if(users.length === 0) {
        showNotFound();
        return;
    }

    const targetUser = users[0];
    const privacy = targetUser.profile?.privacy || {};

    // PRIVATE PROFILE CHECK
    if(!privacy.publicProfile) {
        showPrivateMessage();
        return;
    }

    renderProfile(targetUser, { isOwner: false, privacy })
}

function renderProfile(user, { isOwner, privacy = {} }) {
    document.querySelector("#profileUsername").textContent = user.username;
    document.querySelector("#profileRole").textContent = user.role;
    document.querySelector("#profileCreatedAt").textContent = new Date(user.createdAt).toLocaleString();
    document.querySelector("#profileHeading").textContent = isOwner ? "My Profile" : `${user.username}'s Profile`;
    
    //render settings option
    const actions = document.querySelector("#profileActions");

    if(isOwner) {
        actions.classList.remove("hidden");
    } else {
        actions.classList.add("hidden");
    }

    // email visibility
    const emailEl = document.querySelector("#profileEmail");

    if( isOwner || privacy.showEmail) {
        emailEl.textContent = user.email || "--";
    } else {
        emailEl.textContent = "Private";
    }

    // todo: bio location interesets... will add soon
}

// UI Helpers
function showPrivateMessage() {
    document.querySelector(".profile-container").innerHTML = "<p>This profile is private.</p>";
}

function showNotFound() {
    document.querySelector(".profile-container").innerHTML = "<p>User not found.</p>";
}

main();
