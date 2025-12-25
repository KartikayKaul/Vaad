/* ======================================================
    IMPORTS
====================================================== */
import { initApp } from './appInit.js';
import { constants } from './constants.js';
import { getEndpointData, buildNavbar } from './core.js';
import { logoutUser } from "./authentication.js";

/* ======================================================
    GLOBAL CONSTANTS
====================================================== */
const SERVER_URI = constants['SERVER_URI'];
const TOTAL_FORUM = await constants.TOTAL_FORUM();
const LIST_ENTRY_LIMIT = constants.LIST_ENTRY_LIMIT;
const HOME_FORUMLIST_PAGE_LIMIT = Math.ceil(TOTAL_FORUM / LIST_ENTRY_LIMIT);

/* ======================================================
    GLOBAL VARIABLES
====================================================== */
let home_forumList_page = 1; // starting page

// ADDING NAVBAR
document.querySelector(".navbar").innerHTML = buildNavbar();
// adding logout listener
const logoutBtn = document.querySelector("#logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}

// UTIL: inject forum cards into container
function renderForumCards(data) {
    const container = document.querySelector("#forum-container");
    container.innerHTML = ""; // clear previous items

    data.forEach(forum => {
        const card = document.createElement('div');
        card.className = 'forum-card';
        card.setAttribute("data-aos", "fade-up");
        card.innerHTML = `
            <h3>${forum.name}</h3>
            <p>${forum.description || ''}</p>
        `;
        card.addEventListener('click', () => {
            window.location.href = `forum.html?forumId=${forum.id}`;
        });
        container.appendChild(card);
    });
}

// UTIL: load current page of forums
async function loadForumPage(page) {
    const data = await getEndpointData("forum", true, SERVER_URI, page, LIST_ENTRY_LIMIT);
    renderForumCards(data);
}

// HOME PAGE INIT
if (window.location.href.split('/').at(-1) === "home.html") {
    await initApp();

    // initial load
    await loadForumPage(home_forumList_page);

    // LEFT NAV BUTTON
    document.getElementById("left-nav-button").addEventListener("click", async () => {
        if (home_forumList_page > 1) {
            home_forumList_page--;
            await loadForumPage(home_forumList_page);
        }
    });

    // RIGHT NAV BUTTON
    document.getElementById("right-nav-button").addEventListener("click", async () => {
        if (home_forumList_page < HOME_FORUMLIST_PAGE_LIMIT) {
            home_forumList_page++;
            await loadForumPage(home_forumList_page);
        }
    });
}
