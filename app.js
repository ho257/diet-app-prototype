const storageKey = "personal-diet-prototype-v1";
const todayIso = new Date().toISOString().slice(0, 10);

const quickFoods = [
  { slot: "아침", name: "그릭요거트와 베리", calories: 310, protein: 22, carbs: 36, fat: 8 },
  { slot: "점심", name: "닭가슴살 샐러드", calories: 430, protein: 42, carbs: 34, fat: 14 },
  { slot: "저녁", name: "연어 구이와 현미밥", calories: 560, protein: 38, carbs: 55, fat: 20 },
  { slot: "간식", name: "프로틴 쉐이크", calories: 190, protein: 25, carbs: 9, fat: 4 }
];

function daysAgo(count) {
  const date = new Date();
  date.setDate(date.getDate() - count);
  return date.toISOString().slice(0, 10);
}

function defaultState() {
  return {
    profile: {
      targetCalories: 1650,
      targetProtein: 95,
      targetCarbs: 175,
      targetFat: 55,
      startWeight: 68.4,
      targetWeight: 62.0
    },
    meals: [
      { id: uid(), date: todayIso, slot: "아침", name: "현미밥과 계란", calories: 420, protein: 24, carbs: 52, fat: 12 },
      { id: uid(), date: todayIso, slot: "점심", name: "닭가슴살 샐러드", calories: 430, protein: 42, carbs: 34, fat: 14 }
    ],
    weights: [
      { id: uid(), date: daysAgo(6), kg: 68.4 },
      { id: uid(), date: daysAgo(5), kg: 68.0 },
      { id: uid(), date: daysAgo(4), kg: 67.7 },
      { id: uid(), date: daysAgo(3), kg: 67.4 },
      { id: uid(), date: daysAgo(2), kg: 67.1 },
      { id: uid(), date: daysAgo(1), kg: 66.9 },
      { id: uid(), date: todayIso, kg: 66.8 }
    ],
    workouts: [
      { id: uid(), date: todayIso, type: "걷기", minutes: 42, calories: 210, source: "Apple Watch" },
      { id: uid(), date: todayIso, type: "근력 운동", minutes: 35, calories: 170, source: "Apple Watch" }
    ]
  };
}

function uid() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadState() {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return defaultState();

  try {
    return JSON.parse(saved);
  } catch {
    return defaultState();
  }
}

function saveState() {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

let state = loadState();

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const numberFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayItems(items) {
  return items.filter((item) => item.date === todayIso);
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function currentWeight() {
  return [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.kg || state.profile.startWeight;
}

function mealTotals() {
  const meals = todayItems(state.meals);
  return {
    calories: sum(meals, "calories"),
    protein: sum(meals, "protein"),
    carbs: sum(meals, "carbs"),
    fat: sum(meals, "fat")
  };
}

function workoutTotals() {
  const workouts = todayItems(state.workouts);
  return {
    minutes: sum(workouts, "minutes"),
    calories: sum(workouts, "calories")
  };
}

function setProgress(id, value, target) {
  const percent = Math.max(0, Math.min(100, (value / target) * 100));
  $(id).style.width = `${percent}%`;
}

function render() {
  const meals = todayItems(state.meals);
  const workouts = todayItems(state.workouts);
  const food = mealTotals();
  const activity = workoutTotals();
  const remaining = state.profile.targetCalories - food.calories + activity.calories;
  const caloriePercent = Math.min(125, Math.round((food.calories / state.profile.targetCalories) * 100));
  const weightNow = currentWeight();
  const kgToGoal = Math.max(0, weightNow - state.profile.targetWeight);

  $("#todayLabel").textContent = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  $("#goalText").textContent = `목표 체중까지 ${oneDecimal.format(kgToGoal)}kg`;
  $("#remainingCalories").textContent = numberFormat.format(remaining);
  $("#intakeCalories").textContent = numberFormat.format(food.calories);
  $("#exerciseCalories").textContent = numberFormat.format(activity.calories);
  $("#currentWeight").textContent = oneDecimal.format(weightNow);
  $("#caloriePercent").textContent = `${caloriePercent}%`;
  $("#calorieRing").style.background = `conic-gradient(var(--green) ${Math.min(caloriePercent, 100) * 3.6}deg, var(--green-soft) 0deg)`;

  $("#carbText").textContent = `${numberFormat.format(food.carbs)}g`;
  $("#proteinText").textContent = `${numberFormat.format(food.protein)}g`;
  $("#fatText").textContent = `${numberFormat.format(food.fat)}g`;
  setProgress("#carbBar", food.carbs, state.profile.targetCarbs);
  setProgress("#proteinBar", food.protein, state.profile.targetProtein);
  setProgress("#fatBar", food.fat, state.profile.targetFat);

  $("#balanceCopy").textContent = buildBalanceCopy(food, activity);
  $("#mealCount").textContent = `${meals.length}개`;
  $("#todayMeals").innerHTML = meals.length ? meals.map((meal) => mealItem(meal, false)).join("") : emptyCopy("아직 기록된 식단이 없습니다.");
  $("#mealLog").innerHTML = meals.length ? meals.map((meal) => mealItem(meal, true)).join("") : emptyCopy("식단을 추가하면 여기에 쌓입니다.");

  $("#startWeight").textContent = oneDecimal.format(state.profile.startWeight);
  $("#targetWeight").textContent = oneDecimal.format(state.profile.targetWeight);
  $("#weightDelta").textContent = `${oneDecimal.format(weightNow - state.profile.startWeight)}kg`;
  $("input[name='weight']").placeholder = oneDecimal.format(weightNow);
  renderWeightChart();

  $("#activityMinutes").textContent = numberFormat.format(activity.minutes);
  $("#activityCalories").textContent = numberFormat.format(activity.calories);
  $("#workoutLog").innerHTML = workouts.length ? workouts.map(workoutItem).join("") : emptyCopy("오늘 운동 기록이 없습니다.");

  renderQuickFoods();
}

function buildBalanceCopy(food, activity) {
  if (food.calories === 0) return "첫 식단을 기록하면 칼로리와 탄단지 균형을 볼 수 있습니다.";
  if (food.protein < state.profile.targetProtein * 0.65) return "단백질이 아직 부족합니다. 다음 식사는 단백질을 먼저 채워보세요.";
  if (food.calories > state.profile.targetCalories) return "목표 섭취량을 넘었습니다. 남은 식사는 가볍게 잡는 편이 좋습니다.";
  if (activity.calories > 250) return "오늘 활동량이 좋아서 감량 흐름이 잘 유지되고 있습니다.";
  return "목표 범위 안에서 안정적으로 기록되고 있습니다.";
}

function emptyCopy(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function mealItem(meal, withDelete) {
  const deleteButton = withDelete
    ? `<button class="delete-button" type="button" data-delete-meal="${meal.id}" title="삭제" aria-label="식단 삭제">×</button>`
    : `<strong>${numberFormat.format(meal.calories)}</strong>`;

  return `
    <article class="log-item">
      <div>
        <h3>${escapeHtml(meal.name)}</h3>
        <p>${escapeHtml(meal.slot)} · ${numberFormat.format(meal.calories)}kcal · 단백질 ${numberFormat.format(meal.protein)}g</p>
      </div>
      ${deleteButton}
    </article>
  `;
}

function workoutItem(workout) {
  return `
    <article class="log-item">
      <div>
        <h3>${escapeHtml(workout.type)}</h3>
        <p>${escapeHtml(workout.source)} · ${numberFormat.format(workout.minutes)}분 · ${numberFormat.format(workout.calories)}kcal</p>
      </div>
      <button class="delete-button" type="button" data-delete-workout="${workout.id}" title="삭제" aria-label="운동 삭제">×</button>
    </article>
  `;
}

function renderQuickFoods() {
  $("#quickFoods").innerHTML = quickFoods
    .map(
      (food) => `
        <button class="quick-button" type="button" data-quick-food="${escapeHtml(food.name)}">
          <strong>${escapeHtml(food.name)}</strong>
          <span>${escapeHtml(food.slot)} · ${numberFormat.format(food.calories)}kcal</span>
        </button>
      `
    )
    .join("");
}

function renderWeightChart() {
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-10);
  const width = 360;
  const height = 190;
  const values = weights.map((item) => Number(item.kg));
  const min = Math.min(...values) - 0.4;
  const max = Math.max(...values) + 0.4;
  const points = weights.map((item, index) => {
    const x = weights.length === 1 ? width / 2 : 28 + (index / (weights.length - 1)) * (width - 56);
    const y = 24 + ((max - item.kg) / (max - min || 1)) * (height - 62);
    return { x, y, ...item };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const labels = points
    .filter((_, index) => index === 0 || index === points.length - 1)
    .map((point) => `<text x="${point.x}" y="${height - 16}" text-anchor="middle">${point.date.slice(5).replace("-", ".")}</text>`)
    .join("");
  const circles = points
    .map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4.2" fill="var(--surface)" stroke="var(--green)" stroke-width="2.2"></circle>`)
    .join("");

  $("#weightChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="최근 체중 변화">
      <path d="${line}" fill="none" stroke="var(--green)" stroke-width="3.2"></path>
      ${circles}
      ${labels}
      <text x="18" y="28">${oneDecimal.format(max - 0.4)}kg</text>
      <text x="18" y="${height - 38}">${oneDecimal.format(min + 0.4)}kg</text>
    </svg>
  `;
}

function switchView(target) {
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.dataset.view === target));
  $$(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.target === target));
  $("main").scrollTo({ top: 0, behavior: "smooth" });
}

function addMeal(food) {
  state.meals.unshift({
    id: uid(),
    date: todayIso,
    slot: food.slot,
    name: food.name.trim(),
    calories: Number(food.calories),
    protein: Number(food.protein),
    carbs: Number(food.carbs),
    fat: Number(food.fat)
  });
  saveState();
  render();
}

$("#mealForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  addMeal(Object.fromEntries(form.entries()));
  event.currentTarget.reset();
});

$("#weightForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const weight = Number(form.get("weight"));
  state.weights.push({ id: uid(), date: todayIso, kg: weight });
  saveState();
  render();
  event.currentTarget.reset();
});

$("#workoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.workouts.unshift({
    id: uid(),
    date: todayIso,
    type: String(form.get("type")),
    minutes: Number(form.get("minutes")),
    calories: Number(form.get("calories")),
    source: "수동"
  });
  saveState();
  render();
  event.currentTarget.reset();
});

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-target]");
  if (tab) switchView(tab.dataset.target);

  const jump = event.target.closest("[data-jump]");
  if (jump) switchView(jump.dataset.jump);

  const mealDelete = event.target.closest("[data-delete-meal]");
  if (mealDelete) {
    state.meals = state.meals.filter((meal) => meal.id !== mealDelete.dataset.deleteMeal);
    saveState();
    render();
  }

  const workoutDelete = event.target.closest("[data-delete-workout]");
  if (workoutDelete) {
    state.workouts = state.workouts.filter((workout) => workout.id !== workoutDelete.dataset.deleteWorkout);
    saveState();
    render();
  }

  const quick = event.target.closest("[data-quick-food]");
  if (quick) {
    const food = quickFoods.find((item) => item.name === quick.dataset.quickFood);
    if (food) addMeal(food);
  }
});

$("#resetButton").addEventListener("click", () => {
  state = defaultState();
  saveState();
  render();
});

render();
