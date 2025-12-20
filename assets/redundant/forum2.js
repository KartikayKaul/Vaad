console.log("SCRIPT LOADED", performance.now());

window.addEventListener("beforeunload", (e) => {
  console.error("🔥 BEFOREUNLOAD FIRED 🔥");
  console.trace();
});
import { constants } from "./constants.js";
import { getEndpointData, timeAgo } from "./core.js";

/* ---------------- STATE ---------------- */
const state = {
  forumId: new URLSearchParams(location.search).get("forumId"),
  threadId: null
};

/* ---------------- DOM ---------------- */
const app = document.getElementById("app");

/* ---------------- CONTROLLER ---------------- */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  e.preventDefault();

  const action = btn.dataset.action;

  switch (action) {
    case "open-thread":
      await openThread(btn.dataset.id);
      break;

    case "create-post":
      await createPost();
      break;

    case "back":
      renderThreadList();
      break;
  }
});

/* ---------------- RENDER ---------------- */
async function renderThreadList() {
  state.threadId = null;

  const threads = await getEndpointData(
    `thread?forumId=${state.forumId}`,
    false,
    constants.SERVER_URI
  );

  app.innerHTML = `
    <div class="thread-list">
      <h2>Threads</h2>
      ${threads.map(t => `
        <button data-action="open-thread" data-id="${t.id}">
          ${t.title}
        </button>
      `).join("")}
    </div>
    <div class="thread-view hidden"></div>
  `;
}

async function openThread(threadId) {
  state.threadId = threadId;

  const [thread] = await getEndpointData(
    `thread?id=${threadId}`,
    false,
    constants.SERVER_URI
  );

  const posts = await getEndpointData(
    `posts?threadId=${threadId}`,
    false,
    constants.SERVER_URI
  );

  app.innerHTML = `
    <button data-action="back">← Back</button>

    <h2>${thread.title}</h2>

    <div class="posts">
      ${posts.map(p => `
        <p>${p.content}</p>
        <small>${timeAgo(p.createdAt)}</small>
        <hr/>
      `).join("")}
    </div>

    <textarea id="postContent"></textarea>
    <br/>
    <button data-action="create-post">Submit</button>
  `;
}

/* ---------------- COMMANDS ---------------- */
async function createPost() {
  const textarea = document.getElementById("postContent");
  const content = textarea.value.trim();
  if (!content) return;

  await fetch(`${constants.SERVER_URI}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: Number(state.threadId),
      authorId: constants.USER_CONFIGS.userId || -1,
      createdAt: new Date().toISOString(),
      content
    })
  });

  await openThread(state.threadId);
}

/* ---------------- INIT ---------------- */
renderThreadList();
