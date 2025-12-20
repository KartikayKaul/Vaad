/* ======================================================
    IMPORTS
====================================================== */
import { initApp } from "./appInit.js";
import { loginUser, logoutUser  } from "./authentication.js";
import { buildNavbar } from "./core.js";

/* ======================================================
    INJECT NAVBAR
====================================================== */


/* ======================================================
    INIT AFTER DOM loaded fully
====================================================== */
document.addEventListener("DOMContentLoaded", async () =>{
    // bootstrap authentication from token
    await initApp();
    init();
});

function init() {
    const navbar = document.querySelector(".navbar");
    if(navbar) {
        navbar.innerHTML = buildNavbar();
    }

    // adding logout listener
    const logoutBtn = document.querySelector("#logoutBtn");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await logoutUser();
        });
    }

    // elements constants
    const form = document.querySelector("#loginForm");
    const errorMsg = document.querySelector("#errorMsg");

    // form submission listener
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorMsg.textContent = "";

        const username = document.querySelector("#username").value.trim();
        const password = document.querySelector("#password").value;
        const remember = document.querySelector("#rememberMe").checked;

        if(!username || !password) {
            errorMsg.textContent = "Username and password are required";
            return;
        }

        try {
            await loginUser({ username, password, remember});
            let start = "";
            if(location.href.includes("github.io")) {
                start = "/Vaad";
            }
            window.location.href = start +"/index.html";
        } catch (err) {
            errorMsg.textContent = err.message || "Login failed";
        }
    });
}