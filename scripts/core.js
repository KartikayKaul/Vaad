/*
    CORE MODULE
        core module is supposed to contain all core reusable APIs
        and utilities to be imported. All exports are to be named.
*/

/* ======================================================
    IMPORTS
====================================================== */
import {constants} from "./constants.js";

/* ======================================================
    LOAD ENDPOINT WITH PAGINATION
====================================================== */
async function getEndpointData(endpoint,
                              pagination=true,
                              SERVER_URI="http://localhost:3000",
                              page=1,
                              limit=10,
                            ) 
{
    let req_string = (pagination)?`${SERVER_URI}/${endpoint}?_page=${page}&_limit=${limit}`: `${SERVER_URI}/${endpoint}`;
    console.log(req_string);
    try {
        let aha = await fetch(req_string);
        // console.log(aha);
        let data = await aha.json();
        if(data.length == 0) {
            throw Error("Not enough data");
        }
        return data;
    } catch(err) {
        console.error(err);
        return [];
    }
}

/* ======================================================
    INJECT FORUM LIST WITH ANCHOR TAGS
====================================================== */
function injectAListIntoBody(data, body="body") {
    if(data.length == 0) {
        console.error("Error: data values empty");
        return;
    }
    
    let container = document.querySelector(body);
    let forum_ul = document.createElement("ul");
    
    forum_ul.classList.add("forum_ul");
    
    data.forEach((val) => {
        let li = document.createElement("li");
        li.innerHTML = `<a href="./forum.html?forumId=${val.id}">${val.name}</a>`;
        li.title = `${val.description}`;
        forum_ul.append(li);
    });
    container.innerHTML = "";
    container.append(forum_ul);
}

/* ======================================================
    UTIL: times ago
====================================================== */
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date)/1000; //in seconds

    if (diff < 60) return `${Math.floor(diff)} seconds ago`;
    if (diff == 60) return `${Math.floor(diff)} minute ago`;
    if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`;
    if (diff == 3600) return `${Math.floor(diff)} hour ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`;
    if (diff < 172800) return `yesterday`;
    if (diff < 31536000) return `${Math.floor(diff/86400)} days ago`;
    return `${Math.floor(diff/31536000)} years ago`;
}

/* ======================================================
    FUNCTIONALITY: build navbar
====================================================== */
function buildNavbar() {
    const { username, role, isGuest } = constants.USER_CONFIGS.snapshot;
    const isAdmin = role === "admin";
    const isModerator = role === "moderator";

    // little check to see

    return `
        <div class="nav-left">
            <a class="nav-brand">Vaad</a>

            <a href="../index.html" class="nav-link">Forums</a>
            <a href="./forum.html?forumId=0" class="nav-link">Site News</a>
        </div>

        <div class="nav-right">
            <div class="nav-user">
                <span class="nav-username">${username}</span>
                <span class="nav-caret">▾</span>

                <div class="nav-dropdown">
                    <a href="/views/profile.html">Profile</a>
                    ${!isGuest ? `<a href="/views/myThreads.html">My Activity</a>` : ""}

                    ${(isAdmin)
                        ? `<a href="/assets/siteadmin/putdata.html">Admin Panel</a>`
                        : ""
                    }
                    ${isGuest
                        ? `
                            <a href="/views/login.html">Login </a>
                            <a href="/views/signup.html">Signup</a>
                        `
                        : `<a href="#" id="logoutBtn">Logout</a>`
                    }
                </div>
            </div>
        </div>
    `;
}

export { buildNavbar, injectAListIntoBody, getEndpointData, timeAgo}