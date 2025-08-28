let currencyData = [];

const themeIcon = document.getElementById("themeIcon");
const lightIcon = "light-mode.png"; // your light icon path
const darkIcon = "night-mode.png";   // your dark icon path
const API_BASE = "/api"; // proxy


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
    const toInput   = document.getElementById("toCurrencySearch");
    const swapBtn   = document.querySelector(".swap-btn");

    // rotate the arrow (toggle 0° <-> 180°)
    swapBtn.classList.toggle("rotate");

    // swap the input values
    const tmp = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = tmp;

    document.getElementById("fromCurrencyList").style.display = "none";
    document.getElementById("toCurrencyList").style.display   = "none";
}



async function loadCurrencies() {
    try {
        let res = await fetch(`${API_BASE}/currencies`);
        currencyData = await res.json();

        setupDropdown("fromCurrencySearch", "fromCurrencyList", "toCurrencySearch");
        setupDropdown("toCurrencySearch", "toCurrencyList", null);

    } catch (error) {
        alert("Failed to load currencies. Please check backend.");
        console.error(error);
    }
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

async function convertCurrency() {
    let from = document.getElementById("fromCurrencySearch").value;
    let to = document.getElementById("toCurrencySearch").value;
    let amount = document.getElementById("amount").value;

    if (!from || !to) {
        alert("Please select both currencies.");
        return;
    }
    if (amount <= 0) {
        alert("Please enter a valid amount greater than zero.");
        return;
    }

    try {
        let res = await fetch(`${API_BASE}/convert?from=${from}&to=${to}&amount=${amount}`);
        let data = await res.json();

        document.getElementById("result").innerText =
            `${amount} ${from} = ${data.convertedAmount.toFixed(2)} ${to} (Rate: ${data.rate})`;
    } catch (error) {
        alert("Failed to fetch conversion. Please try again.");
        console.error(error);
    }
}

loadCurrencies();


