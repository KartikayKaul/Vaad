// IMPORTS
console.log()
import {constants} from './constants.js';
import { getEndpointData, timeAgo } from './core.js';

/* ---- STATE OF EXECUTION ----- */

let currentView = "forum";
let currentThreadId = null;

/* ----------- DOM ------------- */
const layout = document.querySelector(".forum2-layout");
const threadListContainer = document.querySelector(".thread-list-container");
const threadContainer = document.querySelector(".thread-container");
const createPostBox = document.querySelector(".createPostBox");

// UTIL FUNCITONS
/* ------------------ VIEW CONTROL ------------------ */
function showForumView() {
    currentView = "forum";
    currentThreadId = null;
    layout.classList.remove("thread-view");
    layout.classList.add("forum-view");

    threadContainer.classList.add("hidden");
    threadContainer.innerHTML = "";

    const backLink = document.querySelector(".back-to-forum");
    if(backLink) backLink.remove();
}

function showThreadView(threadId) {
    currentView = "thread";
    currentThreadId = threadId;
    
    layout.classList.remove("forum-view");
    layout.classList.add("thread-view");

    threadContainer.classList.remove("hidden");

    injectBackLink();
}

function injectBackLink() {
    let back = document.querySelector(".back-to-forum");

    if(!back) {
        back = document.createElement("a");
        back.textContent = "← Back to forum";
        back.className = "back-to-forum";
        back.style.cursor = "pointer";

        back.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            showForumView();
        });
    }
}

// UTIL FUNCTIONS END HERE


/* ------------------ THREAD LOADING ------------------ */
async function loadThread(threadId) {
  const [thread] = await getEndpointData(
    `thread?id=${threadId}`,
    false,
    constants.SERVER_URI
  );

  const [author] = await getEndpointData(
    `user?id=${thread.authorId}`,
    false,
    constants.SERVER_URI
  );

  threadContainer.innerHTML = `
    <div class="thread-header">
      <h2>${thread.title}</h2>
      <p class="thread-meta">
        Posted ${timeAgo(thread.createdAt)} by ${author?.username ?? "Guest"}
      </p>
      <hr/>
    </div>
    <div class="thread-posts"></div>
  `;

  await reloadPosts(threadId);
}

async function reloadPosts(threadId) {
  const posts = await getEndpointData(
    `posts?threadId=${threadId}`,
    false,
    constants.SERVER_URI
  );

  const postsHTML = posts
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(
      p => `
      <div class="post">
        <p>${p.content}</p>
        <p class="post-meta">${timeAgo(p.createdAt)}</p>
        <hr/>
      </div>
    `
    )
    .join("");

  threadContainer.querySelector(".thread-posts").innerHTML = postsHTML;
}

/* ------------------ POST CREATION (SAFE) ------------------ */
function initCreatePostForm() {
  createPostBox.innerHTML = `
    <form id="createPostForm">
      <h3>Add a Post</h3>
      <textarea name="content" required></textarea>
      <br/>
      <button type="submit">Submit</button>
      <p class="error"></p>
    </form>
  `;

  const form = createPostBox.querySelector("#createPostForm");
  const errorBox = form.querySelector(".error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentThreadId) return;

    const content = form.content.value.trim();
    if (!content) return;

    try {
      await fetch(`${constants.SERVER_URI}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: Number(currentThreadId),
          authorId: constants.USER_CONFIGS.userId || -1,
          createdAt: new Date().toISOString(),
          content
        })
      });

      form.reset();
      await reloadPosts(currentThreadId);
    } catch (err) {
      errorBox.textContent = err.message;
    }
  });
}

/* ------------------ INIT ------------------ */
initCreatePostForm();
showForumView();