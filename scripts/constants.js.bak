/*
    DOCUMENTATION
        this script is dedicated to the setting of constants object
        it can be changed or set automatically based on the contents of db.json
        this will run when we push into the homepage.

*/

import {USER_CONFIG} from "./userConfig.js";
import { restoreSessionFromToken } from "./authentication.js";

// function initializeUserConfigs() {
//     let saved = sessionStorage.getItem("USER_CONFIGS");

//     if(saved) {
//         return JSON.parse(saved);     // <-- return saved session version
//     }

//     // first-time session creating new config
//     const fresh = {
//         username: generateGuestName(),
//         userId: -1,
//         isGuest: true,
//         auth: {
//             token: null,
//             expiresAt: null
//         },
//         role: "guest",
//         createdAt: Date.now(),
//         lastActiveAt: Date.now()
//     };

//     sessionStorage.setItem("USER_CONFIGS", JSON.stringify(fresh));
//     return fresh;
// }

async function bootStrapApp() {
    await restoreSessionFromToken();
}

const constants = {
    SERVER_URI: "http://localhost:3000",
    _total_forum_cache: null,
    TOTAL_FORUM: async function() {
        if(this._total_forum_cache !== null) {
            return this._total_forum_cache;
        }

        const res = await fetch(`${this.SERVER_URI}/forum/`);
        const data = await res.json();
        this.__totalForumCache = data.length;
        return this.__totalForumCache;
    },

    LIST_ENTRY_LIMIT: 10,

    USER_CONFIGS: USER_CONFIG,
    bootStrapApp
};

export {constants};


// {
//         "uname": `guest` + alphabets[Math.ceil(Math.random()*alphabets.length)] + new Date().getTime(),
//         userId: null,
//         isGuest: true,

//         auth: {
//             token: null,
//             expiresAt: null
//         },

//         createdAt: Date.now(),
//         lastActiveAt: Date.now()
// }