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


/* ======================================================
   UTIL FUNCTIONS
====================================================== */
function insertFormattingAtCursor(textarea, code) {
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selected = textarea.value.substring(start, end) || code;
    const formatted = code.includes(selected) ? code : code.replace(/Text|Code|Spoiler|Link Text|Blockquote|username/, selected);

    textarea.value =
        textarea.value.substring(0, start) +
        formatted +
        textarea.value.substring(end);

    // Find placeholder region inside formatted text
    const placeholderMatch = formatted.match(/Text|Code|Spoiler|Link Text|Blockquote|username/);
    if (placeholderMatch) {
        const placeholderStart = start + formatted.indexOf(placeholderMatch[0]);
        const placeholderEnd = placeholderStart + placeholderMatch[0].length;
        textarea.selectionStart = placeholderStart;
        textarea.selectionEnd = placeholderEnd;
    } else {
        textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
    }

    textarea.focus();
}

function createFormattingToolbar(targetTextarea) {
    const toolbar = document.createElement("div");
    toolbar.className = "formatting-toolbar hidden";

    const buttons = [
        { label: "B", code: "**Text**" },
        { label: "I", code: "__Text__" },
        { label: "S", code: "~Text~" },
        { label: "Mark", code: "==Text==" },

        { label: "`", code: "`Code`" },
        { label: "Block", code: "```\nCode\n```" },

        { label: "H2", code: "## Heading" },
        { label: "H3", code: "### Subheading" },

        { label: "Quote", code: "> Blockquote" },

        { label: "UL", code: "- List item" },
        { label: "OL", code: "1. List item" },

        { label: "HR", code: "\n---\n" },

        { label: "Center", code: "::center::Text::center::" },

        { label: "Link", code: "[[https://example.com|Link Text]]" },
        { label: "@", code: "{{username}}" }
    ];

    buttons.forEach(b => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = b.label;
        btn.title = b.code;
        btn.addEventListener("click", () => {
            targetTextarea.classList.toggle("txtara-border-show")
            insertFormattingAtCursor(targetTextarea, b.code);
        });
        toolbar.appendChild(btn);
    });

    return toolbar;
}

function showCopyToast(text, anchorEl) {
 
  document.querySelectorAll(".copy-toast").forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = "copy-toast";
  toast.textContent = text;

  document.body.appendChild(toast);

  const rect = anchorEl.getBoundingClientRect();
  toast.style.top = `${rect.top - 22 + window.scrollY}px`;
  toast.style.left = `${rect.left + rect.width / 2}px`;

  setTimeout(() => toast.remove(), 900);
}

function buildMetaSpawn(p, author) {
    const isDeleted = p.deletionLog?.deleted;
    const lastDeletion = p.deletionLog?.log?.[0];
    if (!isDeleted || !lastDeletion) {
    return `
      Posted ${timeAgo(p.createdAt)} by ${author.username}
      <span class="${author.role}-role">[${author.role}]</span>
    `;
  }

  const isSelfDelete = lastDeletion.deletedBy == "self";
  const deleterRole = (isSelfDelete)?author.role:constants.__MODS__.filter(y => y.id == lastDeletion.deleterId)[0]?.role;
  const hasReason = isSelfDelete !== "self" && lastDeletion.reason;
  
  return `
    Deleted ${timeAgo(lastDeletion.deletedOn)} by ${(isSelfDelete)?author.username:constants.__MODS__.filter(y => y.id == lastDeletion.deleterId)[0].username}
    <span class="${deleterRole}-role">[${(isSelfDelete)?"self":deleterRole}]</span>
    ${
      hasReason
        ? `
          <span
            class="delete-reason-indicator"
            title="${lastDeletion.reason.replace(/"/g, "&quot;")}">
            [✉] Reason
          </span>
        `
        : ""
    }

    <small><br/>[was created by ${author.username} ${timeAgo(p.createdAt)}]</small>
  `;
}

function injectDeleteUI(postNode, postId) {
  // Prevent duplicate injection
  if (postNode.querySelector(".delete-ui")) return;


  const user = constants.USER_CONFIGS.snapshot;
  const requiresReason = (user.role === "moderator" || user.role === "admin") &&
                          user.username !== postNode.querySelector(".reply-btn").dataset.username;

  const ui = document.createElement("div");
  ui.className = "delete-ui";

  ui.innerHTML = `
    ${requiresReason ? `
      <textarea
        class="delete-reason"
        placeholder="Deletion reason (required)"
        rows="2"
      ></textarea>
    ` : ""}
    <div class="delete-actions">
      <button class="confirm-delete">Confirm</button>
      <button class="cancel-delete">Cancel</button>
      <p class="error"></p>
    </div>
  `;

  postNode.append(ui);
  
  postNode.classList.add("has-delete-ui");

  setTimeout(() => ui.classList.add("show"), 10);

  const errorBox = ui.querySelector(".error");

  ui.querySelector(".cancel-delete").onclick = () => {
    postNode.classList.remove("has-delete-ui");
    ui.remove();
  };

  ui.querySelector(".confirm-delete").onclick = async () => {
    const reason = requiresReason
      ? ui.querySelector(".delete-reason").value.trim()
      : "Deleted by author";

    if (requiresReason && !reason) {
      errorBox.textContent = "Deletion reason is required.";
      return;
    }

    await deletePost(postId, reason);
    postNode.classList.remove("has-delete-ui");
  };
}

async function deletePost(postId, reason) {
  
  const user = constants.USER_CONFIGS.snapshot;

  // fetch post
  const postRes = await fetch(`${constants.SERVER_URI}/posts/${postId}`);
  const post = await postRes.json();

  if (!post || post.deletionLog?.deleted) {
    alert("Post already deleted.");
    return;
  }

  const deletedBy =
    user.userId === post.authorId
      ? "self"
      : user.role === "admin"
        ? "admin"
        : "moderator";

  const deletionEntry = {
    deletedBy,
    deleterId: user.userId,
    deletedContent: post.content,
    reason: deletedBy === "self" ? null : reason,
    deletedOn: new Date().toISOString()
  };

  const updatedPost = {
    ...post,
    content: "<i>deleted</i>",
    deletionLog: {
      deleted: true,
      log: [deletionEntry, ...(post.deletionLog?.log || [])]
    }
  };

  await fetch(`${constants.SERVER_URI}/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedPost)
  });

  await reloadPosts(currentThreadId);
}


function canDeletePost(post) {
  const user = constants.USER_CONFIGS.snapshot;
  if (user.userId === -1 || user.isGuest) return false;
  if (user.userId === post.authorId) return true;
  if (user.role === "moderator" || user.role === "admin") return true;
  return false;
}

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
        2. CODE BLOCKS
    =============================== */
    content = content.replace(
        /```([\s\S]*?)```/g,
        (_, code) => `<pre><code>${code}</code></pre>`
    );

    /* ===============================
        3. INLINE CODE
    =============================== */
    content = content.replace(/`([^`]+)`/g, "<code>$1</code>");

    /* ===============================
        4. REPLY LINKS
    =============================== */
    content = content.replace(
        />>>[\w-]+\[post:(\d+)\]/g,
        (m, id) =>
            `<a href="#post-${id}" class="reply-link" data-reply-post="${id}">${m}</a>`
    );

    /* ===============================
        5. BLOCKQUOTES
    =============================== */
    content = content.replace(
        /(^|\n)>(?!>|\s*>)(.*)/g,
        `$1<blockquote>$2</blockquote>`
    );

    /* ===============================
        6. HEADINGS
    =============================== */
    content = content.replace(/(^|\n)### (.*)/g, `$1<h3>$2</h3>`);
    content = content.replace(/(^|\n)## (.*)/g, `$1<h2>$2</h2>`);

    /* ===============================
        7. HORIZONTAL RULE
    =============================== */
    content = content.replace(
        /(^|\n)---(?=\n|$)/g,
        `$1<hr/>`
    );

    /* ===============================
        8. LISTS  //// just fixed this part
    =============================== */

    // Unordered
    content = content.replace(
        /(?:^|\n{2,})((?:- |\* ).+(?:\n(?:- |\* ).+)*)/g,
        (_, block) => {
            const items = block
                .trim()
                .split(/\n/)
                .map(line => `<li>${line.replace(/^(- |\* )/, "")}</li>`)
                .join("");
            return `\n<ul>${items}</ul>`;
        }
    );

    // Ordered
    content = content.replace(
        /(?:^|\n)((?:\d+\. .+(?:\n\d+\. .+)*)+)/g,
        (_, block) => {
            const items = block
                .trim()
                .split(/\n/)
                .map(line => `<li>${line.replace(/^\d+\. /, "")}</li>`)
                .join("");
            return `\n<ol>${items}</ol>`;
        }
    );  

    /* ===============================
        9. TEXT FORMATTING
    =============================== */
    content = content
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<b>$1</b>")
        .replace(/__(.*?)__/g, "<i>$1</i>")
        .replace(/_(.*?)_/g, "<i>$1</i>")
        .replace(/~(.*?)~/g, "<s>$1</s>")
        .replace(/==(.*?)==/g, "<mark>$1</mark>");

    /* ===============================
        10. COLOR HIGHLIGHT
    =============================== */
    content = content.replace(
        /@@([^:]+):([\s\S]+?)@@/g,
        (_, color, text) =>
            `<span style="background:${color}; padding:2px 4px; border-radius:3px;">${text}</span>`
    );

    /* ===============================
        11. LINKS
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
        12. USER MENTIONS
    =============================== */
    content = content.replace(
        /\{\{([a-zA-Z0-9_-]+)\}\}/g,
        (_, u) => `<a href="profile.html?username=${u}">@${u}</a>`
    );

    /* ===============================
        13. SPOILERS
    =============================== */
    content = content.replace(
        /\|\|(.*?)\|\|/g,
        `<span class="spoiler">$1</span>`
    );

    /* ===============================
        14. EMOJIS
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
        15. LINE BREAKS (LAST!)
    =============================== */
    content = content.replace(/\n/g, "<br/>");

    /* ===============================
        16. RESTORE ESCAPED TOKENS
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
            showThreadView(val.id);
            await loadThread(val.id);
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

        const isDeleted = p.deletionLog?.deleted;
        // const lastDeletion = p.deletionLog?.log?.[0];
        return `
          <div class="post"  data-aos="fade-up" data-post-id="${p.id}" id="post-${p.id}">
            <div class="post-content">${isDeleted ? "<small><i>Deleted</i></small>" : parsePostContent(p.content)}</div>
            <div class="post-meta">
                 <div
                    class="post-id-box"
                    data-post-id="${p.id}"
                    title="Click to copy Post ID">
                    ⓘ
                </div>
                <span class="meta-spawn">
                    ${buildMetaSpawn(p, author)}
                </span>
                

                <span class="post-actions">
                    ${
                        !isDeleted
                        ? `
                            <button
                            title="reply to ${author.username}"
                            class="reply-btn"
                            data-post-id="${p.id}"
                            data-username="${author.username}">
                            Reply
                            </button>
                        `
                        : `
                            <button
                            class="reply-btn disabled"
                            title="Post is deleted."
                            disabled>
                            Reply
                            </button>
                        `
                    }

                    ${
                        !isDeleted && canDeletePost(p)
                        ? `<button class="delete-btn" data-post-id="${p.id}" title="delete post">delete</button>`
                        : ""
                    }
                </span>

            </div>
            
          </div>
        `;
    }).join("");

    let threadPosts = document.querySelector(".thread-posts");
    threadPosts.innerHTML = postsHTML;


    // Add Undo buttons for deleted posts
    
    posts.forEach(p => {
        const user = constants.USER_CONFIGS.snapshot;
        const lastDeletion = p.deletionLog?.log?.[0];
        if (!p.deletionLog?.deleted || !lastDeletion) return;

        let canUndo = false;

        if(!lastDeletion) {
            canUndo = false;
        } else if ( lastDeletion.deletedBy === "self") {
            canUndo = lastDeletion.deleterId === user.userId;
        } else if (lastDeletion.deleterId != user.userId ){
            canUndo = false;
        }
        else {
            canUndo = user.role === "moderator" || user.role === "admin";
        }
        if (!canUndo) return;

        const postNode = document.querySelector(`#post-${p.id}`);
        if (postNode.querySelector(".undo-delete-btn")) return;

        const undoBtn = document.createElement("button");
        undoBtn.textContent = "Undo";
        undoBtn.classList.add("undo-delete-btn");

        undoBtn.addEventListener("click", async () => {
            const remainingLog = p.deletionLog.log.slice(1);
            const restoredPost = {
            ...p,
            content: lastDeletion.deletedContent,
            deletionLog: {
                deleted: remainingLog.length > 0,
                log: remainingLog
            }
            };

            await fetch(`${constants.SERVER_URI}/posts/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(restoredPost)
            });

            await reloadPosts(currentThreadId);
        });

        postNode.querySelector(".post-actions").appendChild(undoBtn);
    });


    // event delegation handler is added here
    const postsContainer = document.querySelector(".thread-posts");
    if (!postsContainer.dataset.listenerAdded) {
        postsContainer.addEventListener("click", async (e) => {
            if (e.target.classList.contains("reply-btn")) {
                const postId = e.target.dataset.postId;
                const username = e.target.dataset.username;
                const textarea = document.querySelector(".create-post-box textarea");
                textarea.focus();
                textarea.scrollIntoView({ behavior: "smooth", block: "center" });
                textarea.value = `>>>${username}[post:${postId}]\n` + textarea.value;
            }

            if (e.target.classList.contains("delete-btn")) {
                const postId = e.target.dataset.postId;
                const postNode = e.target.closest(".post");

                let ui = postNode.querySelector(".delete-ui");
                if (ui) {
                    // toggle
                    ui.classList.toggle("show");
                } else {
                    injectDeleteUI(postNode, postId);
                    postNode.querySelector(".delete-ui").scrollIntoView(
                        {behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'});
                }
            }

            if(e.target.classList.contains("post-id-box")){
                const infoBox = e.target.closest(".post-id-box");
                if(!infoBox) return;

                const postId = infoBox.dataset.postId;
                if(!postId) return;
                try {
                    navigator.clipboard.writeText(postId);
                    infoBox.classList.add("copied");
                    setTimeout(() => infoBox.classList.remove("copied"), 800);
                    
                    showCopyToast("Post ID copied", infoBox);
                } catch(err) {
                    console.error("Failed to copy Post ID");
                }
            };
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
    postBox.setAttribute("data-aos", "fade-left")
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

    //injecting toolbar above textarea00
    const toolbar = createFormattingToolbar(textarea);
    postBox.insertBefore(toolbar, form);

    const guideBtn = document.createElement("button");
    guideBtn.type = "button";
    guideBtn.className = "format-guide-btn";
    guideBtn.textContent = "Formatting";
    guideBtn.addEventListener("click", () => {
        toolbar.classList.toggle("hidden");
    });

    // placing next to <h3> text
    postBox.querySelector("h3").appendChild(guideBtn);

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

    // inject formatting toolbar above textarea
    const toolbar = createFormattingToolbar(form.querySelector("textarea"));
    form.querySelector("textarea").before(toolbar);

    const guideBtn = document.createElement("button");
    guideBtn.type = "button";
    guideBtn.className = "format-guide-btn";
    guideBtn.textContent = "Formatting";
    guideBtn.addEventListener("click", () => {
        toolbar.classList.toggle("hidden");
    });

    const h3 = document.querySelector(".create-thread-box h3");
    h3.innerHTML += ` <i>as <span class="small-message-font ${constants.USER_CONFIGS.snapshot.role}-role">${constants.USER_CONFIGS.snapshot.username}</span></i>`
    
    h3.appendChild(guideBtn);

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