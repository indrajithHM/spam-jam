import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import logo from "./assets/logo.png";
import qrcode from "./assets/qrcode.jpg";

const GAME_DURATION = 60;
const ADMIN_PIN = "9972";
const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycby6GEjGQhpblNW1yYUQpXxqLevKYOlbWvdD0uGzNJOWh9vTxeAumFbqiYoJvNe2wy3i1g/exec";
const SHEET_API_KEY = "SUPERMINUTE2025";

export default function App() {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  // QR | WELCOME | RUNNING | STOPPED | ENDED | PIN | FORM | COUPON
  const [state, setState] = useState("QR");

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

  useEffect(() => {
    if (!running || paused) return;
    if (timeLeft <= 5 && timeLeft > 0) playBeep();
  }, [timeLeft, running, paused]);

  useEffect(() => {
    if (!running || paused) return;
    if (timeLeft === 5 && !countdownSpokenRef.current) {
      countdownSpokenRef.current = true;
      speakCountdown();
    }
  }, [timeLeft, running, paused]);

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

  /* ---------------- NAVIGATION ---------------- */

  const goToQR = () => {
    window.speechSynthesis.cancel();
    setRunning(false);
    setPaused(false);
    setState("QR");
    setTimeLeft(GAME_DURATION);
    setCoupon(null);
    setCouponGenerated(false);
    setLoading(false);
  };

  const goToWelcome = () => {
    setState("WELCOME");
  };

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
    window.speechSynthesis.cancel();
    setRunning(false);
    setPaused(false);
    setState("STOPPED");
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
    const msg =
      `🎉 Congratulations!🎉\n\nYou won SPAM JAM 🎯\n\n` +
      `STSID: ${coupon.stsid}\nName: ${coupon.name}\n` +
      `Game: ${coupon.gameName}\nCoupon: ${coupon.couponCode}`;

    window.open(
      `https://wa.me/${mobileWithCountryCode}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  const shareCouponAsImage = async () => {
    const el = document.getElementById("print-area");
    if (!el) return;

    const canvas = await html2canvas(el, { scale: 2 });
    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (!blob) return;

    const file = new File([blob], `${coupon.couponCode}.png`, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "SPAM JAM Coupon",
      });
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="app">
      <header className="appHeader">
        <img src={logo} className="headerLogo" />
      </header>

      {/* QR PAGE */}
      {state === "QR" && (
        <div className="home">
          <div className="homeContent">
            <img src={qrcode} className="QRCode" />
            <button onClick={goToWelcome}>Proceed</button>
          </div>
        </div>
      )}

      {/* WELCOME PAGE */}
      {state === "WELCOME" && (
        <div className="home">
          <div className="homeContent">
            <h2>🎄 Happy Christmas 🎄</h2>
            <p className="festivalSub"> Welcome to <b>SPAM JAM</b><br /> Have a wonderful game! </p>
              <div className="startGameWrapper">
                 <button className="startGameFab" onClick={startGame}>
                   ▶
                 </button>
              </div>
          
          </div>
         
        </div>
      )}

      {/* TIMER */}
      {state === "RUNNING" && (
        <div className="timer huge">{timeLeft}</div>
      )}

      {/* RUNNING CONTROLS */}
      {state === "RUNNING" && (
        <>
          {!paused ? (
            <button onClick={pauseGame}>Pause</button>
          ) : (
            <button onClick={resumeGame}>Resume</button>
          )}
          <button className="secondary" onClick={stopGame}>Stop</button>
        </>
      )}

      {/* TIMEOUT */}
      {(state === "STOPPED" || state === "ENDED") && (
        <>
          <h3>TIMEOUT</h3>
          <button onClick={() => setState("PIN")}>Generate Coupon</button>
          <button className="secondary" onClick={goToQR}>Start New Game</button>
        </>
      )}

      {/* PIN */}
      {state === "PIN" && (
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

      {/* FORM */}
      {state === "FORM" && (
        <div className="card">
          <input placeholder="STSID" onChange={e => setForm({ ...form, stsid: e.target.value })} />
          <input placeholder="Name" onChange={e => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Mobile" maxLength="10" onChange={e => setForm({ ...form, mobile: e.target.value })} />
          <input placeholder="Game Name" onChange={e => setForm({ ...form, gameName: e.target.value })} />
          <button onClick={submitWinner}>
            {loading ? "Generating..." : "Generate Coupon"}
          </button>
        </div>
      )}

      {/* COUPON */}
      {state === "COUPON" && coupon && (
        <>
          <div id="print-area" className="coupon">
            <h2>🎉 Winner Coupon 🎉</h2>
            <h3>STSID:{coupon.stsid}</h3>
            <h3>{coupon.name}</h3>
            <h4>GAMES:{coupon.gameName}</h4>
            <h3>{coupon.couponCode}</h3>
          </div>

          <button onClick={shareOnWhatsApp}>WhatsApp</button>
          <button onClick={shareCouponAsImage}>Share Image</button>
          <button onClick={goToQR} className="secondary">Start New Game</button>
        </>
      )}
    </div>
  );
}
