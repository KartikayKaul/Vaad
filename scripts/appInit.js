import {constants} from "./constants.js";

let initialized = false;

export async function initApp() {
    if(initialized) return;
    initialized = true;
    await constants.bootStrapApp();
}