/* ======================================================
    IMPORTS
====================================================== */
import { constants } from './constants.js'
import { getEndpointData, timeAgo, buildNavbar } from './core.js'
import {logoutUser} from "./authentication.js";
import { initApp } from "./appInit.js";

/* ======================================================
    CONSTS AND DECLARATIONS
====================================================== */

const layout = document.querySelector(".forum-layout");
const threadContainer = document.querySelector(".thread-container");
const threadListContainer = document.querySelector(".thread-list-container");

let currentView = "forum";
let currentThreadId = null;

// getting forumId ONCE
const forumId = new URLSearchParams(window.location.search).get("forumId");

const autoThreadId = new URLSearchParams(window.location.search).get("threadId");
const autoPostId = new URLSearchParams(window.location.search).get("postId");

console.log(autoThreadId, autoPostId);

/* ======================================================
   UTIL FUNCTIONS
====================================================== */

function parsePostContent(raw) {
    if (!raw) return "";

    /* ===============================
        1. ESCAPE PROTECTED TOKENS
    =============================== */
    const ESC = {
        "\\*": "__ESC_STAR__",
        "\\_": "__ESC_UNDERSCORE__",
        "\\~": "__ESC_TILDE__",
        "\\{": "__ESC_LBRACE__",
        "\\}": "__ESC_RBRACE__",
        "\\[": "__ESC_LBRACKET__",
        "\\]": "__ESC_RBRACKET__",
        "\\`": "__ESC_BACKTICK__",
        "\\|": "__ESC_PIPE__",
        "\\=": "__ESC_EQUAL__",
        "\\>": "__ESC_GT__",
        "\\@": "__ESC_AT__"
    };

    let content = raw;
    for (const k in ESC) {
        content = content.replaceAll(k, ESC[k]);
    }

    /* ===============================
        2. CODE BLOCKS ```code```
        (must be first)
    =============================== */
    content = content.replace(
        /```([\s\S]*?)```/g,
        (_, code) => `<pre><code>${code}</code></pre>`
    );

    /* ===============================
        3. INLINE CODE `code`
    =============================== */
    content = content.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );

    /* ===============================
        4. REPLY LINKS >>>user[post:123]
    =============================== */
    content = content.replace(
        />>>[\w-]+\[post:(\d+)\]/g,
        (m, id) =>
            `<a href="#post-${id}" class="reply-link" data-reply-post="${id}">${m}</a>`
    );

    /* ===============================
        5. BLOCKQUOTES
        > quoted text
    =============================== */
    content = content.replace(
        /(^|\n)>(?!>|\s*>)(.*)/g,
        `$1<blockquote>$2</blockquote>`
    );

    /* ===============================
        6. TEXT FORMATTING
    =============================== */
    content = content
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<b>$1</b>")
        .replace(/__(.*?)__/g, "<i>$1</i>")
        .replace(/_(.*?)_/g, "<i>$1</i>")
        .replace(/~(.*?)~/g, "<s>$1</s>")
        .replace(/==(.*?)==/g, "<mark>$1</mark>");

    /* ===============================
        7. COLOR HIGHLIGHT
        @@color:text@@
        @@#ff0:text@@
        @@rgb(255,0,0):text@@
    =============================== */
    content = content.replace(
        /@@([^:]+):([\s\S]+?)@@/g,
        (_, color, text) =>
            `<span style="background:${color}; padding:2px 4px; border-radius:3px;">${text}</span>`
    );

    /* ===============================
        8. LINKS
    =============================== */
    content = content.replace(
        /\[\[(https?:\/\/[^\|\]]+)\s*\|\s*(.*?)\]\]/g,
        `<a href="$1" target="_blank" rel="noopener">$2</a>`
    );

    content = content.replace(
        /\[\[(https?:\/\/[^\]]+)\]\]/g,
        `<a href="$1" target="_blank" rel="noopener">$1</a>`
    );

    /* ===============================
        9. USER MENTIONS {{username}}
    =============================== */
    content = content.replace(
        /\{\{([a-zA-Z0-9_-]+)\}\}/g,
        (_, u) => `<a href="profile.html?username=${u}">@${u}</a>`
    );

    /* ===============================
        10. SPOILERS ||text||
    =============================== */
    content = content.replace(
        /\|\|(.*?)\|\|/g,
        `<span class="spoiler">$1</span>`
    );

    /* ===============================
        11. EMOJIS { :) }
    =============================== */
    const emojis = {
        ":)": "🙂",
        ":(": "🙁",
        ":D": "😄",
        ";)": "😉",
        ":P": "😛",
        "<3": "❤️"
    };

    const emojiKeys = Object.keys(emojis)
        .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");

    content = content.replace(
        new RegExp(`\\{\\s*(${emojiKeys})\\s*\\}`, "g"),
        (_, k) => emojis[k]
    );


    /* ===============================
        12. LINE BREAKS
    =============================== */
    content = content.replace(/\n/g, "<br/>");

    /* ===============================
        13. RESTORE ESCAPED TOKENS
    =============================== */
    for (const k in ESC) {
        content = content.replaceAll(ESC[k], k.slice(1));
    }

    return content;
}



function clearAutoNavParams() {
    // can modify the function later to add options for adding params
    const url  = new URL(window.location.href);

    //removing the threadId and postId params
    url.searchParams.delete("threadId");
    url.searchParams.delete("postId");

    history.replaceState({}, "", url.toString());
}

function inFocusStyle(node, stylesObj=null) {
    if(stylesObj == null) {
        return;
    }

    for(let ppty in stylesObj) {
        node.style[ppty] = stylesObj[ppty];
    }
}

function focusPost(postId) {
    const posts = Array.from(document.querySelectorAll(`.post`));
    const post = posts.find(val => Number(val.getAttribute("data-post-id")) == Number(postId));
    if(!post) return;

    post.scrollIntoView({ behavior: "smooth", block: "center" });

    // inFocusStyle(post, {backgroundColor: "#848181ff", border: "1px solid #888"});
    // setTimeout(() =>{
    //     inFocusStyle(post, {backgroundColor: "", border: ""});
    // }, 1500);

    post.classList.add("post-highlight");
    setTimeout(() => post.classList.remove("post-highlight"), 1500);
}

function handleCreateThreadVisibility() {
    const box = document.querySelector(".create-thread-box");
    if (!box) return;

    // forumId comes from URL and is a string
    if (!canCreateThreadInForum(forumId)) {
        box.classList.add("hidden");   // announcements forum
    } else {
        box.classList.remove("hidden");
    }
}

function canCreateThreadInForum(forumId) {
    if(Number(forumId) !== 0) {
        
        return true;
    }
    const role = constants.USER_CONFIGS.snapshot.role;
    console.log("user role:", role);
    return role === "admin" || role === "moderator";
}

function buildQueryForUsers(authorIds) {
    if (!authorIds.length) return "user";
    return "user?" + authorIds.map(id => `id_like=${id}`).join("&");
}

function showForumView() {
    currentView = "forum";
    currentThreadId = null;

    layout.classList.remove("thread-view");
    layout.classList.add("forum-view");

    threadContainer.classList.add("hidden");
    threadContainer.innerHTML = "";

    const backLink = document.querySelector(".back-to-forum");
    if (backLink) backLink.remove();
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

    if (!back) {
        back = document.createElement("a");
        back.textContent = "← Back to forum";
        back.className = "back-to-forum";
        back.style.cursor = "pointer";

        back.addEventListener("click", (e) => {
            e.preventDefault();
            showForumView();
        });

        threadListContainer.prepend(back);
    }
}

/* ======================================================
   THREAD LIST
====================================================== */

async function reloadThreadList() {
    threadListContainer.innerHTML = "";

    const threadsList = await getEndpointData(
        `thread?forumId=${forumId}`,
        false,
        constants.SERVER_URI
    );

    if (!threadsList.length) {
        threadListContainer.innerHTML =
            `<h3>Sorry, currently no threads posted in this forum.</h3>`;
        return;
    }

    const authIds = threadsList.map(x => x.authorId);
    const authorsList = authIds.length
        ? await getEndpointData(buildQueryForUsers(authIds), false, constants.SERVER_URI)
        : [];

    const ul = document.createElement("ul");
    ul.classList.add("ulTLC");

    threadsList.forEach(val => {
        const li = document.createElement("li");

        const authorObj =
            authorsList.find(x => x.id === val.authorId) ||
            { username: constants.USER_CONFIGS.snapshot.username, role: "guest" };

        const threadTitle = document.createElement("h4");
        const threadMeta = document.createElement("p");
        const aLink = document.createElement("a");

        aLink.textContent = val.title;
        aLink.style.cursor = "pointer";
        aLink.dataset.threadId = val.id;

        aLink.addEventListener("click", async () => {
            await loadThread(val.id);
            showThreadView(val.id);
        });

        threadTitle.append(aLink);
        threadMeta.textContent = `${authorObj.username} [${authorObj.role}]`;

        threadTitle.classList.add("threadTitle");
        threadMeta.classList.add("authroname");

        li.append(threadTitle, threadMeta);
        ul.append(li);
    });

    threadListContainer.append(ul);
}

/* ======================================================
   THREAD + POSTS
====================================================== */

async function reloadPosts(threadId) {
    let posts = await getEndpointData(
        `posts?threadId=${threadId}`,
        false,
        constants.SERVER_URI
    );

    posts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let authorsInPostsArr = [...new Set(posts.map(x => x.authorId))];
    const authorsList = await getEndpointData(
        buildQueryForUsers(authorsInPostsArr),
        false,
        constants.SERVER_URI
    );

    const userMap = {};
    authorsList.forEach(u => userMap[u.id] = u);

    const postsHTML = posts.map(p => {
        const author = userMap[p.authorId] || {
            username: p.authorUsername || "Guest",
            role: "guest"
        };

        return `
          <div class="post" data-post-id="${p.id}" id="post-${p.id}">
            <div class="post-content">${parsePostContent(p.content)}</div>
            <p class="post-meta">
                Posted ${timeAgo(p.createdAt)} by ${author.username}
                <span class="${author.role}-role">[${author.role}]</span>
                 <button title="reply to ${author.username}" class="reply-btn" data-post-id="${p.id}" data-username="${author.username}">Reply</button>
            </p>
            <hr/>
          </div>
        `;
    }).join("");

    document.querySelector(".thread-posts").innerHTML = postsHTML;
    
    // event delegated to
    const postsContainer = document.querySelector(".thread-posts");
    if (!postsContainer.dataset.listenerAdded) {
        postsContainer.addEventListener("click", (e) => {
            if (e.target.classList.contains("reply-btn")) {
                const postId = e.target.dataset.postId;
                const username = e.target.dataset.username;
                const textarea = document.querySelector(".create-post-box textarea");
                textarea.focus();
                textarea.scrollIntoView({ behavior: "smooth", block: "center" });
                textarea.value = `>>>${username}[post:${postId}]\n` + textarea.value;
            }
        });
        postsContainer.dataset.listenerAdded = "true";
    }
}

async function loadThread(threadId) {
    threadContainer.innerHTML = "<p>Loading thread ...</p>";

    const thread = (await getEndpointData(
        `thread?id=${threadId}`,
        false,
        constants.SERVER_URI
    ))[0];

    const author = (await getEndpointData(
        `user?id=${thread.authorId}`,
        false,
        constants.SERVER_URI
    ))[0] || {
        username: constants.USER_CONFIGS.snapshot.username,
        role: "guest"
    };

    threadContainer.innerHTML = `
        <div class="thread-header">
            <h2>${thread.title}</h2>
            <p class="thread-meta">
                Posted ${timeAgo(thread.createdAt)} by ${author.username}
                <span class="${author.role}-role">[${author.role}]</span>
            </p>
            <hr/>
        </div>
        <div class="thread-posts"></div>
    `;

    await reloadPosts(threadId);
    injectPostCreator(threadId);
}

/* ======================================================
   CREATE POST
====================================================== */

function injectPostCreator(threadId) {
    const postBox = document.createElement("div");
    postBox.classList.add("create-post-box");

    postBox.innerHTML = `
        <h3>Add a Post as <span class="small-message-font ${constants.USER_CONFIGS.snapshot.role}-role">${constants.USER_CONFIGS.snapshot.username}</span></h3>
        <form>
            <textarea required></textarea>
            <br/>
            <input type="submit" value="Submit"/>
            <p class="error" style="color:red;"></p>
        </form>
    `;

    threadContainer.append(postBox);

    const form = postBox.querySelector("form");
    const textarea = form.querySelector("textarea");

    // adding tabspace support into textarea
    textarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
            e.preventDefault();
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            textarea.value = textarea.value.substring(0, start) + "\t" + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 1;
        }
    });

    const errorBox = form.querySelector(".error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!textarea.value.trim()) {
            errorBox.textContent = "Post cannot be empty.";
            return;
        }

        const payload = {
            threadId,
            authorId: constants.USER_CONFIGS.snapshot.userId || -1,
            authorUsername: constants.USER_CONFIGS.snapshot.username,
            createdAt: new Date().toISOString(),
            content: textarea.value.trim()
        };

        await fetch(`${constants.SERVER_URI}/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        textarea.value = "";
        await reloadPosts(threadId);
    });
}

/* ======================================================
   CREATE THREAD (WITH OPTIONAL FIRST POST)
====================================================== */

function injectCreateThreadForm() {
    // Blocking UI if role is anything other than mod/admin
    if(!canCreateThreadInForum(forumId)) {
        return; // do not bind form at all
    }

    const form = document.querySelector("#createThreadForm");
    if (!form) return;

    const h3 = document.querySelector(".create-thread-box h3");
    h3.innerHTML += ` <i>as <span class="small-message-font ${constants.USER_CONFIGS.snapshot.role}-role">${constants.USER_CONFIGS.snapshot.username}</span></i>`
    const errorBox = form.querySelector(".error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Performing final check if it is a mod/admin
        if(!canCreateThreadInForum(forumId)) {
            errorBox.textContent = "Only moderators and admins can create announcements. You may reply inside threads.";
            return;
        }

        const title = form.title.value.trim();
        const content = form.content.value.trim();

        if (!title) {
            errorBox.textContent = "Thread title is required.";
            return;
        }

        const threadRes = await fetch(`${constants.SERVER_URI}/thread`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                forumId: Number(forumId),
                title,
                authorId: constants.USER_CONFIGS.snapshot.userId || -1,
                createdAt: new Date().toISOString()
            })
        });

        const newThread = await threadRes.json();

        if (content.length) {
            await fetch(`${constants.SERVER_URI}/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    threadId: newThread.id,
                    authorId: constants.USER_CONFIGS.snapshot.userId || -1,
                    authorUsername: constants.USER_CONFIGS.snapshot.username,
                    createdAt: new Date().toISOString(),
                    content
                })
            });
        }

        form.reset();
        errorBox.textContent = "";

        await reloadThreadList();
        await loadThread(newThread.id);
        showThreadView(newThread.id);
    });
}

/* ======================================================
   INITIALIZATION
====================================================== */
// bootstrap authentication from token
await initApp();

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

const forumDetails = await getEndpointData(
    `forum?id=${forumId}`,
    false,
    constants.SERVER_URI
);

document.title = `${forumDetails[0].name} - Vaad Forum`;
document.querySelector(".forum-header").innerHTML = `
    <h2>${forumDetails[0].name}</h2>
    <p>${forumDetails[0].description}</p>
    <hr/><br/>
`;
handleCreateThreadVisibility();
injectCreateThreadForm();
await reloadThreadList();

// Load highlighted thread/posts if values in URL params
if(autoThreadId) { 
    await loadThread(autoThreadId);
    showThreadView(autoThreadId);
    
    if(autoPostId) {
        focusPost(autoPostId);
    } else {
        const firstPost = document.querySelector(`.post`);
        const firstPostId = firstPost.getAttribute("data-post-id");
        focusPost(firstPostId);
    }

    clearAutoNavParams();
}

// focus on a post based on 'reply' link behavior not coming from outside // these two are separated on purpose based on behavior
document.addEventListener("click", (e) => {
    const replyLink = e.target.closest("a[data-reply-post]");
    if (!replyLink) return;

    e.preventDefault();
    const postId = replyLink.dataset.replyPost;
    const post = document.querySelector(`#post-${postId}`);
    if (!post) return;

    post.scrollIntoView({ behavior: "smooth", block: "center" });

    post.classList.add("post-highlight");
    setTimeout(() => post.classList.remove("post-highlight"), 1500);
});