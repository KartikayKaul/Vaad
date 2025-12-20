/* ======================================================
    CONSTANTS OR IMPORTS
====================================================== */
const alphabets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateGuestName() {
    return `guest${alphabets[Math.floor(Math.random()*alphabets.length)]}${Date.now()}`;
}

/* ======================================================
    FUNCTIONALITY : 
====================================================== */
function createUserConfigManager() {
    let _state = null;
    
    function loadInitial() {
        const saved = sessionStorage.getItem("USER_CONFIGS");
        if(saved) return JSON.parse(saved);

        return {
            username: generateGuestName(),
            userId: -1,
            email: null,
            role: "guest",
            isGuest: true,
            auth: {
                token: null,
                expiresAt: null,
                rememberDevice: false
            },
            profile: {
                displayName: null,
                bio: null,
                location: null,
                website: null,
                interests: [],
                privacy: {
                    publicProfile: true,
                    showEmail: false,
                    showLocation: true,
                    showInterests: true
                }
            },
            createdAt: Date.now(),
            lastActiveAt: Date.now()
        };
    } //loadInitial definition ends

    
    _state = loadInitial();

    function persist() {
        sessionStorage.setItem("USER_CONFIGS", JSON.stringify(_state));
    }

    /* =================================
            EXPOSED PART
    ===================================== */
    return Object.freeze({
        // Read only
        get snapshot() {
            return structuredClone(_state);
        },

        isAuthenticated() {
            return !_state.isGuest && !!_state.auth.token;
        },

        // Changeables
        setGuest() {
            _state = loadInitial();
            persist();
        },

        setAuthenticateUser({user, token, expiresAt, remember}) {
            _state = {
                username: user.username,
                userId: user.id,
                email: user.email,
                role: user.role,
                isGuest: false,
                auth: {
                    token,
                    expiresAt,
                    rememberDevice: remember
                },
                profile: user.profile || {
                    displayName: "",
                    bio: "",
                    location: "",
                    website: "",
                    interests: [],
                    privacy: {
                        publicProfile: true,
                        showEmail: false,
                        showLocation: true,
                        showInterests: true
                    }
                },
                createdAt: user.createdAt,
                lastActiveAt: Date.now()
            };
            persist();

            if(remember) {
                localStorage.setItem("AUTH_TOKEN", JSON.stringify({token, expiresAt}));
            }
        },

        // update
        updateProfile(profileUpdates) {
            _state.profile = {
                ...( _state.profile || {} ),
                ...profileUpdates,
                privacy: {
                    ...( (_state.profile && _state.profile.privacy) || {} ),
                    ...(profileUpdates.privacy || {})
                }
            };
            persist();

            // _state.profile = profile;
            // persist();
        },

        logout() {
            sessionStorage.removeItem("USER_CONFIGS");
            localStorage.removeItem("AUTH_TOKEN");
            location.reload();
        }
    });
}

export const USER_CONFIG = createUserConfigManager();

