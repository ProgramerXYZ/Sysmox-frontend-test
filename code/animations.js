const SysmoxSidebar = (() => {
    const SELECTORS = {
        sidebar: "sidebar",
        toggleButton: "sidebar-toggle-button",
        navButtons: ".nav-button",
    };

    const CLASSES = {
        collapsed: "sidebar-collapsed",
        animating: "sidebar-animating",
    };

    const STORAGE_KEYS = {
        collapsed: "sysmox-sidebar-collapsed",
    };

    const CONFIG = {
        mobileQuery: "(max-width: 800px)",
        touchQuery: "(pointer: coarse)",
        edgeSwipeWidth: 96,
        swipeThreshold: 30,
        closeSwipeThreshold: 28,
        closeSwipeStartWidth: 180,
        verticalTolerance: 80,
    };

    const LABELS = {
        expandedIcon: "☰",
        collapsedIcon: "›",
        expand: "Expand sidebar",
        collapse: "Collapse sidebar",
    };

    const DEBUG_PREFIX = "[Sysmox Sidebar]";

    let elements = {};
    let gestureStart = null;

    const log = (message, data = undefined) => {
        if (data === undefined) {
            console.log(DEBUG_PREFIX, message);
            return;
        }

        console.log(DEBUG_PREFIX, message, data);
    };

    const warn = (message, data = undefined) => {
        if (data === undefined) {
            console.warn(DEBUG_PREFIX, message);
            return;
        }

        console.warn(DEBUG_PREFIX, message, data);
    };

    const getElements = () => {
        const sidebar = document.getElementById(SELECTORS.sidebar);
        const toggleButton = document.getElementById(SELECTORS.toggleButton);
        const navButtons = [...document.querySelectorAll(SELECTORS.navButtons)];

        return {
            sidebar,
            toggleButton,
            navButtons,
        };
    };

    const hasRequiredElements = () => {
        const missingElements = [];

        if (!elements.sidebar) {
            missingElements.push(`#${SELECTORS.sidebar}`);
        }

        if (!elements.toggleButton) {
            missingElements.push(`#${SELECTORS.toggleButton}`);
        }

        if (missingElements.length > 0) {
            warn("Missing required elements. Sidebar controls were not initialized.", {
                missingElements,
            });
            return false;
        }

        return true;
    };

    const isTouchDevice = () => {
        return (
            window.matchMedia(CONFIG.touchQuery).matches ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
    };

    const isMobileViewport = () => {
        return window.matchMedia(CONFIG.mobileQuery).matches;
    };

    const isTouchPointer = (event) => {
        return event.pointerType === "touch" || event.pointerType === "pen";
    };

    const getSavedCollapsedState = () => {
        const savedState = localStorage.getItem(STORAGE_KEYS.collapsed);
        const isCollapsed = savedState === null
            ? true
            : savedState === "true";

        log("Loaded saved sidebar state.", {
            savedState,
            isCollapsed,
            defaultedToCollapsed: savedState === null,
        });

        return isCollapsed;
    };

    const saveCollapsedState = (isCollapsed) => {
        localStorage.setItem(STORAGE_KEYS.collapsed, String(isCollapsed));
        log("Saved sidebar state.", { isCollapsed });
    };

    const updateToggleButton = (isCollapsed) => {
        elements.toggleButton.setAttribute("aria-expanded", String(!isCollapsed));
        elements.toggleButton.setAttribute(
            "aria-label",
            isCollapsed ? LABELS.expand : LABELS.collapse
        );
        elements.toggleButton.textContent = isCollapsed
            ? LABELS.collapsedIcon
            : LABELS.expandedIcon;
    };

    const restartAnimation = () => {
        elements.sidebar.classList.remove(CLASSES.animating);
        void elements.sidebar.offsetWidth;
        elements.sidebar.classList.add(CLASSES.animating);
    };

    const setSidebarState = (isCollapsed, options = {}) => {
        const { shouldAnimate = true, shouldSave = true } = options;

        elements.sidebar.classList.toggle(CLASSES.collapsed, isCollapsed);
        updateToggleButton(isCollapsed);

        if (shouldAnimate) {
            restartAnimation();
        }

        if (shouldSave) {
            saveCollapsedState(isCollapsed);
        }

        log("Applied sidebar state.", {
            isCollapsed,
            shouldAnimate,
            shouldSave,
        });
    };

    const toggleSidebar = () => {
        const isCurrentlyCollapsed = elements.sidebar.classList.contains(CLASSES.collapsed);
        const nextCollapsedState = !isCurrentlyCollapsed;

        log("Toggle button clicked.", {
            fromCollapsed: isCurrentlyCollapsed,
            toCollapsed: nextCollapsedState,
        });

        setSidebarState(nextCollapsedState);
    };

    const openSidebar = () => {
        if (!elements.sidebar.classList.contains(CLASSES.collapsed)) {
            return;
        }

        log("Opening sidebar from swipe.");
        setSidebarState(false);
    };

    const closeSidebar = () => {
        if (elements.sidebar.classList.contains(CLASSES.collapsed)) {
            return;
        }

        log("Closing sidebar from swipe.");
        setSidebarState(true);
    };

    const setNavButtonTitles = () => {
        elements.navButtons.forEach((button) => {
            const title = button.textContent.trim();

            if (title) {
                button.setAttribute("title", title);
            }
        });

        log("Prepared nav button tooltips.", {
            count: elements.navButtons.length,
        });
    };

    const bindEvents = () => {
        elements.toggleButton.addEventListener("click", toggleSidebar);

        elements.sidebar.addEventListener("animationend", (event) => {
            if (event.target !== elements.sidebar) {
                return;
            }

            elements.sidebar.classList.remove(CLASSES.animating);
            log("Sidebar animation finished.", {
                animationName: event.animationName,
            });
        });

        log("Event listeners attached.");
    };

    const canStartGesture = (eventTarget, clientX) => {
        const isCollapsed = elements.sidebar.classList.contains(CLASSES.collapsed);
        const startedInsideSidebar = elements.sidebar.contains(eventTarget);
        const startedOnToggleButton = elements.toggleButton.contains(eventTarget);
        const startedAtLeftEdge = clientX <= CONFIG.edgeSwipeWidth;
        const startedNearOpenSidebar = !isCollapsed && clientX <= CONFIG.closeSwipeStartWidth;

        return {
            isCollapsed,
            startedInsideSidebar,
            startedOnToggleButton,
            startedAtLeftEdge,
            startedNearOpenSidebar,
            canStart: startedInsideSidebar ||
                startedOnToggleButton ||
                startedNearOpenSidebar ||
                (isCollapsed && startedAtLeftEdge),
        };
    };

    const finishGesture = (clientX, clientY) => {
        if (!gestureStart) {
            return;
        }

        const deltaX = clientX - gestureStart.x;
        const deltaY = clientY - gestureStart.y;
        const isHorizontalSwipe = Math.abs(deltaX) >= CONFIG.swipeThreshold &&
            Math.abs(deltaY) <= CONFIG.verticalTolerance;

        log("Swipe gesture ended.", {
            deltaX,
            deltaY,
            isHorizontalSwipe,
            startedAtLeftEdge: gestureStart.startedAtLeftEdge,
            startedInsideSidebar: gestureStart.startedInsideSidebar,
            startedOnToggleButton: gestureStart.startedOnToggleButton,
            startedNearOpenSidebar: gestureStart.startedNearOpenSidebar,
            wasCollapsed: gestureStart.wasCollapsed,
        });

        if (isHorizontalSwipe && deltaX > 0 && gestureStart.wasCollapsed) {
            openSidebar();
        }

        if (
            isHorizontalSwipe &&
            deltaX <= -CONFIG.closeSwipeThreshold &&
            !gestureStart.wasCollapsed &&
            (gestureStart.startedInsideSidebar ||
                gestureStart.startedOnToggleButton ||
                gestureStart.startedNearOpenSidebar)
        ) {
            closeSidebar();
        }

        gestureStart = null;
    };

    const captureSwipePointer = (pointerTarget, pointerId) => {
        if (!pointerTarget || !pointerTarget.setPointerCapture) {
            return;
        }

        try {
            pointerTarget.setPointerCapture(pointerId);
            log("Swipe pointer captured.", { pointerId });
        } catch (error) {
            warn("Could not capture swipe pointer.", {
                pointerId,
                target: pointerTarget.tagName,
                error: error.message,
            });
        }
    };

    const bindPointerSwipeGestures = () => {
        const swipeEnabled = isTouchDevice();

        if (!swipeEnabled) {
            log("Touch swipe disabled. Device is not touch-capable.");
            return;
        }

        document.addEventListener("pointerdown", (event) => {
            if (!isTouchPointer(event)) {
                return;
            }

            const startInfo = canStartGesture(event.target, event.clientX);

            if (!startInfo.canStart) {
                gestureStart = null;
                return;
            }

            gestureStart = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                lastX: event.clientX,
                lastY: event.clientY,
                startedInsideSidebar: startInfo.startedInsideSidebar,
                startedOnToggleButton: startInfo.startedOnToggleButton,
                startedAtLeftEdge: startInfo.startedAtLeftEdge,
                startedNearOpenSidebar: startInfo.startedNearOpenSidebar,
                wasCollapsed: startInfo.isCollapsed,
                alreadyHandled: false,
            };

            captureSwipePointer(event.target, event.pointerId);
            log("Swipe gesture started.", gestureStart);
        }, { passive: false });

        document.addEventListener("pointermove", (event) => {
            if (!gestureStart || event.pointerId !== gestureStart.pointerId) {
                return;
            }

            const deltaX = event.clientX - gestureStart.x;
            const deltaY = event.clientY - gestureStart.y;
            gestureStart.lastX = event.clientX;
            gestureStart.lastY = event.clientY;

            if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
                event.preventDefault();
            }

            if (
                !gestureStart.alreadyHandled &&
                deltaX >= CONFIG.swipeThreshold &&
                Math.abs(deltaY) <= CONFIG.verticalTolerance &&
                gestureStart.wasCollapsed
            ) {
                gestureStart.alreadyHandled = true;
                openSidebar();
            }

            if (
                !gestureStart.alreadyHandled &&
                deltaX <= -CONFIG.closeSwipeThreshold &&
                Math.abs(deltaY) <= CONFIG.verticalTolerance &&
                !gestureStart.wasCollapsed &&
                (gestureStart.startedInsideSidebar ||
                    gestureStart.startedOnToggleButton ||
                    gestureStart.startedNearOpenSidebar)
            ) {
                gestureStart.alreadyHandled = true;
                closeSidebar();
            }
        }, { passive: false });

        document.addEventListener("pointerup", (event) => {
            if (!gestureStart || event.pointerId !== gestureStart.pointerId) {
                return;
            }

            finishGesture(event.clientX, event.clientY);
        });

        document.addEventListener("pointercancel", (event) => {
            if (gestureStart) {
                log("Swipe gesture cancelled. Finishing with last tracked position.", {
                    pointerId: event.pointerId,
                    lastX: gestureStart.lastX,
                    lastY: gestureStart.lastY,
                });
                finishGesture(gestureStart.lastX, gestureStart.lastY);
            }
        });

        log("Touch swipe enabled.", {
            mode: "pointer-events",
            edgeSwipeWidth: CONFIG.edgeSwipeWidth,
            swipeThreshold: CONFIG.swipeThreshold,
            closeSwipeThreshold: CONFIG.closeSwipeThreshold,
            closeSwipeStartWidth: CONFIG.closeSwipeStartWidth,
            verticalTolerance: CONFIG.verticalTolerance,
        });
    };

    const bindLegacyTouchGestures = () => {
        if (window.PointerEvent || !isTouchDevice()) {
            return;
        }

        document.addEventListener(
            "touchstart",
            (event) => {
                if (event.touches.length === 0) {
                    return;
                }

                const touch = event.touches[0];
                const startInfo = canStartGesture(event.target, touch.clientX);

                if (!startInfo.canStart) {
                    gestureStart = null;
                    return;
                }

                gestureStart = {
                    x: touch.clientX,
                    y: touch.clientY,
                    startedInsideSidebar: startInfo.startedInsideSidebar,
                    startedOnToggleButton: startInfo.startedOnToggleButton,
                    startedAtLeftEdge: startInfo.startedAtLeftEdge,
                    startedNearOpenSidebar: startInfo.startedNearOpenSidebar,
                    wasCollapsed: startInfo.isCollapsed,
                };

                log("Legacy touch gesture started.", gestureStart);
            },
            { passive: true }
        );

        document.addEventListener(
            "touchend",
            (event) => {
                if (!gestureStart || event.changedTouches.length === 0) {
                    return;
                }

                const touch = event.changedTouches[0];
                finishGesture(touch.clientX, touch.clientY);
            },
            { passive: true }
        );

        log("Legacy touch swipe enabled.", {
            edgeSwipeWidth: CONFIG.edgeSwipeWidth,
            swipeThreshold: CONFIG.swipeThreshold,
            closeSwipeThreshold: CONFIG.closeSwipeThreshold,
            closeSwipeStartWidth: CONFIG.closeSwipeStartWidth,
            verticalTolerance: CONFIG.verticalTolerance,
        });
    };

    const init = () => {
        console.groupCollapsed(`${DEBUG_PREFIX} Init`);
        elements = getElements();

        log("Elements found.", {
            hasSidebar: Boolean(elements.sidebar),
            hasToggleButton: Boolean(elements.toggleButton),
            navButtonCount: elements.navButtons.length,
        });

        if (!hasRequiredElements()) {
            console.groupEnd();
            return;
        }

        setNavButtonTitles();
        bindEvents();
        bindPointerSwipeGestures();
        bindLegacyTouchGestures();
        setSidebarState(getSavedCollapsedState(), {
            shouldAnimate: false,
            shouldSave: false,
        });

        log("Initialized successfully.");
        console.groupEnd();
    };

    return {
        closeSidebar,
        init,
        openSidebar,
        setSidebarState,
        toggleSidebar,
    };
})();

document.addEventListener("DOMContentLoaded", SysmoxSidebar.init);
