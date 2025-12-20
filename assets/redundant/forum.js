// IMPORTS
import {constants} from './constants.js'
import { getEndpointData, timeAgo } from './core.js'

// GLOBAL CONSTANTS and declaration
const layout = document.querySelector(".forum-layout");
const threadContainer = document.querySelector(".thread-container");
let currentView = "forum";
let currentThreadId =  null;

// console.log(constants.USER_CONFIGS)

// UTIL forum functions - Reuable
function buildQueryForUsers(authorIds) {
    if(!authorIds.length) return "user";
    return "user?" + authorIds.map(id => `id_like=${id}`).join("&");
}

function showForumView() {
    currentView = "forum";
    currentThreadId = null; 
    
    layout.classList.remove("thread-view");
    layout.classList.add("forum-view");

    threadContainer.classList.add("hidden");
    threadContainer.innerHTML = "";

    // removing the backlink
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
        document.querySelector(".thread-list-container").prepend(back);
    }
}

async function reloadPosts(threadId) {
    // fetching posts from this thread
    let posts = await getEndpointData(
        `posts?threadId=${threadId}`,
        false,
        constants.SERVER_URI
    );
    posts.sort((a,b) => {return a.createdAt - b.createdAt});

    // fetching user objects who posted in this thread
    let authorsInPostsArr = [...new Set(posts.map(x => x.authorId))];
    const eptQ = buildQueryForUsers(authorsInPostsArr);
    const authorsList = await getEndpointData(eptQ, false, constants.SERVER_URI);
    // creating a fast lookup object
    const userMap = {};
    authorsList.forEach(u =>userMap[u.id] = u);

    // building the HTML skeleton for posts
    const postsHTML = posts.map(p => {
        let author = userMap[p.authorId];
        if(!author && p.authorId === -1) {
            // safe fallback if no author found
            author = {
                username: p.authorUsername,
                role: "guest"
            }
        }
        return `
          <div class="post">
            <p class="post-content">${p.content}</p>
            <p class="post-meta">
                Posted ${timeAgo(p.createdAt)} by ${author.username} <span class="${author.role}-role">[${author.role}]</span>
            </p>
            <hr/>
          </div>
        `;
    }).join("");

    document.querySelector(".thread-posts").innerHTML = postsHTML;
}

async function loadThread(threadId) {
    threadContainer.innerHTML = "<p>Loading thread ...</p>";

    // fetch thread detail
    const thread = (await getEndpointData(
        `thread?id=${threadId}`,
        false,
        constants.SERVER_URI
    ))[0]; 

    // fetch the author based on authorId in thread
    let author = (await getEndpointData(
        `user?id=${thread.authorId}`,
        false,
        constants.SERVER_URI
    ))[0];
    if(!author && thread.authorId === -1) {
        // safe fallback if no author found
        author = {
            username: constants.USER_CONFIGS.uname,
            role: "guest"
        };
    }

   
    threadContainer.innerHTML = `
        <div class="thread-header">
            <h2>${thread.title}</h2>
            <p class="thread-meta">
                Posted ${timeAgo(thread.createdAt)} by ${author.username} <span class="${author.role}-role">[${author.role}]</span>
            </p>
            <hr/>
        </div>

        <div class="thread-posts">
        </div>
    `;

    await reloadPosts(threadId);
    // injecting post creation UI
    injectPostCreator(threadId);
    
}

function injectPostCreator(threadId, replyTo=null) {
    const postBox = document.createElement("div");
    postBox.classList.add("create-post-box");
    postBox.style.marginTop = "25px";

    postBox.innerHTML = `
        <h3>Add a Post <span class="small-message-font">as ${constants.USER_CONFIGS.username}</span></h3>
        <form id="createPostForm">
            <textarea 
                id="newPostContent"
                name="content"
                placeholder="Write your thoughts..."
                style="width:100%; height: 90px;"
                required
            ></textarea>
            <br/>
            <input type="submit" id="submitPostBtn" value="Submit" />
            <p id="postError" style="color:red; font-size: 0.7rem;"></p>
        </form>
    `;

    threadContainer.append(postBox);

    // getting references
    const form = postBox.querySelector("#createPostForm");
    const textarea = postBox.querySelector("#newPostContent");
    const errorBox = postBox.querySelector("#postError");

    // handling form
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const content = textarea.value.trim();

        if(!content.length) {
            errorBox.textContent = "Post cannot be empty.";
            return;
        }

        // creating post object
        const newPost = {
            threadId: Number(threadId),
            authorId: constants.USER_CONFIGS.userId || -1,
            replyToPostId: replyTo,
            createdAt: new Date().toISOString(),
            content: content
        };

        if(newPost.authorId == -1) {
            newPost.authorUsername = constants.USER_CONFIGS.username;
        }

        try {
            const res = await fetch(`${constants.SERVER_URI}/posts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newPost)
            });

            if(!res.ok) throw new Error("Failed to create post");
            
            errorBox.textContent = "";
            textarea.value = "";

            // reload posts again
            await reloadPosts(threadId);
        } catch(err) {
            errorBox.textContent = err.message;
        }
        return false;
    });
}

function injectCreateThreadForm() {
    const form = document.querySelector("#createThreadForm");
    const errorBox = form.querySelector(".error");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = form.title.value.trim();
        const content = form.content.value.trim();

        if (!title) {
            errorBox.textContent = "Thread title is required.";
            return;
        }

        try {
            // 1️⃣ Create thread
            const threadRes = await fetch(`${constants.SERVER_URI}/thread`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    forumId: Number(forumId),
                    title,
                    authorId: constants.USER_CONFIGS.userId || -1,
                    createdAt: new Date().toISOString()
                })
            });

            if (!threadRes.ok) throw new Error("Failed to create thread");

            const newThread = await threadRes.json();

            // Optional first post
            if (content.length) {
                const postPayload = {
                    threadId: newThread.id,
                    authorId: constants.USER_CONFIGS.userId || -1,
                    createdAt: new Date().toISOString(),
                    content
                };

                if (postPayload.authorId === -1) {
                    postPayload.authorUsername = constants.USER_CONFIGS.username;
                }

                await fetch(`${constants.SERVER_URI}/posts`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postPayload)
                });
            }

            // Reset form
            form.reset();
            errorBox.textContent = "";

            // Reload thread list
            await reloadThreadList();

            // Open the new thread
            await loadThread(newThread.id);
            showThreadView(newThread.id);

        } catch (err) {
            errorBox.textContent = err.message;
        }
    });
}



// UTIL & some Functions endd here //

// ---- START EXECUTION PART ---- //
// extracting parameters to determine forum based on incoming anchor tag href
const forumId = new URLSearchParams(window.location.search).get("forumId");
let forumDetails = await getEndpointData(`forum?id=${forumId}`, false, constants.SERVER_URI);
let threadsList = await getEndpointData(`thread?forumId=${forumId}`, false, constants.SERVER_URI);

// fill the forum header with details its details
let forumHeader = document.querySelector(".forum-header");
document.title = `${forumDetails[0].name} - Vaad Forum`;
forumHeader.innerHTML = `
    <h2>${forumDetails[0].name}</h2>
    <p>${forumDetails[0].description}</p>
    <hr/>
    <br/>
`;

// getting list of authors who created these threads
let authIds = (threadsList.length)?threadsList.map(x => x.authorId):[];
let eptQ = `user?`; //endpoint query being inflated
authIds.forEach((idval) => {
    eptQ += `&id=${idval}`; //generate endpoint query to get the authors
});

let authorsList = (authIds.length)?await getEndpointData(eptQ, false, constants.SERVER_URI):[];

// Process to inject list of threads in the current forum
let threadListContainer = document.querySelector(".thread-list-container");
if(threadsList.length) {
// if the forum has any threads at all what shall we do?
    let ulTLC = document.createElement("ul");
    ulTLC.classList.add("ulTLC");

    // injectAListIntoBody(threadsList, ".thread-list-container");
    threadsList.forEach( (val) => {
        if(val.forumId == forumId) {
            let li = document.createElement("li");
            let authorObj = authorsList.find(x => x.id == val.authorId) || constants.USER_CONFIGS.uname;
            let threadTitle = document.createElement("h4");
            let threadMeta = document.createElement("p");
            let aLink = document.createElement("a");
            aLink.style.cursor = "pointer";
            aLink.setAttribute("data-threadId", `${val.id}`);
            aLink.textContent = val.title;

            threadTitle.append(aLink);
            threadMeta.textContent = `${authorObj?.username}[${authorObj?.role}]`;

            threadTitle.classList.add("threadTitle");
            threadMeta.classList.add("authroname");
            
            li.append(threadTitle, threadMeta);
            ulTLC.append(li);
        }
    });
    
    threadListContainer.append(ulTLC);
} else {
    //if there is no content. what can we do here? for now just posting a message
    threadListContainer.innerHTML = `<h3>Sorry, currently no threads posted in this forum.</h3>`
}


// Load thread into 
let threadListLinkNodes = document.querySelectorAll(".threadTitle a");
threadListLinkNodes.forEach(anchor => {
    anchor.addEventListener("click", async (e) => {
        const threadId = anchor.getAttribute("data-threadId");

        
        await loadThread(threadId);
        showThreadView(threadId);
    });
});