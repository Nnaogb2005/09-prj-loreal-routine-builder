/* ================================
   DOM ELEMENTS
================================ */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const searchInput = document.getElementById("searchInput");
const rtlButton = document.getElementById("toggleRTL");

rtlButton.addEventListener("click", () => {
  const isRTL = document.body.getAttribute("dir") === "rtl";

  if (isRTL) {
    document.body.setAttribute("dir", "ltr");
    document.body.classList.remove("rtl");
  } else {
    document.body.setAttribute("dir", "rtl");
    document.body.classList.add("rtl");
  }
});

/* ================================
   GLOBAL STATE
================================ */
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selected")) || [];

let visibleCount = 6;
let currentProducts = [];

/* ================================
   SYSTEM PROMPT
================================ */
const systemPrompt = `
You are a professional L'Oréal beauty assistant.

You help users with:
- Skincare routines
- Makeup recommendations
- Haircare advice
- Product suggestions

When products are provided:
- Build a clear routine (AM/PM if relevant)
- Use ONLY the provided products
- Explain briefly what each product does

Rules:
- ONLY answer beauty-related questions
- If unrelated, politely refuse
- Be friendly and helpful
`;

let chatHistory = [{ role: "system", content: systemPrompt }];

/* ================================
   INIT UI
================================ */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category or search to view products
  </div>
`;

/* ================================
   LOAD PRODUCTS
================================ */
async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    allProducts = data.products;
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

/* ================================
   DISPLAY PRODUCTS
================================ */
function displayProducts(products) {
  currentProducts = products;

  if (!products || products.length === 0) {
    productsContainer.innerHTML = `<p>No products found.</p>`;
    return;
  }

  const visibleProducts = products.slice(0, visibleCount);

  productsContainer.innerHTML = visibleProducts
    .map(
      (product) => `
      <div class="product-card ${isSelected(product.id) ? "selected" : ""}" 
           onclick="toggleProduct(${product.id})">

        <img src="${product.image}" alt="${product.name}">

        <div class="product-info">
          <h3>${product.name}</h3>
          <p>${product.brand}</p>

          <div class="description">
            ${product.description}
          </div>
        </div>
      </div>
    `,
    )
    .join("");

  renderShowMoreButton(products.length);
}

/* ================================
   SHOW MORE BUTTON
================================ */
function renderShowMoreButton(total) {
  const existingBtn = document.getElementById("showMoreBtn");
  if (existingBtn) existingBtn.remove();

  if (visibleCount >= total) return;

  const btn = document.createElement("button");
  btn.id = "showMoreBtn";
  btn.textContent = "Show More Products";

  btn.onclick = () => {
    visibleCount += 6;
    displayProducts(currentProducts);
  };

  productsContainer.after(btn);
}

/* ================================
   FILTER SYSTEM (CATEGORY + SEARCH)
================================ */
function applyFilters() {
  const category = categoryFilter.value;
  const searchText = searchInput.value.toLowerCase().trim();

  let filtered = allProducts;

  // Category filter
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  // Search filter
  if (searchText) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchText) ||
        p.brand.toLowerCase().includes(searchText) ||
        p.description.toLowerCase().includes(searchText),
    );
  }

  visibleCount = 6;
  displayProducts(filtered);
}

/* ================================
   EVENTS
================================ */
categoryFilter.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

/* ================================
   PRODUCT SELECTION
================================ */
function isSelected(id) {
  return selectedProducts.some((p) => p.id === id);
}

function toggleProduct(id) {
  const product = allProducts.find((p) => p.id === id);

  if (isSelected(id)) {
    selectedProducts = selectedProducts.filter((p) => p.id !== id);
  } else {
    selectedProducts.push(product);
  }

  localStorage.setItem("selected", JSON.stringify(selectedProducts));

  displayProducts(currentProducts);
  displaySelectedProducts();
}

/* ================================
   SELECTED PRODUCTS UI
================================ */
function displaySelectedProducts() {
  const list = document.getElementById("selectedProductsList");

  if (selectedProducts.length === 0) {
    list.innerHTML = "<p>No products selected</p>";
    return;
  }

  list.innerHTML = selectedProducts
    .map(
      (p) => `
      <p onclick="removeProduct(${p.id})">
        ${p.name} ❌
      </p>
    `,
    )
    .join("");
}

function removeProduct(id) {
  selectedProducts = selectedProducts.filter((p) => p.id !== id);

  localStorage.setItem("selected", JSON.stringify(selectedProducts));

  displayProducts(currentProducts);
  displaySelectedProducts();
}

/* ================================
   CLEAR ALL
================================ */
function clearAll() {
  selectedProducts = [];
  localStorage.removeItem("selected");

  displayProducts(currentProducts);
  displaySelectedProducts();
}

/* ================================
   GENERATE ROUTINE (AI)
================================ */
document
  .getElementById("generateRoutine")
  .addEventListener("click", async () => {
    if (selectedProducts.length === 0) {
      chatWindow.innerHTML += `<p class="bot-message">Please select products first.</p>`;
      return;
    }

    const routinePrompt = `
Create a personalized beauty routine using these products:

${JSON.stringify(selectedProducts, null, 2)}
`;

    chatWindow.innerHTML += `<p class="user-message">Generate my routine</p>`;

    chatHistory.push({ role: "user", content: routinePrompt });

    try {
      const response = await fetch(
        "https://fancy-chat-bot.hy3253.workers.dev",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatHistory }),
        },
      );

      const data = await response.json();
      const reply = data.reply || data.choices?.[0]?.message?.content;

      const botMsg = document.createElement("p");
      botMsg.className = "bot-message";
      botMsg.textContent = reply;

      chatWindow.appendChild(botMsg);

      chatHistory.push({ role: "assistant", content: reply });
    } catch (error) {
      console.error(error);

      chatWindow.innerHTML += `<p class="bot-message">Error generating routine.</p>`;
    }
  });

/* ================================
   CHAT SYSTEM
================================ */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  const userMsg = document.createElement("p");
  userMsg.className = "user-message";
  userMsg.textContent = text;

  chatWindow.appendChild(userMsg);
  chatHistory.push({ role: "user", content: text });

  userInput.value = "";

  try {
    const response = await fetch("https://fancy-chat-bot.hy3253.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
    });

    const data = await response.json();
    const reply = data.reply || data.choices?.[0]?.message?.content;

    const botMsg = document.createElement("p");
    botMsg.className = "bot-message";
    botMsg.textContent = reply;

    chatWindow.appendChild(botMsg);

    chatHistory.push({ role: "assistant", content: reply });
  } catch (error) {
    console.error(error);

    chatWindow.innerHTML += `<p class="bot-message">Error connecting to chatbot.</p>`;
  }
});

/* ================================
   INIT
================================ */
window.addEventListener("load", async () => {
  await loadProducts();
  displaySelectedProducts();
});
