const STORAGE_KEY_ACTIVITIES = "ota-price-calculator-activities";
const STORAGE_KEY_PLATFORMS = "ota-price-calculator-platforms";

const ctripActivityGroups = [
  {
    id: "basic",
    name: "分组一：基础促销",
    rule: "bestPick",
    note: "组内择优，取折扣最低的一项生效",
    activities: [
      { id: "daily", name: "天天特价", type: "discount", defaultValue: 0.85 },
      { id: "package", name: "套餐价", type: "discount", defaultValue: 0.88 },
      { id: "holiday", name: "节日全覆盖", type: "discount", defaultValue: 0.90 },
      { id: "offpeak", name: "错峰全覆盖", type: "discount", defaultValue: 0.88 },
      { id: "seasonal", name: "时令全覆盖", type: "discount", defaultValue: 0.90 },
      { id: "travel", name: "超级周边游", type: "discount", defaultValue: 0.87 },
      { id: "userscene", name: "用户场景全覆盖", type: "discount", defaultValue: 0.90 },
      { id: "newopen", name: "超级上新日&开业特惠", type: "discount", defaultValue: 0.85 },
    ],
  },
  {
    id: "scene",
    name: "分组二：场景促销",
    rule: "bestPick",
    note: "组内择优，取折扣最低的一项生效",
    activities: [
      { id: "travel_special", name: "出行特惠", type: "discount", defaultValue: 0.92 },
      { id: "new_guest", name: "门店新客", type: "discount", defaultValue: 0.90 },
      { id: "student", name: "学生专享", type: "discount", defaultValue: 0.88 },
      { id: "longstay", name: "连住特惠", type: "discount", defaultValue: 0.90 },
      { id: "multiroom", name: "多间立减", type: "discount", defaultValue: 0.95 },
      { id: "advance", name: "提前预订", type: "discount", defaultValue: 0.92 },
      { id: "tonight", name: "今夜甩卖", type: "discount", defaultValue: 0.80 },
      { id: "flash", name: "限时抢购", type: "discount", defaultValue: 0.85 },
      { id: "hourly", name: "钟点房促销", type: "discount", defaultValue: 0.90 },
      { id: "yoyo_scan", name: "YOYO卡扫码住", type: "discount", defaultValue: 0.92 },
    ],
  },
  {
    id: "redpacket",
    name: "分组三：酒店红包",
    rule: "bestPick",
    note: "组内择优，取立减金额最大的一项生效",
    activities: [
      { id: "local_red", name: "本地特惠红包", type: "fixed", defaultValue: 20 },
      { id: "retain_red", name: "意向挽留红包", type: "fixed", defaultValue: 15 },
      { id: "gold_red", name: "金蛇聚宝红包", type: "fixed", defaultValue: 25 },
      { id: "yoyo_red", name: "YOYO卡红包", type: "fixed", defaultValue: 10 },
    ],
  },
  {
    id: "recharge",
    name: "分组四：充值类促销",
    rule: "bestPick",
    note: "组内择优",
    activities: [
      { id: "cashback", name: "动态返现", type: "cashback", defaultValue: 0.05 },
      { id: "smart", name: "智选特惠", type: "discount", defaultValue: 0.95 },
    ],
  },
  {
    id: "vip",
    name: "分组五：优享会",
    rule: "vipDiscount",
    note: "按会员等级选择对应折扣",
    activities: [
      { id: "vip95", name: "95折", type: "discount", defaultValue: 0.95 },
      { id: "vip92", name: "92折", type: "discount", defaultValue: 0.92 },
      { id: "vip90", name: "9折", type: "discount", defaultValue: 0.90 },
      { id: "vip88", name: "88折", type: "discount", defaultValue: 0.88 },
      { id: "vip85", name: "85折", type: "discount", defaultValue: 0.85 },
    ],
  },
  {
    id: "points",
    name: "分组六：积分联盟",
    rule: "fixedDiscount",
    note: "扣费 = 后台卖价 × 设置比例，从展示价中扣除",
    activities: [
      { id: "points_all", name: "扣后台卖价", type: "baseFee", defaultValue: 0.05 },
    ],
  },
];

// 默认平台配置（用于获取默认 basePrice 计算示例）
const defaultPlatforms = {
  ctrip: { basePrice: 238, discountRate: 0.85, commissionRate: 12 },
  meituan: { basePrice: 228, discountRate: 0.88, commissionRate: 10 },
  fliggy: { basePrice: 218, discountRate: 0.90, commissionRate: 8 },
};

let selectedActivities = loadSelectedActivities();
const groupsContainer = document.querySelector("#groupsContainer");
const effectiveRateEl = document.querySelector("#effectiveRate");
const effectiveDetailEl = document.querySelector("#effectiveDetail");

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

function loadBasePrice() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_PLATFORMS));
    if (saved && saved.ctrip && saved.ctrip.basePrice) {
      return saved.ctrip.basePrice;
    }
  } catch (e) {}
  return defaultPlatforms.ctrip.basePrice;
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

function setActivityValue(activityId, value) {
  if (!selectedActivities.activityValues) {
    selectedActivities.activityValues = {};
  }
  selectedActivities.activityValues[activityId] = value;
  saveSelectedActivities();
}

function formatPercent(value) {
  return `${(value * 100).toFixed(0)}%`;
}

function getRuleLabel(rule) {
  if (rule === "bestPick") return "组内自动择优";
  if (rule === "vipDiscount") return "会员折扣";
  return "固定折扣";
}

function computeBestActivity(group, basePrice) {
  // 携程组内择优：取对后台卖价优惠金额最大的一项。
  let bestId = null;
  let bestDiscountAmount = -1;

  for (const activity of group.activities) {
    if (activity.type === "cashback") continue; // 返现不影响展示价，不参与择优

    const discountAmount = getActivityDiscountAmount(activity, basePrice);
    if (discountAmount > bestDiscountAmount) {
      bestDiscountAmount = discountAmount;
      bestId = activity.id;
    }
  }

  return bestId;
}

function computeEffectiveRate() {
  const platformActivities = selectedActivities.ctrip || {};
  const basePrice = loadBasePrice();
  let totalDiscountAmount = 0;

  for (const group of ctripActivityGroups) {
    const selected = platformActivities[group.id];
    if (!selected) continue;

    let activity;

    if (group.rule === "bestPick") {
      // 自动择优：计算最优活动
      const bestId = computeBestActivity(group, basePrice);
      if (!bestId) continue;
      activity = group.activities.find((a) => a.id === bestId);
    } else {
      // 手动选择
      if (selected === true) continue;
      activity = group.activities.find((a) => a.id === selected);
    }

    if (!activity) continue;

    const value = getActivityValue(activity);

    if (activity.type === "discount") {
      totalDiscountAmount += basePrice * (1 - value);
    } else if (activity.type === "fixed") {
      totalDiscountAmount += value;
    } else if (activity.type === "cashback") {
      // 返现不影响展示价
    } else if (activity.type === "baseFee") {
      totalDiscountAmount += basePrice * value;
    }
  }

  const finalPrice = Math.max(0, basePrice - Math.min(basePrice, totalDiscountAmount));
  return finalPrice / basePrice;
}

function renderEffectiveRate() {
  let rate;
  let basePrice;
  let finalPrice;

  try {
    rate = computeEffectiveRate();
    basePrice = loadBasePrice();
    finalPrice = Math.round(basePrice * rate);
  } catch (error) {
    if (effectiveRateEl) {
      effectiveRateEl.textContent = "计算异常";
    }
    if (effectiveDetailEl) {
      effectiveDetailEl.textContent = error.message;
    }
    return;
  }

  if (effectiveRateEl) {
    effectiveRateEl.textContent = `${(rate * 100).toFixed(0)}%`;
  }
  if (effectiveDetailEl) {
    effectiveDetailEl.textContent = `示例：卖价 ¥${basePrice} → 叠加后 ¥${finalPrice}`;
  }
}

function render() {
  const platformActivities = selectedActivities.ctrip || {};
  const basePrice = loadBasePrice();
  let html = "";

  for (const group of ctripActivityGroups) {
    const selected = platformActivities[group.id];
    const isBestPick = group.rule === "bestPick";
    const isParticipating = isBestPick ? (selected === true) : (!!selected);
    const bestId = isBestPick ? computeBestActivity(group, basePrice) : null;

    html += `<div class="activity-group" data-group="${group.id}" data-rule="${group.rule}">`;
    html += `<div class="group-header">
      <div class="group-name">${group.name}</div>
      <div class="group-rule">${getRuleLabel(group.rule)}</div>
    </div>`;

    if (group.note) {
      html += `<div class="group-note">${group.note}</div>`;
    }

    html += '<div class="group-activities">';

    // "无" 选项
    html += `
      <label class="activity-item none-item ${!isParticipating ? "is-selected" : ""}" data-group="${group.id}" data-activity="">
        <input type="radio" name="activity_${group.id}" value="" ${!isParticipating ? "checked" : ""}>
        <span class="activity-name">无</span>
        <span class="activity-value">不参与</span>
      </label>
    `;

    for (const activity of group.activities) {
      const currentValue = getActivityValue(activity);
      const isBest = isBestPick && isParticipating && activity.id === bestId;
      let inputHtml = "";

      if (activity.type === "discount" || activity.type === "cashback" || activity.type === "baseFee") {
        inputHtml = `<input class="activity-discount-input" type="number" min="1" max="99" step="1" value="${(currentValue * 100).toFixed(0)}" data-activity="${activity.id}" data-type="percent">`;
      } else if (activity.type === "fixed") {
        inputHtml = `<input class="activity-discount-input" type="number" min="1" step="1" value="${currentValue}" data-activity="${activity.id}" data-type="number">`;
      }

      let itemClass = "activity-item";
      if (isBest) {
        itemClass += " is-best";
      } else if (!isBestPick && selected === activity.id) {
        itemClass += " is-selected";
      }

      html += `
        <label class="${itemClass}" data-group="${group.id}" data-activity="${activity.id}">
          <input type="radio" name="activity_${group.id}" value="${activity.id}" ${(!isBestPick && selected === activity.id) ? "checked" : ""}>
          <span class="activity-name">${activity.name}${isBest ? ' <span class="best-badge">最优</span>' : ''}</span>
          <span class="activity-value-wrap">${inputHtml}<span class="activity-unit">${activity.type === "fixed" ? "元" : "%"}</span></span>
        </label>
      `;
    }

    html += "</div></div>";
  }

  groupsContainer.innerHTML = html;
  renderEffectiveRate();

  // 事件监听：选择活动
  groupsContainer.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      const groupEl = e.target.closest(".activity-group");
      const groupId = groupEl.dataset.group;
      const rule = groupEl.dataset.rule;
      const activityId = e.target.value || null;

      if (!selectedActivities.ctrip) {
        selectedActivities.ctrip = {};
      }

      if (!activityId) {
        delete selectedActivities.ctrip[groupId];
      } else if (rule === "bestPick") {
        // bestPick 分组：参与即自动择优，存储 true
        selectedActivities.ctrip[groupId] = true;
      } else {
        selectedActivities.ctrip[groupId] = activityId;
      }

      saveSelectedActivities();
      render();
      renderEffectiveRate();
    });
  });

  // 事件监听：自定义折扣输入
  groupsContainer.querySelectorAll(".activity-discount-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      const activityId = e.target.dataset.activity;
      const type = e.target.dataset.type;
      let value = parseFloat(e.target.value);

      if (isNaN(value) || value <= 0) return;

      if (type === "percent") {
        value = value / 100;
      }

      setActivityValue(activityId, value);
      renderEffectiveRate();
    });

    input.addEventListener("change", () => {
      render();
      renderEffectiveRate();
    });

    input.addEventListener("blur", () => {
      render();
      renderEffectiveRate();
    });

    input.addEventListener("click", (e) => {
      e.stopPropagation();

      // 点击输入框时激活该分组
      const groupEl = e.target.closest(".activity-group");
      const groupId = groupEl.dataset.group;
      const rule = groupEl.dataset.rule;

      if (!selectedActivities.ctrip) {
        selectedActivities.ctrip = {};
      }

      if (rule === "bestPick") {
        selectedActivities.ctrip[groupId] = true;
      } else {
        selectedActivities.ctrip[groupId] = e.target.dataset.activity;
      }

      saveSelectedActivities();
      renderEffectiveRate();
    });
  });

  renderEffectiveRate();
}

render();
