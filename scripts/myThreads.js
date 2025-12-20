/* ======================================================
    IMPORTS
===================================================== */
import { initApp } from "./appInit.js";
import {constants} from "./constants.js";
import {getEndpointData, buildNavbar, timeAgo} from "./core.js";
import { logoutUser } from "./authentication.js";

/* ======================================================
    GLOBAL CONSTANTS
===================================================== */
const MyuserId = constants.USER_CONFIGS.snapshot.userId;
const THREADS_PAGE_SIZE = 5;
const POSTS_PAGE_SIZE = 5;

/* ======================================================
    INIT
===================================================== */
await initApp();
document.querySelector(".navbar").innerHTML = buildNavbar();
const logoutBtn = document.querySelector("#logoutBtn");
if(logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await logoutUser();
    });
}

// guest check
if(MyuserId === -1) {
    document.body.innerHTML = `
        <nav class="navbar"></nav>
        <div class="auth-callout">
            <h3 class="auth-callout-title">
                You must be logged in to view your threads
            </h3>

            <p class="auth-callout-text">
                Create an account or log in to manage your discussions and posts.
            </p>

            <div class="auth-callout-actions">
                <a href="/views/login.html" class="btn btn-primary">Login</a>
                <a href="/views/signup.html" class="btn btn-secondary">Sign up</a>
            </div>
        </div>
    `;
    document.querySelector(".navbar").innerHTML = buildNavbar();
    throw Error("Guest access to myThreads is invalid.");
}

/* ======================================================
    FETCH DATA
===================================================== */
let myThreads = await getEndpointData(`thread?authorId=${MyuserId}`, false, constants.SERVER_URI);
myThreads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

let myPosts = await getEndpointData(`posts?authorId=${MyuserId}`, false, constants.SERVER_URI);
myPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const threadIds = [...new Set(myPosts.map(p => p.threadId))];
const threadsForPosts = threadIds.length ? await getEndpointData(
    `thread?${threadIds.map(id => `id=${id}`).join("&")}`,
    false,
    constants.SERVER_URI
) : [];

const threadMap = {};
threadsForPosts.forEach(t => threadMap[t.id] = t);

/* ======================================================
    PAGINATION STATE
===================================================== */
let threadsShown = 0;
let postsShown = 0;

/* ======================================================
    CONTAINERS & BUTTONS
===================================================== */
const threadContainer = document.querySelector(".my-threads-list");
const threadUl = document.createElement("ul");
threadContainer.append(threadUl);

const threadsBtn = document.createElement("button");
threadsBtn.className = "load-more-threads nav-btn";
threadsBtn.textContent = "Load More Threads";
threadsBtn.addEventListener("click", renderThreads);
threadContainer.append(threadsBtn);

const postContainer = document.querySelector(".my-posts-list");
const postUl = document.createElement("ul");
postContainer.append(postUl);

const postsBtn = document.createElement("button");
postsBtn.className = "load-more-posts nav-btn";
postsBtn.textContent = "Load More Posts";
postsBtn.addEventListener("click", renderPosts);
postContainer.append(postsBtn);

/* ======================================================
    RENDER FUNCTIONS
===================================================== */
function renderThreads() {
    const slice = myThreads.slice(threadsShown, threadsShown + THREADS_PAGE_SIZE);
    slice.forEach(thread => {
        const li = document.createElement("li");
        li.className = "thread-item";
        li.innerHTML = `
            <span class="thread-title">${thread.title}</span>
            <p class="meta">Created ${timeAgo(thread.createdAt)}</p>
        `;
        li.addEventListener("click", () => {
            window.location.href = `./forum.html?forumId=${thread.forumId}&threadId=${thread.id}`;
        });
        threadUl.append(li);
    });

    threadsShown += slice.length;
    threadsBtn.style.display = threadsShown < myThreads.length ? "block" : "none";

    if(myThreads.length === 0) {
        threadContainer.innerHTML = `<p>You haven't created any threads yet.</p>`;
        threadsBtn.style.display = "none";
    }
}

function renderPosts() {
    const slice = myPosts.slice(postsShown, postsShown + POSTS_PAGE_SIZE);
    slice.forEach(post => {
        const thread = threadMap[post.threadId];
        if(!thread) return;

        const li = document.createElement("li");
        li.className = "post-item";
        li.innerHTML = `
            <span class="post-content">${post.content.slice(0, 80)}...</span>
            <p class="meta">Posted ${timeAgo(post.createdAt)} in "${thread.title}"</p>
        `;
        li.addEventListener("click", () => {
            window.location.href = `./forum.html?forumId=${thread.forumId}&threadId=${thread.id}&postId=${post.id}`;
        });
        postUl.append(li);
    });

    postsShown += slice.length;
    postsBtn.style.display = postsShown < myPosts.length ? "block" : "none";

    if(myPosts.length === 0) {
        postContainer.innerHTML = `<p>You haven't posted anything yet.</p>`;
        postsBtn.style.display = "none";
    }
}

/* ======================================================
    INITIAL RENDER
===================================================== */
renderThreads();
renderPosts();
