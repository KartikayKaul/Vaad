import { constants } from "./constants.js";
import { getEndpointData } from "./core.js";

async function loginUser({username, password, remember}) {
    const passwordHash = await hashPassword(password);

    const users = await getEndpointData(
        `user?username=${username}`,
        false,
        constants.SERVER_URI
    ) || [];

    if(users.length == 0) {
        throw new Error("user not found");
    }

    const user = users[0];
    if(user.passwordHash !== passwordHash) {
        throw new Error("invalid password");
    }

    // generating token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (remember ? 7*24*60*60*1000 : 2*60*60*1000);

    // persisting token in db.json
    await fetch(`${constants.SERVER_URI}/user/${user.id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            authToken: token,
            authTokenExpiresAt: expiresAt
        })
    });

    // persisting token in localStorage
    localStorage.setItem("AUTH_TOKEN", JSON.stringify({
        token,
        expiresAt
    }));

    // update the state of the USER_CONFIGS in runtime
    constants.USER_CONFIGS.setAuthenticateUser({
        user,
        token,
        expiresAt,
        remember
    });
}

async function restoreSessionFromToken() {
    const saved = localStorage.getItem("AUTH_TOKEN");
    if(!saved) return;

    const {token, expiresAt} = JSON.parse(saved);

    if(Date.now() > expiresAt) {
        localStorage.removeItem("AUTH_TOKEN");
        return;
    }

    const users = await getEndpointData(
        `user?authToken=${token}`,
        false,
        constants.SERVER_URI
    ) || [];

    if(users.length == 0) {
        localStorage.removeItem("AUTH_TOKEN");
        return;
    }

    const user = users[0];
    constants.USER_CONFIGS.setAuthenticateUser({
        user,
        token,
        expiresAt,
        remember: true
    });
}

async function logoutUser() {
    const {userId} = constants.USER_CONFIGS.snapshot;

    if(userId !== -1) {
        await fetch(`${constants.SERVER_URI}/user/${userId}`, {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                authToken: null,
                authTokenExpiresAt: null
            })
        });
    }

    // localStorage.removeItem("AUTH_TOKEN");
    constants.USER_CONFIGS.logout();
    constants.USER_CONFIGS.setGuest();
    // location.reload();
}

async function hashPassword(password) {
    const encoder = new TextEncoder().encode(password);
    const buffer = await crypto.subtle.digest("SHA-256", encoder);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function signupUser({username, email, password, remember}) {
    if(!username || !email || !password) {
        throw new Error("All fields are required.");
    }

    // check username uniqueness
    const existing = await getEndpointData(
        `user?username=${username}`,
        false,
        constants.SERVER_URI
    );

    if(existing.length > 0) {
        throw new Error("Username already exists");
    }

    // check if email exists
    const emailExists = await getEndpointData(
        `user?email=${email}`,
        false,
        constants.SERVER_URI
    );

    if(emailExists.length > 0) {
        throw new Error("Email already registered.");
    }

    const passwordHash = await hashPassword(password);

    const newUser = {
        username,
        email,
        passwordHash,
        role: "user",
        createdAt: new Date().toISOString(),
        lastActiveAt: Date.now(),
        authToken: null,
        authTokenExpiresAt: null,
        profile: {
            displayName: "",
            bio: "",
            location: "",
            website: "",
            interests: [],
            privacy: {
                publicProfile: true,
                showEmail: false,
                showLocation: true,
                showInterests: true
            }
        }
    };

    // create user
    const res = await fetch(`${constants.SERVER_URI}/user`,
        {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(newUser)
        }
    );

    const savedUser = await res.json();

    // login automatically after signup
    await loginUser({
        username,
        password,
        remember
    });
    return savedUser;
}


async function resetPassword({ oldPassword, newPassword }) {
    const { userId } = constants.USER_CONFIGS.snapshot;

    if( userId === -1) {
        throw new Error("Not Authenticated.");
    }

    const users = await getEndpointData(
        `user?id=${userId}`,
        false,
        constants.SERVER_URI
    );

    const user = users[0];

    const oldHash = await hashPassword(oldPassword);
    if (user.passwordHash !== oldHash) {
        throw new Error("Old password is incorrect.");
    }

    const newHash = await hashPassword(newPassword);

    await fetch(`${constants.SERVER_URI}/user/${userId}`,
        {
            method: "PATCH",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                passwordHash: newHash,
                authToken: null,
                authTokenExpiresAt: null
            })
        }
    );

    // full resetting localStorage
    localStorage.removeItem("AUTH_TOKEN");
    constants.USER_CONFIGS.logout();
    constants.USER_CONFIGS.setGuest();

    location.href = "/views/login.html";
}

async function updateProfile(payload) {
    const { snapshot } = constants.USER_CONFIGS;

    if (snapshot.isGuest || snapshot.userId === -1) {
        throw new Error("Not authenticated.");
    }

    const userId = snapshot.userId;
    const incomingProfile = payload.profile || {};

    const existingProfile = snapshot.profile || {};

    const mergedProfile = {
        ...existingProfile,
        ...incomingProfile,
        privacy: {
            ...(existingProfile.privacy || {}),
            ...(incomingProfile.privacy || {})
        }
    };

    const res = await fetch(`${constants.SERVER_URI}/user/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: mergedProfile })
    });

    if (!res.ok) {
        throw new Error("Failed to update profile.");
    }

    constants.USER_CONFIGS.updateProfile(mergedProfile);
}

// async function updateProfile(profileUpdates) {
//     const {snapshot } = constants.USER_CONFIGS;

//     if(snapshot.isGuest || snapshot.userId === -1) {
//         throw new Error("Not authenticated.");
//     }

//     const userId = snapshot.userId;

//     // // ensure profile object exists 
//     // const safePayload = {
//     //     profile: {
//     //         ...(snapshot.profile || {}),
//     //         ...(payload.profile || {})
//     //     }
//     // };


//     // merging existing profile safely
//     const existingProfile = snapshot.profile || {};
//     const mergedProfile = {
//         ...existingProfile,
//         ...profileUpdates,
//         privacy: {
//             ...(existingProfile.privacy || {}),
//             ...(profileUpdates.privacy || {})
//         }
//     };

//     // persisting to database
//     const res = await fetch(`${constants.SERVER_URI}/user/${userId}`, {
//         method: "PATCH",
//         headers: {"Content-Type": "application/json" },
//         boddy: JSON.stringify({
//             profile: mergedProfile
//         })
//     });

//     if(!res.ok) {
//         throw new Error("Failed to update profile.");
//     }

//     const updatedUser = await res.json();

//     //update runtime state of configs
//     constants.USER_CONFIGS.updateProfile(mergedProfile);

//     return updatedUser;
// }

export {
    loginUser, 
    signupUser,
    logoutUser, 
    hashPassword, 
    restoreSessionFromToken,
    resetPassword,
    updateProfile
};