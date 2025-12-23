/*
    DOCUMENTATION
        this script is dedicated to the setting of constants object
        it can be changed or set automatically based on the contents of db.json
        this will run when we push into the homepage.

*/

import {USER_CONFIG} from "./userConfig.js";
import {getEndpointData} from "./core.js";
import { restoreSessionFromToken } from "./authentication.js";

const constants = {
    SERVER_URI: "https://vaad-backend.onrender.com",
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

async function bootStrapApp() {
    const USERS = await getEndpointData(
        `user?role=admin&role=moderator`,
        false,
        constants.SERVER_URI
    );
    constants.__MODS__ = USERS.map(x => ({id: x.id, username: x.username, role: x.role}));
    await restoreSessionFromToken();
}


export {constants};