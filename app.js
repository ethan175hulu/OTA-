const STORAGE_KEY = "ota-price-calculator-platforms";
const STORAGE_KEY_ACTIVITIES = "ota-price-calculator-activities";

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

// 携程活动分组配置
const ctripActivityGroups = [
  {
    id: "basic",
    name: "基础促销",
    rule: "bestPick",
    activities: [
      { id: "daily", name: "天天特价", type: "discount", defaultValue: 0.85 },
      { id: "package", name: "套餐价", type: "discount", defaultValue: 0.88 },
      { id: "holiday", name: "节日全覆盖", type: "discount", defaultValue: 0.9 },
      { id: "offpeak", name: "错峰全覆盖", type: "discount", defaultValue: 0.88 },
      { id: "seasonal", name: "时令全覆盖", type: "discount", defaultValue: 0.9 },
      { id: "travel", name: "超级周边游", type: "discount", defaultValue: 0.87 },
      { id: "userscene", name: "用户场景全覆盖", type: "discount", defaultValue: 0.9 },
      { id: "newopen", name: "超级上新日&开业特惠", type: "discount", defaultValue: 0.85 },
    ],
  },
  {
    id: "scene",
    name: "场景促销",
    rule: "bestPick",
    activities: [
      { id: "travel_special", name: "出行特惠", type: "discount", defaultValue: 0.92 },
      { id: "new_guest", name: "门店新客", type: "discount", defaultValue: 0.9 },
      { id: "student", name: "学生专享", type: "discount", defaultValue: 0.88 },
      { id: "longstay", name: "连住特惠", type: "discount", defaultValue: 0.9 },
      { id: "multiroom", name: "多间立减", type: "discount", defaultValue: 0.95 },
      { id: "advance", name: "提前预订", type: "discount", defaultValue: 0.92 },
      { id: "tonight", name: "今夜甩卖", type: "discount", defaultValue: 0.8 },
      { id: "flash", name: "限时抢购", type: "discount", defaultValue: 0.85 },
      { id: "hourly", name: "钟点房促销", type: "discount", defaultValue: 0.9 },
      { id: "yoyo_scan", name: "YOYO卡扫码住", type: "discount", defaultValue: 0.92 },
    ],
  },
  {
    id: "redpacket",
    name: "酒店红包",
    rule: "bestPick",
    activities: [
      { id: "local_red", name: "本地特惠红包", type: "fixed", defaultValue: 20 },
      { id: "retain_red", name: "意向挽留红包", type: "fixed", defaultValue: 15 },
      { id: "gold_red", name: "金蛇聚宝红包", type: "fixed", defaultValue: 25 },
      { id: "yoyo_red", name: "YOYO卡红包", type: "fixed", defaultValue: 10 },
    ],
  },
  {
    id: "recharge",
    name: "充值类促销",
    rule: "bestPick",
    activities: [
      { id: "cashback", name: "动态返现", type: "cashback", defaultValue: 0.05 },
      { id: "smart", name: "智选特惠", type: "discount", defaultValue: 0.95 },
    ],
  },
  {
    id: "vip",
    name: "优享会",
    rule: "vipDiscount",
    activities: [
      { id: "vip95", name: "95折", type: "discount", defaultValue: 0.95 },
      { id: "vip92", name: "92折", type: "discount", defaultValue: 0.92 },
      { id: "vip90", name: "9折", type: "discount", defaultValue: 0.9 },
      { id: "vip88", name: "88折", type: "discount", defaultValue: 0.88 },
      { id: "vip85", name: "85折", type: "discount", defaultValue: 0.85 },
    ],
  },
  {
    id: "points",
    name: "积分联盟",
    rule: "fixedDiscount",
    note: "扣费 = 后台卖价 × 5%，从展示价中扣除",
    activities: [
      { id: "points_all", name: "扣后台卖价×5%", type: "baseFee", defaultValue: 0.05 },
    ],
  },
];

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
let selectedActivities = loadSelectedActivities();
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
  activityConfigLink: document.querySelector("#activityConfigLink"),
};

document.querySelectorAll(".platform-tab").forEach((button) => {
  button.addEventListener("click", () => {
    activePlatform = button.dataset.platform;
    setActiveTabs();
    applyPlatformValues();
    updateActivityConfigLink();
    updateModeFields();
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

function loadSelectedActivities() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES));
    return saved || {};
  } catch (error) {
    return {};
  }
}

function saveSelectedActivities() {
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(selectedActivities));
}

function getActivityValue(activity) {
  if (selectedActivities.activityValues && selectedActivities.activityValues[activity.id] !== undefined) {
    return selectedActivities.activityValues[activity.id];
  }
  return activity.defaultValue;
}

function getActivityDiscountAmount(activity, basePrice) {
  const value = getActivityValue(activity);

  if (activity.type === "discount") {
    return Math.max(0, basePrice * (1 - value));
  }

  if (activity.type === "fixed") {
    return Math.max(0, value);
  }

  if (activity.type === "baseFee") {
    return Math.max(0, basePrice * value);
  }

  return 0;
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

function updateActivityConfigLink() {
  if (elements.activityConfigLink) {
    elements.activityConfigLink.classList.toggle("hidden", activePlatform !== "ctrip");
  }
  // 携程平台综合折扣由活动叠加自动计算，设为只读
  const isCtrip = activePlatform === "ctrip";
  elements.discountRate.readOnly = isCtrip;
  elements.discountRate.classList.toggle("readonly-input", isCtrip);

  const discountLabel = document.querySelector("#discountRateLabel");
  if (discountLabel) {
    discountLabel.textContent = isCtrip ? "综合活动折扣（自动）" : "综合活动折扣";
  }

  if (!isCtrip) {
    // 非携程平台恢复保存的折扣值
    elements.discountRate.value = platforms[activePlatform].discountRate;
  }
}

function applyPlatformValues() {
  const config = platforms[activePlatform];
  elements.basePrice.value = config.basePrice;
  elements.commissionRate.value = config.commissionRate;
  // 携程平台综合折扣由活动叠加计算，不使用保存值
  if (activePlatform !== "ctrip") {
    elements.discountRate.value = config.discountRate;
  }
  syncDerivedInputs();
}

function updateModeFields() {
  const copy = modeCopy[activeMode];
  elements.modeHint.textContent = copy.hint;

  if (activePlatform === "ctrip") {
    elements.formulaText.textContent = "综合折扣 = 活动叠加自动计算（在高级活动配置中设置）";
  } else {
    elements.formulaText.textContent = copy.formula;
  }

  document.querySelectorAll("[data-field]").forEach((field) => {
    field.classList.toggle("hidden", !copy.visibleFields.includes(field.dataset.field));
  });
}

function syncDerivedInputs() {
  // 携程平台由活动叠加计算，不使用简单公式
  if (activePlatform === "ctrip") return;

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
  let result;

  // 携程平台使用活动叠加计算
  if (activePlatform === "ctrip") {
    result = calculateCtripWithActivities();
  } else {
    result = calculate();
  }

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
    chain: null,
  };
}

function calculateCtripWithActivities() {
  const commissionRate = readNumber(elements.commissionRate) / 100;
  let basePrice = readNumber(elements.basePrice);
  let displayPrice = readNumber(elements.displayPrice);
  let income = readNumber(elements.targetIncome);

  if (commissionRate >= 1) {
    return null;
  }

  // 根据模式确定起始价格
  // 先用平台默认折扣反推近似卖价，活动叠加会在后续修正
  const fallbackDiscount = platforms.ctrip.discountRate || 0.85;

  if (activeMode === "forward") {
    // 正推：从后台卖价开始
  } else if (activeMode === "targetDisplay") {
    const discountRate = readNumber(elements.discountRate) || fallbackDiscount;
    basePrice = displayPrice / discountRate;
  } else if (activeMode === "targetIncome") {
    const discountRate = readNumber(elements.discountRate) || fallbackDiscount;
    if (commissionRate >= 1) return null;
    displayPrice = income / (1 - commissionRate);
    basePrice = displayPrice / discountRate;
  }

  // 携程活动按优惠点数/金额叠加，不按折后价连续相乘。
  let totalDiscountAmount = 0;
  let currentPrice = basePrice;
  const chain = [{ step: "后台卖价", price: currentPrice, activity: null, rate: 1 }];

  // 获取当前平台的活动选择
  const platformActivities = selectedActivities.ctrip || {};

  // 按顺序应用各分组
  for (const group of ctripActivityGroups) {
    const selected = platformActivities[group.id];
    if (!selected) {
      chain.push({ step: group.name, activity: null, price: currentPrice });
      continue;
    }

    let activity;

    if (group.rule === "bestPick") {
      // 自动择优：组内只取优惠金额最大的一项，组间再叠加。
      let bestDiscountAmount = -1;
      for (const a of group.activities) {
        if (a.type === "cashback") continue;
        const discountAmount = getActivityDiscountAmount(a, basePrice);
        if (discountAmount > bestDiscountAmount) {
          bestDiscountAmount = discountAmount;
          activity = a;
        }
      }
    } else {
      // 手动选择
      if (selected === true) continue;
      activity = group.activities.find((a) => a.id === selected);
    }

    if (activity) {
      const activityValue = getActivityValue(activity);
      const discountAmount = getActivityDiscountAmount(activity, basePrice);

      if (activity.type === "cashback") {
        chain.push({
          step: group.name,
          activity: activity.name,
          price: currentPrice,
          note: `后返 ${formatPercent(activityValue)}`,
          rate: basePrice > 0 ? currentPrice / basePrice : 0,
          isCashback: true,
        });
        continue;
      }

      totalDiscountAmount = Math.min(basePrice, totalDiscountAmount + discountAmount);
      currentPrice = Math.max(0, basePrice - totalDiscountAmount);

      chain.push({
        step: group.name,
        activity: activity.name,
        price: currentPrice,
        rate: basePrice > 0 ? currentPrice / basePrice : 0,
        discount: activity.type === "discount" ? 1 - activityValue : null,
        fixed: activity.type === "fixed" ? activityValue : null,
        baseFee: activity.type === "baseFee" ? activityValue : null,
        discountAmount,
      });
    } else {
      chain.push({
        step: group.name,
        activity: null,
        price: currentPrice,
        rate: basePrice > 0 ? currentPrice / basePrice : 0,
      });
    }
  }

  const displayPriceFinal = currentPrice;
  const commission = displayPriceFinal * commissionRate;
  const incomeFinal = displayPriceFinal - commission;
  const effectiveRate = basePrice > 0 ? displayPriceFinal / basePrice : 0;

  // 同步综合折扣到输入框
  elements.discountRate.value = effectiveRate.toFixed(2);

  return {
    basePrice,
    displayPrice: displayPriceFinal,
    commission,
    income: incomeFinal,
    chain,
    effectiveRate,
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

  // 渲染计算链路
  renderCalculationChain(result.chain);
}

function renderEmpty(title, detail) {
  elements.resultBasePrice.textContent = "-";
  elements.resultDisplayPrice.textContent = "-";
  elements.resultCommission.textContent = "-";
  elements.resultIncome.textContent = "-";
  renderCalculationChain(null);
}

function renderCalculationChain(chain) {
  const chainContainer = document.querySelector("#calculationChain");
  if (!chainContainer) return;

  const visibleSteps = chain ? chain.filter((step, index) => index === 0 || step.activity) : [];

  if (!visibleSteps || visibleSteps.length <= 1) {
    chainContainer.innerHTML = "";
    chainContainer.classList.add("hidden");
    return;
  }

  chainContainer.classList.remove("hidden");
  let html = '<div class="chain-title">计算链路</div>';

  for (let i = 0; i < visibleSteps.length; i++) {
    const step = visibleSteps[i];
    const isLast = i === visibleSteps.length - 1;
    const isFirst = i === 0;

    html += '<div class="chain-step">';
    html += `<div class="chain-label">${step.step}</div>`;

    if (step.activity) {
      html += `<div class="chain-activity">${step.activity}`;
      if (step.discount) {
        html += ` <span class="chain-badge chain-discount">减${formatPercent(step.discount)}点</span>`;
      }
      if (step.fixed) {
        html += ` <span class="chain-badge chain-fixed">-¥${step.fixed}</span>`;
      }
      if (step.baseFee) {
        html += ` <span class="chain-badge chain-fixed">减${formatPercent(step.baseFee)}点</span>`;
      }
      if (step.note) {
        html += ` <span class="chain-badge chain-note">${step.note}</span>`;
      }
      if (step.rate !== undefined) {
        html += ` <span class="chain-badge chain-rate">累计${formatPercent(step.rate)}</span>`;
      }
      html += "</div>";
    } else if (!isFirst) {
      html += '<div class="chain-activity chain-empty">未选择</div>';
    } else {
      html += '<div class="chain-activity">起始价格</div>';
    }

    html += `<div class="chain-price">${formatMoney(step.price)}</div>`;
    html += "</div>";

    if (!isLast) {
      html += '<div class="chain-arrow">↓</div>';
    }
  }

  chainContainer.innerHTML = html;
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
      updateActivityConfigLink();
      updateModeFields();
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

function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function toInputValue(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "";
}

setActiveTabs();
applyPlatformValues();
updateModeFields();
renderConfigTable();
updateActivityConfigLink();
calculateAndRender();
