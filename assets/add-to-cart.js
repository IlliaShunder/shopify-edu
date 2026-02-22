(() => {
    'use strict';

    const UI = {
        form: '.add-to-cart-btn form',
        submit: 'button[type="submit"]',
        spinner: '.loading-overlay__spinner',
        variantInput: 'input[name="id"]',
        cartNotice: 'cart-notification',
        cartDrawer: 'cart-drawer',
        cartDrawerItems: 'cart-drawer-items',
    };

    const REQUEST_TIMEOUT = 10000;

    let cachedCart = null;

    function getCart() {
        if (cachedCart) return cachedCart;

        cachedCart =
            document.querySelector(UI.cartNotice) ||
            document.querySelector(UI.cartDrawer);

        return cachedCart;
    };

    function toggleLoading(btn, loader, loading) {
        const label = btn.querySelector('span');

        btn.disabled = loading;
        btn.toggleAttribute('aria-disabled', loading);
        btn.classList.toggle('loading', loading);

        label?.classList.toggle('hidden', loading);
        loader?.classList.toggle('hidden', !loading);
    };

    function emitEvent(type, payload) {
        if (typeof publish !== 'undefined' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(type, payload);
        }
    };

    function submitAddToCart(formEl) {
        const button = formEl.querySelector(UI.submit);
        const variantField = formEl.querySelector(UI.variantInput);

        if (!button || !variantField?.value) return;

        const variantId = variantField.value;
        const cart = getCart();
        const spinner = formEl.querySelector(UI.spinner);

        toggleLoading(button, spinner, true);

        const payload = new FormData();
        payload.append('id', variantId);
        payload.append('quantity', 1);

        if (cart) {
            const drawerItems = document.querySelector(UI.cartDrawerItems);
            const source = drawerItems || cart;

            const sections = source
                .getSectionsToRender()
                .map(({ section }) => section);

            payload.append('sections', sections);
            payload.append('sections_url', window.location.pathname);

            cart.setActiveElement(button);
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        fetch(window.routes.cart_add_url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
            body: payload,
            signal: controller.signal,
        })
            .then((res) => res.json())
            .then((json) => {
                clearTimeout(timer);

                if (json.status) {
                    console.error('Add to cart error:', json);

                    emitEvent(PUB_SUB_EVENTS.cartError, {
                        source: 'add-to-cart',
                        productVariantId: variantId,
                        errors: json.description,
                        message: json.message,
                    });

                    return;
                }

                emitEvent(PUB_SUB_EVENTS.cartUpdate, {
                    source: 'add-to-cart',
                    productVariantId: variantId,
                });

                if (cart) {
                    cart.classList.remove('is-empty');
                    cart.renderContents(json);
                } else {
                    window.location.href = window.routes.cart_url;
                }
            })
            .catch((err) => {
                clearTimeout(timer);

                if (err.name === 'AbortError') {
                    console.error('Request timeout');
                    return;
                }

                console.error('Network error:', err);
            })
            .finally(() => {
                toggleLoading(button, spinner, false);
            });
    };

    const tracked = [];

    function clearListeners() {
        tracked.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
        tracked.length = 0;
    };

    function onEvent(el, evt, fn) {
        el.addEventListener(evt, fn);
        tracked.push({ el, evt, fn });
    };

    function setupAddToCart() {
        clearListeners();

        document.querySelectorAll(UI.form).forEach((form) => {
            const btn = form.querySelector(UI.submit);

            if (btn && !btn.style.getPropertyValue('--button-width')) {
                btn.style.setProperty('--button-width', `${btn.offsetWidth}px`);
                btn.style.setProperty('--button-height', `${btn.offsetHeight}px`);
            }

            onEvent(form, 'submit', (e) => {
                e.preventDefault();
                submitAddToCart(form);
            });
        });
    };

    document.addEventListener('DOMContentLoaded', setupAddToCart);
})();
