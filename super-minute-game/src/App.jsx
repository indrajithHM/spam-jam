import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

const GAME_DURATION = 60;
const ADMIN_PIN = "9972";
const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycby6GEjGQhpblNW1yYUQpXxqLevKYOlbWvdD0uGzNJOWh9vTxeAumFbqiYoJvNe2wy3i1g/exec";
const SHEET_API_KEY = "SUPERMINUTE2025";

export default function App() {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState("IDLE");

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [coupon, setCoupon] = useState(null);
  const [couponGenerated, setCouponGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    stsid: "",
    name: "",
    mobile: "",
    gameName: "",
  });

  const audioCtxRef = useRef(null);
  const countdownSpokenRef = useRef(false);

  /* ---------------- TIMER ---------------- */

  useEffect(() => {
    if (!running || paused || timeLeft === 0) return;
    const t = setInterval(() => setTimeLeft(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [running, paused, timeLeft]);

  // Beep for last 5 seconds
  useEffect(() => {
    if (!running || paused) return;
    if (timeLeft <= 5 && timeLeft > 0) playBeep();
  }, [timeLeft, running, paused]);

  // Voice countdown (5..1)
  useEffect(() => {
    if (!running || paused) return;
    if (timeLeft === 5 && !countdownSpokenRef.current) {
      countdownSpokenRef.current = true;
      speakCountdown();
    }
  }, [timeLeft, running, paused]);

  // Timeout handling
  useEffect(() => {
    if (timeLeft === 0 && running) {
      setRunning(false);
      setPaused(false);
      setState("ENDED");

      speak("Time's up");

      let count = 0;
      const fast = setInterval(() => {
        playFastBeep();
        count++;
        if (count >= 6) clearInterval(fast);
      }, 300);
    }
  }, [timeLeft, running]);

  /* ---------------- GAME CONTROLS ---------------- */

  const startGame = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    countdownSpokenRef.current = false;

    setTimeLeft(GAME_DURATION);
    setRunning(true);
    setPaused(false);
    setState("RUNNING");

    setCoupon(null);
    setCouponGenerated(false);
    setLoading(false);
    setPin("");
    setPinError("");
    setForm({ stsid: "", name: "", mobile: "", gameName: "" });
  };

  const pauseGame = () => setPaused(true);
  const resumeGame = () => setPaused(false);

  const stopGame = () => {
    setRunning(false);
    setPaused(false);
    setState("STOPPED");
  };

  const goHome = () => {
    window.speechSynthesis.cancel();
    setRunning(false);
    setPaused(false);
    setState("IDLE");
    setTimeLeft(GAME_DURATION);
    setCoupon(null);
    setCouponGenerated(false);
    setLoading(false);
  };

  const verifyPin = () => {
    pin === ADMIN_PIN ? setState("FORM") : setPinError("Invalid Admin PIN");
  };

  /* ---------------- SOUND ---------------- */

  const playBeep = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 1000;
    gain.gain.value = 0.12;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  };

  const playFastBeep = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 1400;
    gain.gain.value = 0.15;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  /* ---------------- SPEECH ---------------- */

  const speak = text => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  };

  const speakCountdown = () => {
    window.speechSynthesis.cancel();
    ["5", "4", "3", "2", "1"].forEach(num => {
      const u = new SpeechSynthesisUtterance(num);
      u.lang = "en-IN";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    });
  };

  /* ---------------- COUPON ---------------- */

  const generateCouponCode = () =>
    "WIN-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const submitWinner = async () => {
    if (couponGenerated || loading) return;
    setLoading(true);

    const data = {
      ...form,
      couponCode: generateCouponCode(),
      time: new Date().toLocaleString(),
    };

    try {
      await fetch(SHEET_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: SHEET_API_KEY,
          ...data,
        }),
      });

      setCoupon(data);
      setCouponGenerated(true);
      setState("COUPON");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SHARING ---------------- */

  const shareOnWhatsApp = () => {
    if (!coupon) return;
    const mobileWithCountryCode = `91${coupon.mobile}`;

    const message =
      `🎉 Congratulations!\n\n` +
      `You won the SPAM JAM 🎯\n\n` +
      `STSID: ${coupon.stsid}\n` +
      `Name: ${coupon.name}\n` +
      `Game: ${coupon.gameName}\n` +
      `Coupon Code: ${coupon.couponCode}\n\n` +
      `Show this coupon to redeem.`;

    window.open(
      `https://wa.me/${mobileWithCountryCode}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const shareCouponAsImage = async () => {
    const el = document.getElementById("print-area");
    if (!el) return;

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (!blob) return;

    const file = new File([blob], `${coupon.couponCode}.png`, {
      type: "image/png",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Winner Coupon",
        text: "SPAM JAM – Winning Coupon 🎉",
      });
    } else {
      alert("Image sharing is supported on mobile devices only.");
    }
  };

  const isValidMobile = /^[6-9]\d{9}$/.test(form.mobile);
  const isLastTenSeconds = timeLeft <= 10 && timeLeft > 0;

  /* ---------------- UI ---------------- */

  return (
    <div className={`app ${state === "RUNNING" ? "dark" : ""}`}>
      {state === "IDLE" && (
        <div className="home">
          <div className="homeContent">
            <h2 className="festivalTitle">🎄 Happy Christmas 🎄</h2>
            <p className="festivalSub">
              Welcome to <b>SPAM JAM</b><br />
              Have a wonderful game!
            </p>
          </div>
        </div>
      )}

     {(state === "IDLE" || state === "RUNNING") && (
  <div
    className={`timer ${state === "RUNNING" ? "huge" : ""} ${
      isLastTenSeconds ? "danger" : ""
    }`}
  >
    {timeLeft}
  </div>
)}


      {state === "IDLE" && (
        <div className="startButton">
          <button onClick={startGame}>Start Game</button>
        </div>
      )}

      {state === "RUNNING" && (
        <>
          {!paused ? (
            <button onClick={pauseGame}>Pause</button>
          ) : (
            <button onClick={resumeGame}>Resume</button>
          )}
          <button className="secondary" onClick={stopGame}>
            Stop
          </button>
        </>
      )}

      {(state === "STOPPED" || state === "ENDED") && (
        <>
          <h3>TIMEOUT</h3>
          <button onClick={() => setState("PIN")} disabled={couponGenerated}>
            Generate Coupon
          </button>
          <button className="secondary" onClick={goHome}>
            Start New Game
          </button>
        </>
      )}

      {state === "PIN" && !couponGenerated && (
        <div className="card">
          <input
            type="password"
            placeholder="Admin PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          <button onClick={verifyPin}>Verify</button>
          {pinError && <p className="error">{pinError}</p>}
        </div>
      )}

      {state === "FORM" && !couponGenerated && (
        <div className="card">
          <input placeholder="STSID" onChange={e => setForm({ ...form, stsid: e.target.value })} />
          <input placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Mobile" maxLength="10" onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <input placeholder="Game Name" onChange={e => setForm({ ...form, gameName: e.target.value })} />

          <button
            disabled={loading || !isValidMobile || !form.name || !form.stsid || !form.gameName}
            onClick={submitWinner}
          >
            {loading ? "Generating coupon..." : "Generate Coupon"}
          </button>
        </div>
      )}

      {state === "COUPON" && coupon && (
        <>
          <div id="print-area" className="coupon">
            <h2>🎉Winner Coupon🎉</h2>
            <p><b>STSID:</b> {coupon.stsid}</p>
            <p><b>Name:</b> {coupon.name}</p>
            <p><b>Mobile:</b> {coupon.mobile}</p>
            <p><b>Game:</b> {coupon.gameName}</p>
            <h3>{coupon.couponCode}</h3>
          </div>

          <button onClick={shareOnWhatsApp}>Share on WhatsApp (Text)</button>
          <button onClick={shareCouponAsImage}>Share Coupon Image</button>
          <button onClick={() => window.print()}>Print</button>
          <button className="secondary" onClick={goHome}>
            Start New Game
          </button>
        </>
      )}
    </div>
  );
}
