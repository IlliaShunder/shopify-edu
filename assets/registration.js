document.addEventListener('DOMContentLoaded', initRegistration);

function initRegistration() {
    let formInProgress = false;
    const registrationForm = document.querySelector('.customer.register form');
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        if (formInProgress) return;

        formInProgress = true;

        try {
            await submitRegistration(registrationForm);
        } finally {
            formInProgress = false;
        }
    });

    async function submitRegistration(form) {
        const formData = new FormData(form);

        const customerData = {
            firstName: formData.get('customer[first_name]'),
            lastName: formData.get('customer[last_name]'),
            email: formData.get('customer[email]'),
            password: formData.get('customer[password]'),
        };

        setFormDisabled(form, true);
        clearMessages();

        try {
            const response = await requestCustomerCreation(customerData);
            const result = response?.data?.customerCreate;

            if (!result) {
                throw new Error('Invalid API response');
            }

            if (result.customerUserErrors && result.customerUserErrors.length) {
                showErrors(result.customerUserErrors);
            } else if (result.customer) {
                showSuccess('Account created successfully!');
            }
        } catch (error) {
            showErrors([{ message: 'An error occurred during registration. Please try again.' }]);
        } finally {
            setFormDisabled(form, false);
        }
    }

    async function requestCustomerCreation(customer) {
        const mutation = `
        mutation customerCreate($input: CustomerCreateInput!) {
            customerCreate(input: $input) {
                customer {
                    firstName
                    lastName
                    email
                }
                customerUserErrors {
                    field
                    message
                }
            }
        }
    `;

        if (!window.Shopify || !window.Shopify.storefrontAccessToken) {
            throw new Error('Storefront API token is missing');
        }

        const requestBody = {
            query: mutation,
            variables: {
                input: {
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    email: customer.email,
                    password: customer.password,
                },
            },
        };

        const response = await fetch(`https://${window.Shopify.shop}/api/2025-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Shopify-Storefront-Access-Token': window.Shopify.storefrontAccessToken,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Request failed: ${response.status} - ${text}`);
        }

        return response.json();
    }

    function setFormDisabled(form, disabled) {
        const fields = form.querySelectorAll('input, button');
        fields.forEach((field) => (field.disabled = disabled));

        const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
        if (!submitBtn) return;

        if (disabled) {
            submitBtn.dataset.originalLabel = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            if (submitBtn.dataset.originalLabel) {
                submitBtn.textContent = submitBtn.dataset.originalLabel;
            }
            submitBtn.style.opacity = '';
            submitBtn.style.cursor = '';
        }
    }

    function showSuccess(message) {
        renderMessage(message, 'alert-box--success', 'status');
    }

    function showErrors(errors) {
        const content =
            errors.length === 1 ? errors[0].message : `<ul>${errors.map((e) => `<li>${e.message}</li>`).join('')}</ul>`;

        renderMessage(content, 'alert-box--error', 'alert', errors.length > 1);
    }

    function renderMessage(content, type, role, isHtml = false) {
        const container = document.getElementById('form-alerts');
        if (!container) return;

        const element = document.createElement('div');
        element.className = `alert-box ${type}`;
        element.setAttribute('role', role);
        element.setAttribute('tabindex', '-1');

        if (isHtml) {
            element.innerHTML = content;
        } else {
            element.textContent = content;
        }

        container.appendChild(element);
        element.focus();

        setTimeout(() => element.remove(), 5000);
    }

    function clearMessages() {
        const container = document.getElementById('form-alerts');
        if (container) {
            container.innerHTML = '';
        }
    }
}
