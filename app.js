const STORAGE_KEY = "ota-price-calculator-platforms";

const defaultPlatforms = {
  ctrip: {
    name: "携程",
    basePrice: 238,
    discountRate: 0.85,
    commissionRate: 12,
  },
  meituan: {
    name: "美团",
    basePrice: 228,
    discountRate: 0.88,
    commissionRate: 10,
  },
  fliggy: {
    name: "飞猪",
    basePrice: 218,
    discountRate: 0.9,
    commissionRate: 8,
  },
};

const modeCopy = {
  forward: {
    hint: "已知后台卖价，计算外网价和到手收入。",
    formula: "外网价 = 后台卖价 × 综合活动折扣",
    visibleFields: ["basePrice"],
  },
  targetDisplay: {
    hint: "已知目标外网价，倒推出后台应该录入的卖价。",
    formula: "后台卖价 = 目标外网价 ÷ 综合活动折扣",
    visibleFields: ["displayPrice"],
  },
  targetIncome: {
    hint: "已知希望酒店收到的金额，先按佣金反推外网价，再倒推后台卖价。",
    formula: "外网价 = 希望到手金额 ÷ (1 - 佣金比例)",
    visibleFields: ["targetIncome"],
  },
};

let platforms = loadPlatforms();
let activePlatform = "ctrip";
let activeMode = "forward";

const elements = {
  form: document.querySelector("#calculatorForm"),
  modeHint: document.querySelector("#modeHint"),
  formulaText: document.querySelector("#formulaText"),
  basePrice: document.querySelector("#basePrice"),
  displayPrice: document.querySelector("#displayPrice"),
  targetIncome: document.querySelector("#targetIncome"),
  discountRate: document.querySelector("#discountRate"),
  commissionRate: document.querySelector("#commissionRate"),
  resultBasePrice: document.querySelector("#resultBasePrice"),
  resultDisplayPrice: document.querySelector("#resultDisplayPrice"),
  resultCommission: document.querySelector("#resultCommission"),
  resultIncome: document.querySelector("#resultIncome"),
  configTable: document.querySelector("#configTable"),
  savePlatformButton: document.querySelector("#savePlatformButton"),
  resetButton: document.querySelector("#resetButton"),
};

document.querySelectorAll(".platform-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activePlatform = button.dataset.platform;
    setActiveTabs();
    applyPlatformValues();
    calculateAndRender();
  });
});

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => {
    const previousResult = calculate();
    activeMode = button.dataset.mode;
    seedModeInputs(previousResult);
    setActiveTabs();
    updateModeFields();
    calculateAndRender();
  });
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateAndRender();
});

[
  elements.basePrice,
  elements.displayPrice,
  elements.targetIncome,
  elements.discountRate,
  elements.commissionRate,
].forEach((input) => {
  input.addEventListener("input", calculateAndRender);
});

elements.savePlatformButton.addEventListener("click", () => {
  const result = calculate();
  platforms[activePlatform] = {
    ...platforms[activePlatform],
    basePrice: result ? result.basePrice : readNumber(elements.basePrice),
    discountRate: readNumber(elements.discountRate),
    commissionRate: readNumber(elements.commissionRate),
  };
  savePlatforms();
  renderConfigTable();
  calculateAndRender();
});

elements.resetButton.addEventListener("click", () => {
  platforms = clonePlatforms(defaultPlatforms);
  savePlatforms();
  applyPlatformValues();
  renderConfigTable();
  calculateAndRender();
});

function loadPlatforms() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? mergePlatforms(saved) : clonePlatforms(defaultPlatforms);
  } catch (error) {
    return clonePlatforms(defaultPlatforms);
  }
}

function mergePlatforms(saved) {
  return Object.fromEntries(
    Object.entries(defaultPlatforms).map(([key, defaults]) => [
      key,
      { ...defaults, ...(saved[key] || {}) },
    ]),
  );
}

function clonePlatforms(source) {
  return JSON.parse(JSON.stringify(source));
}

function savePlatforms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
}

function setActiveTabs() {
  document.querySelectorAll(".platform-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.platform === activePlatform);
  });

  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === activeMode);
  });
}

function applyPlatformValues() {
  const config = platforms[activePlatform];
  elements.basePrice.value = config.basePrice;
  elements.discountRate.value = config.discountRate;
  elements.commissionRate.value = config.commissionRate;
  syncDerivedInputs();
}

function updateModeFields() {
  const copy = modeCopy[activeMode];
  elements.modeHint.textContent = copy.hint;
  elements.formulaText.textContent = copy.formula;

  document.querySelectorAll("[data-field]").forEach((field) => {
    field.classList.toggle("hidden", !copy.visibleFields.includes(field.dataset.field));
  });
}

function syncDerivedInputs() {
  const basePrice = readNumber(elements.basePrice);
  const discountRate = readNumber(elements.discountRate);
  const commissionRate = readNumber(elements.commissionRate) / 100;

  if (discountRate <= 0 || commissionRate >= 1) {
    return;
  }

  const displayPrice = basePrice * discountRate;
  const income = displayPrice * (1 - commissionRate);
  elements.displayPrice.value = toInputValue(displayPrice);
  elements.targetIncome.value = toInputValue(income);
}

function seedModeInputs(result) {
  if (!result) {
    return;
  }

  if (activeMode === "forward") {
    elements.basePrice.value = toInputValue(result.basePrice);
  }

  if (activeMode === "targetDisplay") {
    elements.displayPrice.value = toInputValue(result.displayPrice);
  }

  if (activeMode === "targetIncome") {
    elements.targetIncome.value = toInputValue(result.income);
  }
}

function calculateAndRender() {
  const result = calculate();
  renderResult(result);
}

function calculate() {
  const discountRate = readNumber(elements.discountRate);
  const commissionRate = readNumber(elements.commissionRate) / 100;

  if (discountRate <= 0 || commissionRate >= 1) {
    return null;
  }

  let basePrice = readNumber(elements.basePrice);
  let displayPrice = readNumber(elements.displayPrice);
  let income = readNumber(elements.targetIncome);

  if (activeMode === "forward") {
    displayPrice = basePrice * discountRate;
    income = displayPrice * (1 - commissionRate);
  }

  if (activeMode === "targetDisplay") {
    basePrice = displayPrice / discountRate;
    income = displayPrice * (1 - commissionRate);
  }

  if (activeMode === "targetIncome") {
    displayPrice = income / (1 - commissionRate);
    basePrice = displayPrice / discountRate;
  }

  const commission = displayPrice * commissionRate;

  return {
    basePrice,
    displayPrice,
    commission,
    income,
  };
}

function renderResult(result) {
  if (!result || !Number.isFinite(result.basePrice)) {
    renderEmpty("参数需要检查", "折扣必须大于 0，佣金比例必须小于 100%。");
    return;
  }

  elements.resultBasePrice.textContent = formatMoney(result.basePrice);
  elements.resultDisplayPrice.textContent = formatMoney(result.displayPrice);
  elements.resultCommission.textContent = formatMoney(result.commission);
  elements.resultIncome.textContent = formatMoney(result.income);
}

function renderEmpty(title, detail) {
  elements.resultBasePrice.textContent = "-";
  elements.resultDisplayPrice.textContent = "-";
  elements.resultCommission.textContent = "-";
  elements.resultIncome.textContent = "-";
}

function renderConfigTable() {
  elements.configTable.innerHTML = "";

  Object.entries(platforms).forEach(([key, config]) => {
    const row = document.createElement("div");
    row.className = "config-row";
    row.innerHTML = `
      <div>
        <div class="config-name">${config.name}</div>
        <div class="config-meta">当前默认参数</div>
      </div>
      <div>折扣 ${formatRate(config.discountRate)}</div>
      <div>佣金 ${config.commissionRate}%</div>
    `;
    row.addEventListener("click", () => {
      activePlatform = key;
      setActiveTabs();
      applyPlatformValues();
      calculateAndRender();
    });
    elements.configTable.appendChild(row);
  });
}

function readNumber(input) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return String(Math.round(value));
}

function formatRate(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function toInputValue(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

setActiveTabs();
applyPlatformValues();
updateModeFields();
renderConfigTable();
calculateAndRender();
