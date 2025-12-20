/* ======================================================
    IMPORTS
====================================================== */
import { initApp } from "./appInit.js";
import {constants} from "./constants.js";
import {getEndpointData, buildNavbar, timeAgo} from "./core.js";
import { logoutUser } from "./authentication.js";

/* ======================================================
    GLOBAL CONSTANTS
====================================================== */
const MyuserId = constants.USER_CONFIGS.snapshot.userId;


/* ======================================================
    INIT
====================================================== */
// bootstrap authentication from token
    await initApp();

document.querySelector(".navbar").innerHTML = buildNavbar();
// adding logout listener
const logoutBtn = document.querySelector("#logoutBtn");
if(logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}

// blocking guest users
if(constants.USER_CONFIGS.snapshot.userId == -1) {
    document.body.innerHTML = `
        <nav class="navbar"></nav>
        <h3> You must be <a href="./login.html">logged in</a> to view your threads. </h3>
    `;

    document.querySelector(".navbar").innerHTML = buildNavbar();
    throw Error("Guest access to myThreads is invalid.");
}


/* ======================================================
    FETCH DATA
====================================================== */
let myThreads = await getEndpointData(
    `thread?authorId=${MyuserId}`,
    false,
    constants.SERVER_URI
);
myThreads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

let myPosts = await getEndpointData(
    `posts?authorId=${MyuserId}`,
    false,
    constants.SERVER_URI
);
myPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

/* ======================================================
    RENDERING THE THREADS LIST
====================================================== */
const threadContainer = document.querySelector(".my-threads-list");

if(!myThreads.length) {
    threadContainer.innerHTML = `<p>You haven't created any threads yet.</p>`;
} else {
    const ul = document.createElement("ul");

    myThreads.forEach(thread => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = thread.title;
        a.href= `./forum.html?forumId=${thread.forumId}&threadId=${thread.id}`;

        const meta = document.createElement("p");
        meta.style.fontSize = "0.8rem";
        meta.textContent = `Created ${timeAgo(thread.createdAt)}`;

        li.append(a, meta);
        ul.append(li);
    });

    threadContainer.append(ul);
}

/* ======================================================
    THREAD LOOKUP FROM POSTS
====================================================== */
const threadIds = [...new Set(myPosts.map(p => p.threadId))];

const threadsForPosts = threadIds.length ? await getEndpointData(
    `thread?${threadIds.map(id => `id=${id}`).join("&")}`,
    false,
    constants.SERVER_URI
) : [];

const threadMap = {};
threadsForPosts.forEach(t => threadMap[t.id] = t);

/* ======================================================
    RENDERING THE POSTS LIST
====================================================== */
const postContainer = document.querySelector(".my-posts-list");

if(!myPosts.length) {
    postContainer.innerHTML = `<p>You haven't posted anything yet.</p>`;
} else {
    const ul = document.createElement("ul");

    myPosts.forEach(post => {
        const thread = threadMap[post.threadId];
        if(!thread) return; //added for saftey

        const li = document.createElement("li");

        const a = document.createElement("a");
        a.textContent = post.content.slice(0, 80) + "...";
        a.href = `./forum.html?forumId=${thread.forumId}&threadId=${thread.id}&postId=${post.id}`;

        const meta = document.createElement("p");
        meta.style.fontSize = "0.8rem";
        meta.textContent = `Posted ${timeAgo(post.createdAt)} in "${thread.title}"`;
        
        li.append(a, meta);
        ul.append(li);
    });

    postContainer.append(ul);
}