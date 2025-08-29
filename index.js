// --- Global Variables & Constants ---
let currencyData = []; // To store the list of currencies fetched from the backend.
const themeIcon = document.getElementById("themeIcon");
const statusMessage = document.getElementById("status-message");
const lightIcon = "light-mode.png";
const darkIcon = "night-mode.png";
const API_BASE = "https://currency-converter-backend-hux8.onrender.com";

// --- CORE FUNCTIONS ---

/**
 * A helper function to wait for a specific number of milliseconds.
 * Used in the retry logic to pause between fetch attempts.
 * @param {number} ms - The number of milliseconds to wait.
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from a URL with a retry mechanism to handle slow server startups.
 * It shows user-friendly messages during the process.
 * @param {string} url - The URL to fetch data from.
 * @param {number} retries - The maximum number of retry attempts.
 * @param {number} delay_ms - The delay in milliseconds between retries.
 * @returns {Promise<Object>} - A promise that resolves with the JSON data.
 */
async function fetchWithRetry(url, retries = 4, delay_ms = 30000) {
    for (let i = 0; i < retries; i++) {
        try {
            // Update the status message to inform the user about the process.
            if (i === 0) {
                statusMessage.textContent = "⚙️ Waking up the server, this may take a moment...";
            } else {
                statusMessage.textContent = `⚙️ Server is starting... Retrying attempt ${i + 1}...`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            statusMessage.textContent = ""; // Clear message on success.
            return await response.json(); // Return the fetched data.

        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay_ms / 1000}s...`);
            // If it's the last attempt, throw an error to be caught by the calling function.
            if (i === retries - 1) throw new Error("Server did not respond after multiple attempts.");
            await delay(delay_ms); // Wait before the next attempt.
        }
    }
}

/**
 * Loads the list of currencies from the backend when the page starts.
 * It uses fetchWithRetry to handle potential server delays.
 */
async function loadCurrencies() {
    try {
        // Fetch the currency data using the robust retry function.
        currencyData = await fetchWithRetry(`${API_BASE}/currencies`);

        // Show a temporary success message now that the server is awake.
        statusMessage.textContent = "✅ Server is live! You're ready to convert.";

        // Clear the success message after 3 seconds.
        setTimeout(() => {
            statusMessage.textContent = "";
        }, 3000);

        // If successful, set up the interactive dropdown menus.
        setupDropdown("fromCurrencySearch", "fromCurrencyList", "toCurrencySearch");
        setupDropdown("toCurrencySearch", "toCurrencyList", null);

    } catch (error) {
        // If all retries fail, display a final error message.
        statusMessage.textContent = "❌ Failed to load currencies. The server might be down. Please try again later.";
        console.error("Final error after all retries:", error);
    }
}

/**
 * Handles the currency conversion when the "Convert" button is clicked.
 * It validates inputs, fetches the conversion rate, and displays the result.
 */
async function convertCurrency() {
    const from = document.getElementById("fromCurrencySearch").value;
    const to = document.getElementById("toCurrencySearch").value;
    const amount = document.getElementById("amount").value;
    const resultElement = document.getElementById("result");

    resultElement.innerText = ""; // Clear previous results.

    // Input validation.
    if (!from || !to) {
        statusMessage.textContent = "⚠️ Please select both 'from' and 'to' currencies.";
        return;
    }
    if (amount <= 0 || !amount) {
        statusMessage.textContent = "⚠️ Please enter a valid amount greater than zero.";
        return;
    }

    statusMessage.textContent = "Converting..."; // Show progress.

    try {
        // Fetch the converted amount from the backend.
        const res = await fetch(`${API_BASE}/convert?from=${from}&to=${to}&amount=${amount}`);
        if (!res.ok) throw new Error('Conversion request failed');
        const data = await res.json();

        // Display the result and clear the status message.
        resultElement.innerText =
            `${amount} ${from} = ${data.convertedAmount.toFixed(2)} ${to} (Rate: ${data.rate})`;
        statusMessage.textContent = "";
    } catch (error) {
        resultElement.innerText = "";
        statusMessage.textContent = "❌ Failed to fetch conversion. Please try again.";
        console.error(error);
    }
}

// --- UI & EVENT LISTENERS ---

/**
 * Checks local storage to apply the user's preferred theme (light/dark) on page load.
 */
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    themeIcon.src = darkIcon;
    document.getElementById("theme-color-meta").setAttribute("content", "#1e1e1e");
} else {
    document.body.classList.add("light-mode");
    themeIcon.src = lightIcon;
    document.getElementById("theme-color-meta").setAttribute("content", "#ffffff");
}

/**
 * Toggles the theme between light and dark mode when the theme icon is clicked.
 * It also saves the user's preference in local storage and updates the theme-color meta tag.
 */
themeIcon.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
    themeIcon.src = isDark ? darkIcon : lightIcon;

    // Update the theme-color meta tag for the browser UI
    const themeColor = isDark ? "#1e1e1e" : "#ffffff";
    document.getElementById("theme-color-meta").setAttribute("content", themeColor);
});

/**
 * Swaps the 'from' and 'to' currency values and animates the swap button.
 */
function swapCurrencies() {
    const fromInput = document.getElementById("fromCurrencySearch");
    const toInput = document.getElementById("toCurrencySearch");
    const swapBtn = document.querySelector(".swap-btn");

    swapBtn.classList.toggle("rotate"); // Animate the button.

    // Swap the values.
    const tmp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = tmp;

    // Hide the dropdown lists after swapping.
    document.getElementById("fromCurrencyList").style.display = "none";
    document.getElementById("toCurrencyList").style.display = "none";
}

/**
 * Sets up all event listeners (focus, input, keyboard navigation) for a currency dropdown.
 * @param {string} inputId - The ID of the search input element.
 * @param {string} listId - The ID of the dropdown list container.
 * @param {string|null} nextInputId - The ID of the next input to focus on when Tab is pressed.
 */
function setupDropdown(inputId, listId, nextInputId) {
    let input = document.getElementById(inputId);
    let list = document.getElementById(listId);
    let highlightedIndex = -1;

    // Helper to visually highlight an item in the list for keyboard navigation.
    function highlightItem(index) {
        let items = list.querySelectorAll(".dropdown-item");
        items.forEach(item => item.classList.remove("highlight"));
        if (items[index]) {
            items[index].classList.add("highlight");
            items[index].scrollIntoView({ block: "nearest" });
        }
    }

    // When the user clicks into the search box, show the full currency list.
    input.addEventListener("focus", () => {
        populateDropdown(listId, currencyData, inputId);
        list.style.display = "block";
        highlightedIndex = -1;
    });

    // As the user types, filter the currency list in real-time.
    input.addEventListener("input", () => {
        let search = input.value.toLowerCase();
        let filtered = currencyData.filter(c =>
            c.code.toLowerCase().includes(search) ||
            c.name.toLowerCase().includes(search)
        );
        populateDropdown(listId, filtered, inputId);
        list.style.display = filtered.length ? "block" : "none";
        highlightedIndex = -1;
    });

    // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Tab).
    input.addEventListener("keydown", (e) => {
        let items = list.querySelectorAll(".dropdown-item");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (highlightedIndex < items.length - 1) highlightedIndex++;
            highlightItem(highlightedIndex);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (highlightedIndex > 0) highlightedIndex--;
            highlightItem(highlightedIndex);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && items[highlightedIndex]) items[highlightedIndex].click();
        } else if (e.key === "Tab" && !e.shiftKey && nextInputId) {
            e.preventDefault();
            document.getElementById(nextInputId).focus();
        } else if (e.key === "Tab" && e.shiftKey && nextInputId === null) {
            e.preventDefault();
            document.getElementById("fromCurrencySearch").focus();
        }
    });

    // If the user clicks anywhere outside the dropdown, hide it.
    document.addEventListener("click", (event) => {
        if (!input.contains(event.target) && !list.contains(event.target)) {
            list.style.display = "none";
        }
    });
}

/**
 * Fills a dropdown list with currency options based on the provided data.
 * @param {string} listId - The ID of the list element to populate.
 * @param {Array<Object>} data - The array of currency data to display.
 * @param {string} inputId - The ID of the input field to update when an item is clicked.
 */
function populateDropdown(listId, data, inputId) {
    let list = document.getElementById(listId);
    list.innerHTML = ""; // Clear existing items.

    // Create and append a new div for each currency.
    data.forEach(c => {
        let item = document.createElement("div");
        item.classList.add("dropdown-item");
        item.textContent = `${c.code} - ${c.name}`;
        // When an item is clicked, update the input field and hide the list.
        item.onclick = function() {
            document.getElementById(inputId).value = c.code;
            list.style.display = "none";
        };
        list.appendChild(item);
    });
}

// --- INITIALIZATION ---

/**
 * Initial call to load the currencies when the script is first executed.
 */
loadCurrencies();