/* ======================================================
    IMPORTS
====================================================== */
import { initApp } from './appInit.js';
import { constants } from './constants.js'
import { getEndpointData, injectAListIntoBody, buildNavbar} from './core.js'
import {logoutUser} from "./authentication.js";

/* ======================================================
    GLOBAL CONSTANTS
====================================================== */
const SERVER_URI = constants['SERVER_URI'];
const TOTAL_FORUM = await constants.TOTAL_FORUM();
const LIST_ENTRY_LIMIT = constants.LIST_ENTRY_LIMIT;
const HOME_FORUMLIST_PAGE_LIMIT = Math.ceil(TOTAL_FORUM/LIST_ENTRY_LIMIT); // set based on no of forums present in forum endpoint 

/* ======================================================
    GLOBAL VARIABLES (no redeclares)
====================================================== */
let home_forumList_page = 1; //starting page


// ADDING NAVBAR
document.querySelector(".navbar").innerHTML = buildNavbar();
// adding logout listener
const logoutBtn = document.querySelector("#logoutBtn");
if(logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}

// If we are present in Homepage 'home.html'
if(window.location.href.split('/').at(-1) == "home.html") {
    // bootstrap authentication from token
    await initApp();
    
    let data = await getEndpointData("forum", true, SERVER_URI, home_forumList_page, LIST_ENTRY_LIMIT);
    injectAListIntoBody(data, "section#forum-container");

    document.getElementById("left-nav-button").addEventListener("click", async () => {
        if(home_forumList_page > 1) {
            home_forumList_page--;
            data = await getEndpointData("forum", true, SERVER_URI, home_forumList_page, LIST_ENTRY_LIMIT);
            injectAListIntoBody(data, "section#forum-container");
        }
        data.forEach(forum => {
            const card = document.createElement('div');
            card.className = 'forum-card';
            card.innerHTML = `
                <h3>${forum.name}</h3>
                <p>${forum.description || ''}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `forum.html?forumId=${forum.id}`;
            });
            document.querySelector('#forum-container').append(card);
        });

    });

    document.getElementById("right-nav-button").addEventListener("click", async () => {
        if(home_forumList_page < HOME_FORUMLIST_PAGE_LIMIT) {
            home_forumList_page++;
            data = await getEndpointData("forum", true, SERVER_URI, home_forumList_page, LIST_ENTRY_LIMIT);
            injectAListIntoBody(data, "section#forum-container");
        }
        data.forEach(forum => {
            const card = document.createElement('div');
            card.className = 'forum-card';
            card.innerHTML = `
                <h3>${forum.name}</h3>
                <p>${forum.description || ''}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `forum.html?forumId=${forum.id}`;
            });
            document.querySelector('#forum-container').append(card);
        });

    });

    data.forEach(forum => {
        const card = document.createElement('div');
        card.className = 'forum-card';
        card.innerHTML = `
            <h3>${forum.name}</h3>
            <p>${forum.description || ''}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `forum.html?forumId=${forum.id}`;
        });
        document.querySelector('#forum-container').append(card);
    });

}
