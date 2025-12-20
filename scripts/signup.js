import { buildNavbar } from "./core.js";
import { initApp } from "./appInit.js";
import { signupUser } from "./authentication.js";

// bootstrap authentication from token
await initApp();

// injecting navbar
const navbar = document.querySelector(".navbar");
if(navbar) navbar.innerHTML = buildNavbar();

//const elements
const form = document.querySelector("#signupForm");
const errorMsg = document.querySelector("#errorMsg");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.textContent = "";

    const username = document.querySelector("#username").value.trim();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const confirm = document.querySelector("#confirmPassword").value;
    const remember = document.querySelector("#rememberMe").checked;

    if(!username || !email || !password || !confirm) {
        errorMsg.textContent = "All fields are required.";
        return;
    }

    if(password !== confirm) {
        errorMsg.textContent = "Passwords do not match";
        return;
    }
    if(password.length < 6) {
        errorMsg.textContent = "Passwords must be at least 6 characters.";
        return;
    }

    try {
        await signupUser({username, email, password, remember});
        location.href = "/index.html"; //redirecting after successful login // we can change it later to profile.html
    } catch(err) {
        errorMsg.textContent = err.message || "Signup failed";
    }
});
