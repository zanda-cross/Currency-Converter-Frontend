let currencyData = [];
const themeIcon = document.getElementById("themeIcon");
const statusMessage = document.getElementById("status-message");
const lightIcon = "light-mode.png";
const darkIcon = "night-mode.png";
const API_BASE = "https://currency-converter-backend-hux8.onrender.com";


const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, retries = 4, delay_ms = 30000) {
    for (let i = 0; i < retries; i++) {
        try {
            // On the first attempt, show a friendly message
            if (i === 0) {
                statusMessage.textContent = "⚙️ Waking up the server, this may take a moment...";
            } else {
                statusMessage.textContent = `⚙️ Server is starting... Retrying attempt ${i + 1}...`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            // Success! Clear the message and return the data.
            statusMessage.textContent = "";
            return await response.json();

        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay_ms / 1000}s...`);
            if (i === retries - 1) throw new Error("Server did not respond after multiple attempts.");
            await delay(delay_ms);
        }
    }
}


// --- Updated Core Logic ---

// ✨ REWRITTEN to use the fetchWithRetry function
async function loadCurrencies() {
    try {
        // Use the new robust fetch function
        currencyData = await fetchWithRetry(`${API_BASE}/currencies`);

        // If successful, setup the dropdowns
        setupDropdown("fromCurrencySearch", "fromCurrencyList", "toCurrencySearch");
        setupDropdown("toCurrencySearch", "toCurrencyList", null);

    } catch (error) {
        // This catch block now only runs after all retries have failed
        statusMessage.textContent = "❌ Failed to load currencies. The server might be down. Please try again later.";
        console.error("Final error after all retries:", error);
    }
}

// ✨ UPDATED to use status messages instead of alerts
async function convertCurrency() {
    const from = document.getElementById("fromCurrencySearch").value;
    const to = document.getElementById("toCurrencySearch").value;
    const amount = document.getElementById("amount").value;
    const resultElement = document.getElementById("result");

    resultElement.innerText = ""; // Clear previous result

    if (!from || !to) {
        statusMessage.textContent = "⚠️ Please select both 'from' and 'to' currencies.";
        return;
    }
    if (amount <= 0 || !amount) {
        statusMessage.textContent = "⚠️ Please enter a valid amount greater than zero.";
        return;
    }

    statusMessage.textContent = "Converting..."; // Provide feedback

    try {
        const res = await fetch(`${API_BASE}/convert?from=${from}&to=${to}&amount=${amount}`);
        if (!res.ok) throw new Error('Conversion request failed');
        const data = await res.json();

        resultElement.innerText =
            `${amount} ${from} = ${data.convertedAmount.toFixed(2)} ${to} (Rate: ${data.rate})`;
        statusMessage.textContent = ""; // Clear status on success
    } catch (error) {
        resultElement.innerText = ""; // Clear result area on failure
        statusMessage.textContent = "❌ Failed to fetch conversion. Please try again.";
        console.error(error);
    }
}


// --- Unchanged Functions ---

// Load stored preference
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    themeIcon.src = darkIcon;
} else {
    themeIcon.src = lightIcon;
}

// Toggle theme on click
themeIcon.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
    themeIcon.src = isDark ? darkIcon : lightIcon;
});

function swapCurrencies() {
    const fromInput = document.getElementById("fromCurrencySearch");
    const toInput = document.getElementById("toCurrencySearch");
    const swapBtn = document.querySelector(".swap-btn");

    swapBtn.classList.toggle("rotate");

    const tmp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = tmp;

    document.getElementById("fromCurrencyList").style.display = "none";
    document.getElementById("toCurrencyList").style.display = "none";
}

function setupDropdown(inputId, listId, nextInputId) {
    let input = document.getElementById(inputId);
    let list = document.getElementById(listId);
    let highlightedIndex = -1;

    function highlightItem(index) {
        let items = list.querySelectorAll(".dropdown-item");
        items.forEach(item => item.classList.remove("highlight"));
        if (items[index]) {
            items[index].classList.add("highlight");
            items[index].scrollIntoView({ block: "nearest" });
        }
    }

    input.addEventListener("focus", () => {
        populateDropdown(listId, currencyData, inputId);
        list.style.display = "block";
        highlightedIndex = -1;
    });

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

    input.addEventListener("keydown", (e) => {
        let items = list.querySelectorAll(".dropdown-item");

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (highlightedIndex < items.length - 1) {
                highlightedIndex++;
                highlightItem(highlightedIndex);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (highlightedIndex > 0) {
                highlightedIndex--;
                highlightItem(highlightedIndex);
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && items[highlightedIndex]) {
                items[highlightedIndex].click();
            }
        } else if (e.key === "Tab" && !e.shiftKey && nextInputId) {
            e.preventDefault();
            document.getElementById(nextInputId).focus();
        } else if (e.key === "Tab" && e.shiftKey && nextInputId === null) {
            e.preventDefault();
            document.getElementById("fromCurrencySearch").focus();
        }
    });

    document.addEventListener("click", (event) => {
        if (!input.contains(event.target) && !list.contains(event.target)) {
            list.style.display = "none";
        }
    });
}

function populateDropdown(listId, data, inputId) {
    let list = document.getElementById(listId);
    list.innerHTML = "";

    data.forEach(c => {
        let item = document.createElement("div");
        item.classList.add("dropdown-item");
        item.textContent = `${c.code} - ${c.name}`;
        item.onclick = function() {
            document.getElementById(inputId).value = c.code;
            list.style.display = "none";
        };
        list.appendChild(item);
    });
}

// Initial load
loadCurrencies();

