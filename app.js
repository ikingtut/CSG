const state = {
  monitoring: false,
  childPresent: false,
  carLocked: false,
  engineOff: false,
  motionDetected: false,
  breathDetected: false,
  countdown: 0,
  alertTriggered: false,
};

const monitoringStateEl = document.getElementById("monitoringState");
const riskStateEl = document.getElementById("riskState");
const countdownEl = document.getElementById("countdown");
const alertBoxEl = document.getElementById("alertBox");
const warningLightEl = document.getElementById("warningLight");
const eventLogEl = document.getElementById("eventLog");
const childPresentEl = document.getElementById("childPresent");
const carLockedEl = document.getElementById("carLocked");
const engineOffEl = document.getElementById("engineOff");
const motionDetectedEl = document.getElementById("motionDetected");
const breathDetectedEl = document.getElementById("breathDetected");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const demoBtn = document.getElementById("demoBtn");
const panicButtons = document.querySelectorAll(".panic-btn");

let audioContext = null;
let alarmIntervalId = null;

function logEvent(message) {
  const item = document.createElement("li");
  item.textContent = message;
  eventLogEl.prepend(item);
}

function updateLightState() {
  warningLightEl.classList.remove("warning", "alert");

  if (state.alertTriggered) {
    warningLightEl.classList.add("alert");
  } else if (state.monitoring && state.childPresent && state.carLocked && state.engineOff) {
    warningLightEl.classList.add("warning");
  }
}

function stopAlarm() {
  if (alarmIntervalId) {
    window.clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}

function startAlarm() {
  stopAlarm();

  if (!window.AudioContext && !window.webkitAudioContext) {
    return;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioCtx();

  audioContext.resume().catch(() => {});

  alarmIntervalId = window.setInterval(() => {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = 900;
    gainNode.gain.value = 0.02;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.25);
    oscillator.stop(audioContext.currentTime + 0.25);
  }, 500);
}

function updateRisk() {
  const detectorActive = state.motionDetected || state.breathDetected;
  const isRisky = state.monitoring && state.childPresent && state.carLocked && state.engineOff && detectorActive;

  if (!state.monitoring) {
    monitoringStateEl.textContent = "Off";
    monitoringStateEl.className = "pill off";
    riskStateEl.textContent = "Safe";
    riskStateEl.className = "pill safe";
    countdownEl.textContent = "--";
    updateLightState();
    return;
  }

  monitoringStateEl.textContent = "On";
  monitoringStateEl.className = "pill warning";

  if (isRisky) {
    riskStateEl.textContent = "Watch";
    riskStateEl.className = "pill warning";
    countdownEl.textContent = state.countdown;
  } else {
    riskStateEl.textContent = "Safe";
    riskStateEl.className = "pill safe";
    countdownEl.textContent = "--";
  }

  updateLightState();
}

function triggerAlert(source = "") {
  if (state.alertTriggered) return;

  state.alertTriggered = true;
  riskStateEl.textContent = "Alert";
  riskStateEl.className = "pill alert";

  const message = source
    ? `Warning: Panic signal sent from ${source}. Please check immediately.`
    : "Warning: A child may be trapped inside the locked car. Please check immediately.";

  alertBoxEl.textContent = message;
  alertBoxEl.classList.remove("hidden");
  updateLightState();
  startAlarm();
  logEvent(source ? `ALERT: Panic signal from ${source}.` : "ALERT: Child left inside car detected.");

  if ("speechSynthesis" in window) {
    const msg = new SpeechSynthesisUtterance(
      "Warning. A child may be trapped inside the locked car. Please check immediately."
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

function evaluateScenario() {
  if (!state.monitoring) return;

  state.childPresent = childPresentEl.checked;
  state.carLocked = carLockedEl.checked;
  state.engineOff = engineOffEl.checked;
  state.motionDetected = motionDetectedEl.checked;
  state.breathDetected = breathDetectedEl.checked;

  const detectorActive = state.motionDetected || state.breathDetected;
  const detectorRisk = state.childPresent && state.carLocked && state.engineOff && detectorActive;

  if (detectorRisk) {
    if (state.countdown === 0) {
      state.countdown = state.motionDetected && state.breathDetected ? 3 : 6;
      logEvent("Detector signal detected. Monitoring intensified.");
    }

    state.countdown -= 1;

    if (state.countdown <= 0) {
      triggerAlert(state.motionDetected && state.breathDetected ? "motion and breath detector" : "motion or breath detector");
      state.countdown = 0;
    }
  } else {
    state.countdown = 0;
    state.alertTriggered = false;
    alertBoxEl.classList.add("hidden");
    stopAlarm();
  }

  updateRisk();
}

function startMonitoring() {
  state.monitoring = true;
  state.alertTriggered = false;
  alertBoxEl.classList.add("hidden");
  stopAlarm();
  logEvent("Monitoring enabled.");
  updateRisk();
  setInterval(evaluateScenario, 1000);
}

function resetMonitoring() {
  state.monitoring = false;
  state.countdown = 0;
  state.alertTriggered = false;
  childPresentEl.checked = false;
  carLockedEl.checked = false;
  engineOffEl.checked = false;
  motionDetectedEl.checked = false;
  breathDetectedEl.checked = false;
  alertBoxEl.classList.add("hidden");
  stopAlarm();
  logEvent("Monitoring reset.");
  updateRisk();
}

function demoScenario() {
  childPresentEl.checked = true;
  carLockedEl.checked = true;
  engineOffEl.checked = true;
  motionDetectedEl.checked = true;
  breathDetectedEl.checked = true;
  state.monitoring = true;
  state.countdown = 3;
  state.alertTriggered = false;
  alertBoxEl.classList.add("hidden");
  stopAlarm();
  logEvent("Demo scenario activated.");
  updateRisk();
}

startBtn.addEventListener("click", startMonitoring);
resetBtn.addEventListener("click", resetMonitoring);
demoBtn.addEventListener("click", demoScenario);
panicButtons.forEach((button) => {
  button.addEventListener("click", () => {
    triggerAlert(button.dataset.channel);
  });
});

[childPresentEl, carLockedEl, engineOffEl, motionDetectedEl, breathDetectedEl].forEach((input) => {
  input.addEventListener("change", () => {
    state.childPresent = childPresentEl.checked;
    state.carLocked = carLockedEl.checked;
    state.engineOff = engineOffEl.checked;
    state.motionDetected = motionDetectedEl.checked;
    state.breathDetected = breathDetectedEl.checked;
    updateRisk();
  });
});

updateLightState();
logEvent("App ready. Toggle the vehicle states to begin monitoring.");
updateRisk();
