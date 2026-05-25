/**
 * Custom Checkout Controller - Copa 2026 Theme
 * Fully modular, organized, and optimized for maximum conversions.
 */

// 1. Centralized Checkout Configuration
const checkoutConfig = {
    productName: "Kit Copa Completo",
    productPrice: 69.90,
    currency: "BRL",
    contentId: "kit-copa-completo",
    contentType: "product",
    
    // Shipping options
    freeShippingDays: "8 a 15 dias úteis",
    fastShippingPrice: 19.90,
    fastShippingDays: "4 a 10 dias úteis",
    
    // Aesthetic Styling
    primaryColor: "#009739",
    secondaryColor: "#FFDF00",
    accentColor: "#002776",
    
    // Future Integrations & Routes
    tiktokPixelId: "D8AAKDRC77UBL2TTR5EG",
    thankYouUrl: "/obrigado",
    checkoutSuccessUrl: "/checkout/success",
    pedidoConfirmadoUrl: "/pedido-confirmado"
};

document.addEventListener('DOMContentLoaded', () => {
    
    // 2. Initialize Centralized Page Values & Texts
    initPageElements();

    // 3. Parse Landing Page Attributes (Query Parameters)
    const urlParams = new URLSearchParams(window.location.search);
    const sizeParam = urlParams.get('tamanho') || 'Não selecionado';
    const nameParam = urlParams.get('nome') || 'Sem personalização';

    document.getElementById('summary-size').textContent = sizeParam;
    document.getElementById('summary-name').textContent = nameParam;

    // 4. Trigger TikTok Pixel InitiateCheckout Event on Page Load
    triggerInitiateCheckout(sizeParam, nameParam);

    // 5. Mask Formatters for Form Inputs
    setupMasks();

    // 6. Address Auto-completion via ViaCEP
    setupCepSearch();

    // 7. Dynamic Shipping Selection and Summary Recalculation
    let shippingCost = 0; // Default Free
    setupShippingToggle((newCost) => {
        shippingCost = newCost;
        recalculateTotal(shippingCost);
    });

    // 8. Form Validation & Submission Controller
    setupFormValidation(shippingCost, sizeParam, nameParam);
});

/**
 * Initializes visual elements on the page from the central config object
 */
function initPageElements() {
    document.getElementById('summary-prod-name').textContent = checkoutConfig.productName;
    document.getElementById('summary-prod-price').textContent = formatCurrency(checkoutConfig.productPrice);
    document.getElementById('subtotal-val').textContent = formatCurrency(checkoutConfig.productPrice);
    document.getElementById('free-days-text').textContent = checkoutConfig.freeShippingDays;
    document.getElementById('fast-days-text').textContent = checkoutConfig.fastShippingDays;
    document.getElementById('fast-price-text').textContent = formatCurrency(checkoutConfig.fastShippingPrice);
    
    // Default Price setup
    recalculateTotal(0);
}

/**
 * Recalculates final prices in the summary card
 */
function recalculateTotal(shippingPrice) {
    const subtotal = checkoutConfig.productPrice;
    const total = subtotal + shippingPrice;
    
    const shippingValElement = document.getElementById('shipping-val');
    if (shippingPrice === 0) {
        shippingValElement.textContent = "Grátis";
        shippingValElement.className = "green-text";
    } else {
        shippingValElement.textContent = formatCurrency(shippingPrice);
        shippingValElement.className = "";
    }
    
    document.getElementById('total-val').textContent = formatCurrency(total);
}

/**
 * Formats a raw number to BRL Currency style
 */
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: checkoutConfig.currency });
}

/**
 * Trigger TikTok Pixel standard event: InitiateCheckout
 */
function triggerInitiateCheckout(size, name) {
    if (typeof ttq !== 'undefined') {
        ttq.track('InitiateCheckout', {
            content_type: checkoutConfig.contentType,
            contents: [{
                content_id: checkoutConfig.contentId,
                content_name: checkoutConfig.productName,
                price: checkoutConfig.productPrice,
                quantity: 1,
                currency: checkoutConfig.currency,
                size: size,
                name_customization: name
            }],
            value: checkoutConfig.productPrice,
            currency: checkoutConfig.currency
        });
        console.log("TikTok Event Triggered: InitiateCheckout");
    }
}

/**
 * Trigger TikTok Pixel standard event: AddPaymentInfo
 */
function triggerAddPaymentInfo(totalValue, size, name) {
    if (typeof ttq !== 'undefined') {
        ttq.track('AddPaymentInfo', {
            content_type: checkoutConfig.contentType,
            contents: [{
                content_id: checkoutConfig.contentId,
                content_name: checkoutConfig.productName,
                price: checkoutConfig.productPrice,
                quantity: 1,
                currency: checkoutConfig.currency,
                size: size,
                name_customization: name
            }],
            value: totalValue,
            currency: checkoutConfig.currency,
            payment_method: "pix"
        });
        console.log("TikTok Event Triggered: AddPaymentInfo");
    }
}

/**
 * [PLACEHOLDER] Prepared trigger for future server-side / client-side Purchase event
 * Do NOT trigger this function in any frontend clicks now. To be called futher by backend webhooks.
 */
function trackPurchase(orderData) {
    /* 
    if (typeof ttq !== 'undefined') {
        ttq.track('CompletePayment', {
            content_type: checkoutConfig.contentType,
            contents: [{
                content_id: checkoutConfig.contentId,
                content_name: checkoutConfig.productName,
                price: checkoutConfig.productPrice,
                quantity: 1
            }],
            value: orderData.total,
            currency: checkoutConfig.currency,
            order_id: orderData.id
        });
    }
    */
    console.log("Future Purchase tracking endpoint prepared: ", orderData);
}

/**
 * Configures input masks for CPF and Phone/WhatsApp in real time
 */
function setupMasks() {
    const cpfInput = document.getElementById('cpf');
    const phoneInput = document.getElementById('phone');

    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Only numbers
        if (value.length > 11) value = value.slice(0, 11);
        
        // Formatting 000.000.000-00
        if (value.length > 9) {
            value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{3})(\d{3})(\d{1,3})$/, "$1.$2.$3");
        } else if (value.length > 3) {
            value = value.replace(/^(\d{3})(\d{1,3})$/, "$1.$2");
        }
        e.target.value = value;
    });

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ""); // Only numbers
        if (value.length > 11) value = value.slice(0, 11);

        // Formatting (00) 00000-0000 or (00) 0000-0000
        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
        } else if (value.length > 0) {
            value = value.replace(/^(\d*)$/, "($1");
        }
        e.target.value = value;
    });
}

/**
 * Handles CEP input changes and autocompletes fields via ViaCEP API
 */
function setupCepSearch() {
    const cepInput = document.getElementById('cep');
    const errorCep = document.getElementById('error-cep');
    const spinner = document.getElementById('cep-spinner');
    
    // Address Inputs
    const streetInput = document.getElementById('street');
    const neighborhoodInput = document.getElementById('neighborhood');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const numberInput = document.getElementById('number');

    // Add CEP formatting mask: 00000-000
    cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
        }
        e.target.value = value;

        // Auto triggers query when clean length is 8
        const cleanCep = value.replace(/\D/g, "");
        if (cleanCep.length === 8) {
            fetchAddress(cleanCep);
        }
    });

    async function fetchAddress(cleanCep) {
        spinner.style.display = "block";
        errorCep.style.display = "none";
        cepInput.classList.remove('input-error');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                showCepError("CEP não encontrado. Verifique e tente novamente.");
            } else {
                // Prefill fields
                streetInput.value = data.logradouro || "";
                neighborhoodInput.value = data.bairro || "";
                cityInput.value = data.localidade || "";
                stateInput.value = data.uf || "";
                
                // Clear any errors
                clearFieldErrors([streetInput, neighborhoodInput, cityInput, stateInput]);
                
                // Set focus on number input for high completion rate
                numberInput.focus();
            }
        } catch (error) {
            showCepError("Falha na consulta do CEP. Preencha manualmente.");
        } finally {
            spinner.style.display = "none";
        }
    }

    function showCepError(msg) {
        errorCep.textContent = msg;
        errorCep.style.display = "block";
        cepInput.classList.add('input-error');
        
        // Clean fields in case of query fail
        streetInput.value = "";
        neighborhoodInput.value = "";
        cityInput.value = "";
        stateInput.value = "";
    }
}

/**
 * Removes input-error tags from elements
 */
function clearFieldErrors(elements) {
    elements.forEach(el => {
        el.classList.remove('input-error');
        const err = document.getElementById(`error-${el.id}`);
        if (err) err.style.display = "none";
    });
}

/**
 * Sets up clicking switches on shipping cards
 */
function setupShippingToggle(onUpdate) {
    const freeCard = document.getElementById('shipping-free');
    const fastCard = document.getElementById('shipping-fast');
    
    freeCard.addEventListener('click', () => {
        freeCard.classList.add('active');
        fastCard.classList.remove('active');
        
        freeCard.querySelector('.custom-radio').classList.add('active');
        fastCard.querySelector('.custom-radio').classList.remove('active');
        
        onUpdate(0); // Free
    });

    fastCard.addEventListener('click', () => {
        fastCard.classList.add('active');
        freeCard.classList.remove('active');
        
        fastCard.querySelector('.custom-radio').classList.add('active');
        freeCard.querySelector('.custom-radio').classList.remove('active');
        
        onUpdate(checkoutConfig.fastShippingPrice); // Fast Shipping price
    });
}

/**
 * Setup field validators on submit and blur events
 */
function setupFormValidation(shippingCost, size, name) {
    const form = document.getElementById('checkout-form');
    const submitBtn = document.getElementById('submit-btn-checkout');
    
    // Bind Real-time validation on Blur for premium feel
    const inputsToValidate = ['full-name', 'cpf', 'phone', 'email', 'cep', 'street', 'number', 'neighborhood', 'city', 'state'];
    inputsToValidate.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', () => validateField(el));
            el.addEventListener('input', () => {
                // Clean errors on typing to be user friendly
                if (el.classList.contains('input-error')) {
                    validateField(el);
                }
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let isFormValid = true;
        inputsToValidate.forEach(id => {
            const el = document.getElementById(id);
            if (el && !validateField(el)) {
                isFormValid = false;
            }
        });

        if (isFormValid) {
            processPayment(shippingCost, size, name);
        } else {
            // Scroll to the first error smoothly
            const firstError = document.querySelector('.input-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
}

/**
 * Validates a single field, shows error messages below
 */
function validateField(input) {
    const id = input.id;
    const value = input.value.trim();
    const errorEl = document.getElementById(`error-${id}`);
    let isValid = true;
    let errorMsg = "";

    switch (id) {
        case 'full-name':
            if (value.length < 3) {
                isValid = false;
                errorMsg = "Digite seu nome completo.";
            }
            break;
        case 'cpf':
            const cleanCpf = value.replace(/\D/g, "");
            if (cleanCpf.length !== 11 || !validateCpfChecksum(cleanCpf)) {
                isValid = false;
                errorMsg = "Digite um CPF válido.";
            }
            break;
        case 'phone':
            const cleanPhone = value.replace(/\D/g, "");
            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                isValid = false;
                errorMsg = "Digite seu WhatsApp.";
            }
            break;
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMsg = "Digite um e-mail válido.";
            }
            break;
        case 'cep':
            const cleanCep = value.replace(/\D/g, "");
            if (cleanCep.length !== 8) {
                isValid = false;
                errorMsg = "Digite um CEP válido.";
            }
            break;
        case 'street':
            if (value.length === 0) {
                isValid = false;
                errorMsg = "Preencha a rua/endereço.";
            }
            break;
        case 'number':
            if (value.length === 0) {
                isValid = false;
                errorMsg = "Preencha o número.";
            }
            break;
        case 'neighborhood':
            if (value.length === 0) {
                isValid = false;
                errorMsg = "Preencha o bairro.";
            }
            break;
        case 'city':
            if (value.length === 0) {
                isValid = false;
                errorMsg = "Preencha a cidade.";
            }
            break;
        case 'state':
            if (value.length !== 2) {
                isValid = false;
                errorMsg = "Preencha a UF.";
            }
            break;
    }

    if (!isValid) {
        input.classList.add('input-error');
        if (errorEl) {
            errorEl.textContent = errorMsg;
            errorEl.style.display = "block";
        }
    } else {
        input.classList.remove('input-error');
        if (errorEl) {
            errorEl.style.display = "none";
        }
    }

    return isValid;
}

/**
 * Performs raw CPF digit verification
 */
function validateCpfChecksum(cpf) {
    // Check known repeating patterns
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

/**
 * Handles the payment compilation, simulation loading states, and TikTok pixel AddPaymentInfo event
 */
function processPayment(shippingCost, size, name) {
    const submitBtn = document.getElementById('submit-btn-checkout');
    const overlay = document.getElementById('payment-overlay');
    const statusTitle = document.getElementById('overlay-status-title');
    const simulatedSuccess = document.getElementById('pix-mock-success');
    
    const finalTotal = checkoutConfig.productPrice + shippingCost;

    // 1. Disable submit and trigger loading visual
    submitBtn.classList.add('disabled-loader');
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = "PROCESSANDO...";
    
    // Open full overlay
    overlay.classList.add('active');
    statusTitle.style.display = "block";
    statusTitle.textContent = "Gerando seu pagamento PIX...";
    simulatedSuccess.style.display = "none";

    // 2. Trigger TikTok Pixel Event: AddPaymentInfo
    triggerAddPaymentInfo(finalTotal, size, name);

    // 3. Assemble complete customer details
    const customerData = {
        name: document.getElementById('full-name').value.trim(),
        cpf: document.getElementById('cpf').value.replace(/\D/g, ""),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.replace(/\D/g, "")
    };

    const addressData = {
        cep: document.getElementById('cep').value.replace(/\D/g, ""),
        street: document.getElementById('street').value.trim(),
        number: document.getElementById('number').value.trim(),
        complement: document.getElementById('complement').value.trim(),
        neighborhood: document.getElementById('neighborhood').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim().toUpperCase()
    };

    const orderData = {
        product: checkoutConfig.productName,
        price: checkoutConfig.productPrice,
        shipping: shippingCost,
        total: finalTotal,
        size: size,
        nameCustom: name
    };

    // 4. Execute Invictus Pay integration gateway placeholder
    createPixPayment(customerData, addressData, orderData)
        .then((paymentResponse) => {
            // After successful response simulation (e.g. 2.5 seconds)
            statusTitle.style.display = "none";
            document.querySelector('.payment-loader-spinner').style.display = "none";
            
            // Show QR code simulated screen
            simulatedSuccess.style.display = "block";
            
            // Generate timer countdown
            startPixTimer(15 * 60, document.getElementById('pix-timer-val'));
            
            // Configure Copy-Paste button
            setupCopyPasteBtn();

            // Configure Close buttons
            const closeBtn = document.getElementById('overlay-close-btn');
            closeBtn.onclick = () => {
                // Restore form submit button
                submitBtn.classList.remove('disabled-loader');
                submitBtn.disabled = false;
                submitBtn.querySelector('span').textContent = "FINALIZAR COMPRA VIA PIX";
                document.querySelector('.payment-loader-spinner').style.display = "block";
                
                // Hide Overlay
                overlay.classList.remove('active');
            };
        })
        .catch((error) => {
            alert("Ocorreu um erro ao processar. Tente novamente.");
            overlay.classList.remove('active');
            submitBtn.classList.remove('disabled-loader');
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = "FINALIZAR COMPRA VIA PIX";
        });
}

/**
 * [GATEWAY INTEGRATION] Placeholder function prepared for future Invictus Pay API connection
 * Securely designed: This function executes client-side triggers, while private API integrations will be done server-side.
 */
async function createPixPayment(customer, address, order) {
    console.log("Future Gateway Invictus Pay Integration details compiled securely: ", { customer, address, order });
    
    // Simulate standard HTTP post payload latency (2500ms)
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                status: "success",
                pix_copia_cola: "00020101021226830014br.gov.bcb.pix2561api.invictuspay.com.br/v2/cob/D8AAKDRC77UBL2TTR5EG3406ba434f1caa05bfa1e90fe28",
                qrcode_visual: "https://kitselecaobrasileira.shop/checkout/simulated-qrcode-visual.png",
                order_id: "ORD-" + Math.floor(Math.random() * 1000000)
            });
        }, 2200);
    });
}

/**
 * Configures the copy-paste action button
 */
function setupCopyPasteBtn() {
    const copyBtn = document.getElementById('pix-copy-btn');
    const codeInput = document.getElementById('pix-code-field');
    
    copyBtn.addEventListener('click', () => {
        codeInput.select();
        codeInput.setSelectionRange(0, 99999); // For mobile devices
        
        navigator.clipboard.writeText(codeInput.value)
            .then(() => {
                copyBtn.textContent = "COPIADO! ✓";
                copyBtn.style.backgroundColor = "#22c55e"; // Success green
                
                setTimeout(() => {
                    copyBtn.textContent = "COPIAR CÓDIGO";
                    copyBtn.style.backgroundColor = "#32bcad"; // Default turquoise
                }, 2000);
            })
            .catch(() => {
                alert("Falha ao copiar automaticamente. Selecione e copie o código manualmente.");
            });
    });
}

/**
 * Creates an active ticking 15-minute countdown clock
 */
function startPixTimer(duration, display) {
    let timer = duration, minutes, seconds;
    const interval = setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            clearInterval(interval);
            display.textContent = "EXPIRADO";
        }
    }, 1000);
    
    // Clear interval when closing the modal to prevent leaks
    const closeBtn = document.getElementById('overlay-close-btn');
    closeBtn.addEventListener('click', () => {
        clearInterval(interval);
    });
}
