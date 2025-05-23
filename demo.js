document.addEventListener('DOMContentLoaded', () => {
  const OperationMode = {
    ENCRYPT: 'encrypt',
    DECRYPT: 'decrypt',
  };

  // DOM Elements
  const cryptoForm = document.getElementById('crypto-form');
  const inputTextElement = document.getElementById('inputText');
  const secretKeyElement = document.getElementById('secretKey');
  const processButton = document.getElementById('process-button');
  const copyButton = document.getElementById('copy-button');
  const outputSection = document.getElementById('output-section');
  const outputTextDisplay = document.getElementById('outputText-display');
  const alertContainer = document.getElementById('alert-container');
  const headerIconContainer = document.getElementById('header-icon-container');
  const inputTextLabel = document.getElementById('input-text-label');
  const encryptRadio = document.getElementById('operation-encrypt');
  const decryptRadio = document.getElementById('operation-decrypt');

  // State
  let currentOperationMode = OperationMode.ENCRYPT;
  let isLoading = false;
  let currentAlertTimeout = null;

  // --- Icons SVG ---
  const lockIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg>`;
  const unlockIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-10 h-10"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h1.5V5.5a1.5 1.5 0 013 0V9H13z" clip-rule="evenodd" /></svg>`;
  const spinnerSVG = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-current spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
  
  const alertIcons = {
    error: `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-3.873A1.127 1.127 0 018.873 13V8a1.127 1.127 0 012.254 0v5a1.127 1.127 0 01-1.127 1.127zm0 3.123a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z" clip-rule="evenodd"></path></svg>`,
    success: `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`,
    info: `<svg class="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-5.5a1 1 0 00-2 0V16a1 1 0 102 0v-3.5zM10 7a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>`,
  };


  // --- Crypto Service Functions ---
  const encryptText = (plainText, secretKey) => {
    if (!plainText.trim()) throw new Error("Plain text cannot be empty.");
    if (!secretKey) throw new Error("Secret key cannot be empty.");
    return CryptoJS.AES.encrypt(plainText, secretKey).toString();
  };

  const decryptText = (ciphertextB64, secretKey) => {
    if (!ciphertextB64.trim()) throw new Error("Ciphertext cannot be empty.");
    if (!secretKey) throw new Error("Secret key cannot be empty.");
    const bytes = CryptoJS.AES.decrypt(ciphertextB64, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText && ciphertextB64 && secretKey) {
      throw new Error("Decryption failed. Invalid key or corrupted ciphertext.");
    }
    return originalText;
  };

  // --- UI Update Functions ---
  const clearAlerts = () => {
    alertContainer.innerHTML = '';
    if (currentAlertTimeout) {
      clearTimeout(currentAlertTimeout);
      currentAlertTimeout = null;
    }
  };

  const renderAlert = (message, type = 'error', autoCloseDelay = 0) => {
    clearAlerts();
    const alertDiv = document.createElement('div');
    let baseClasses = "p-4 mb-4 text-sm rounded-lg flex items-center";
    let iconSVG = alertIcons.info;

    switch (type) {
      case 'error':
        baseClasses += " bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
        iconSVG = alertIcons.error;
        break;
      case 'success':
        baseClasses += " bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
        iconSVG = alertIcons.success;
        break;
      case 'info':
      default:
        baseClasses += " bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
        break;
    }
    alertDiv.className = baseClasses;
    alertDiv.setAttribute('role', 'alert');
    
    alertDiv.innerHTML = `
      ${iconSVG}
      <span class="font-medium flex-grow">${message}</span>
      <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-transparent text-current rounded-lg focus:ring-2 focus:ring-current p-1.5 hover:bg-opacity-20 hover:bg-current inline-flex h-8 w-8" aria-label="Close">
        <span class="sr-only">Close message</span>
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
      </button>
    `;
    
    alertDiv.querySelector('button').addEventListener('click', clearAlerts);
    alertContainer.appendChild(alertDiv);

    if (autoCloseDelay > 0) {
      currentAlertTimeout = setTimeout(clearAlerts, autoCloseDelay);
    }
  };
  
  const updateButtonAndInputsState = () => {
    const originalButtonText = currentOperationMode === OperationMode.ENCRYPT ? 'Encrypt Text' : 'Decrypt Text';
    processButton.disabled = isLoading;
    inputTextElement.disabled = isLoading;
    secretKeyElement.disabled = isLoading;
    encryptRadio.disabled = isLoading;
    decryptRadio.disabled = isLoading;

    if (isLoading) {
      processButton.innerHTML = `${spinnerSVG} Processing...`;
      processButton.classList.add('opacity-60', 'cursor-not-allowed');
    } else {
      processButton.innerHTML = originalButtonText;
      processButton.classList.remove('opacity-60', 'cursor-not-allowed');
    }
     // Re-evaluate disable based on input values if not loading
    if (!isLoading) {
        const text = inputTextElement.value.trim();
        const key = secretKeyElement.value;
        if (!text || !key) {
            processButton.disabled = true;
            processButton.classList.add('opacity-60', 'cursor-not-allowed');
        } else {
            processButton.disabled = false;
            processButton.classList.remove('opacity-60', 'cursor-not-allowed');
        }
    }
  };


  const updateUIForOperationMode = () => {
    clearAlerts();
    outputSection.style.display = 'none';
    outputTextDisplay.textContent = '';
    // inputTextElement.value = ''; // Optional: clear input on mode change

    if (currentOperationMode === OperationMode.ENCRYPT) {
      headerIconContainer.innerHTML = lockIconSVG;
      inputTextLabel.innerHTML = `Text to Encrypt <span class="text-red-500">*</span>`;
      inputTextElement.placeholder = "Enter your sensitive text here...";
    } else {
      headerIconContainer.innerHTML = unlockIconSVG;
      inputTextLabel.innerHTML = `Ciphertext to Decrypt <span class="text-red-500">*</span>`;
      inputTextElement.placeholder = "Enter Base64 encoded ciphertext...";
    }
    updateButtonAndInputsState(); // This will set button text and disabled state correctly
  };

  // --- Event Handlers ---
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    clearAlerts();

    const text = inputTextElement.value.trim();
    const key = secretKeyElement.value;

    if (!text) {
      renderAlert("Input text cannot be empty.", "error");
      return;
    }
    if (!key) {
      renderAlert("Secret key cannot be empty.", "error");
      return;
    }

    isLoading = true;
    updateButtonAndInputsState();
    outputSection.style.display = 'none';
    outputTextDisplay.textContent = '';

    // Simulate async operation for UI feedback
    await new Promise(resolve => setTimeout(resolve, 50)); 

    try {
      let result;
      if (currentOperationMode === OperationMode.ENCRYPT) {
        result = encryptText(text, key);
      } else {
        result = decryptText(text, key);
      }
      outputTextDisplay.textContent = result;
      outputSection.style.display = 'block';
    } catch (e) {
      renderAlert(e.message || "An unexpected error occurred.", "error");
    } finally {
      isLoading = false;
      updateButtonAndInputsState();
    }
  };

  const handleCopyToClipboard = async () => {
    if (!outputTextDisplay.textContent) return;
    try {
      await navigator.clipboard.writeText(outputTextDisplay.textContent);
      renderAlert("Copied to clipboard!", "success", 2000);
    } catch (err) {
      renderAlert("Failed to copy.", "error", 2000);
      console.error('Failed to copy text: ', err);
    }
  };
  
  const handleInputValidation = () => {
    if (!isLoading) { // Only update if not already in a loading state
        updateButtonAndInputsState();
    }
  };

  const handleOperationModeChange = (event) => {
    currentOperationMode = event.target.value;
    updateUIForOperationMode();
  };

  // --- Initialization ---
  cryptoForm.addEventListener('submit', handleFormSubmit);
  copyButton.addEventListener('click', handleCopyToClipboard);
  encryptRadio.addEventListener('change', handleOperationModeChange);
  decryptRadio.addEventListener('change', handleOperationModeChange);
  
  inputTextElement.addEventListener('input', handleInputValidation);
  secretKeyElement.addEventListener('input', handleInputValidation);

  updateUIForOperationMode(); // Initial UI setup
});
