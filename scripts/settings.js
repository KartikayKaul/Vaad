import { initApp } from "./appInit.js";
import { buildNavbar } from "./core.js";
import { constants } from "./constants.js";
import { logoutUser, resetPassword, updateProfile } from "./authentication.js";

await initApp();

// inject navbar
document.querySelector(".navbar").innerHTML = buildNavbar();

// auth guard
const user = constants.USER_CONFIGS.snapshot;
if (user.isGuest) {
    location.href = "/views/login.html";
}

/* ======================
   ELEMENT REFERENCES
====================== */

const displayName = document.querySelector("#displayName");
const bio = document.querySelector("#bio");
const locationInput = document.querySelector("#location");
const website = document.querySelector("#website");
const interests = document.querySelector("#interests");

const publicProfile = document.querySelector("#publicProfile");
const showEmail = document.querySelector("#showEmail");
const showLocation = document.querySelector("#showLocation");
const showInterests = document.querySelector("#showInterests");

/* 🚨 THIS was missing earlier */
if (
    !displayName ||
    !bio ||
    !locationInput ||
    !website ||
    !interests ||
    !publicProfile ||
    !showEmail ||
    !showLocation ||
    !showInterests
) {
    console.error("Settings DOM elements missing");
    throw new Error("Settings page not fully loaded");
}

/* ======================
   PRELOAD DATA
====================== */

const profile = user.profile || {};
const privacy = profile.privacy || {};

displayName.value = profile.displayName || "";
bio.value = profile.bio || "";
locationInput.value = profile.location || "";
website.value = profile.website || "";
interests.value = (profile.interests || []).join(", ");

publicProfile.checked = privacy.publicProfile ?? true;
showEmail.checked = privacy.showEmail ?? false;
showLocation.checked = privacy.showLocation ?? false;
showInterests.checked = privacy.showInterests ?? false;

/* ======================
   SAVE PROFILE
====================== */

document.querySelector("#saveProfileBtn").addEventListener("click", async () => {
    const success = document.querySelector("#profileSuccess");
    success.textContent = "";

    const payload = {
        profile: {
            displayName: displayName.value.trim(),
            bio: bio.value.trim(),
            location: locationInput.value.trim(),
            website: website.value.trim(),
            interests: interests.value
                .split(",")
                .map(i => i.trim())
                .filter(Boolean)
        }
    };

    try {
        await updateProfile(payload);
        success.textContent = "Profile updated successfully.";
        success.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
        success.textContent = err.message || "Failed to update profile.";
        success.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

/* ======================
   SAVE PRIVACY
====================== */

document.querySelector("#savePrivacyBtn").addEventListener("click", async () => {
    const success = document.querySelector("#profileSuccess");

    const payload = {
        profile: {
            privacy: {
                publicProfile: publicProfile.checked,
                showEmail: showEmail.checked,
                showLocation: showLocation.checked,
                showInterests: showInterests.checked
            }
        }
    };

    try {
        await updateProfile(payload);
        success.textContent = "Privacy settings updated successfully.";
        success.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
        success.textContent = err.message || "Failed to save privacy settings.";
        success.scrollIntoView({ behavior: "smooth", block: "start" });
    }
});

/* ======================
   LOGOUT
====================== */

document.querySelector("button#logoutBtn").addEventListener("click", async () => {
    await logoutUser();
    location.href = "/views/login.html";
});

/* ======================
   RESET PASSWORD
====================== */

document.querySelector("#resetPasswordBtn").addEventListener("click", async () => {
    const oldPassword = document.querySelector("#oldPassword").value;
    const newPassword = document.querySelector("#newPassword").value;
    const confirm = document.querySelector("#confirmNewPassword").value;
    const error = document.querySelector("#passwordError");

    error.textContent = "";

    if (newPassword !== confirm) {
        error.textContent = "Passwords do not match";
        return;
    }

    try {
        await resetPassword({ oldPassword, newPassword });
    } catch (err) {
        error.textContent = err.message;
    }
});
