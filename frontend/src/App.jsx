import "./App.css";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./services/api";
import { saveAuth } from "./services/auth";

function App() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [activeBtn, setActiveBtn] = useState(null);

  useEffect(() => {
    // Wait for particles.js to load from CDN
    const initParticles = () => {
      if (window.particlesJS) {
        window.particlesJS('particles-js', {
          particles: {
            number: {
              value: 120,
              density: {
                enable: true,
                value_area: 800,
              },
            },
            color: {
              value: '#60a5fa',
            },
            shape: {
              type: 'circle',
              stroke: {
                width: 0,
                color: '#000000',
              },
            },
            opacity: {
              value: 0.6,
              random: false,
              anim: {
                enable: false,
                speed: 1,
                opacity_min: 0.1,
                sync: false,
              },
            },
            size: {
              value: 4,
              random: true,
              anim: {
                enable: false,
                speed: 40,
                size_min: 0.1,
                sync: false,
              },
            },
            line_linked: {
              enable: true,
              distance: 120,
              color: '#60a5fa',
              opacity: 0.4,
              width: 1.5,
            },
            move: {
              enable: true,
              speed: 3,
              direction: 'none',
              random: false,
              straight: false,
              out_mode: 'bounce',
              attract: {
                enable: false,
                rotateX: 600,
                rotateY: 1200,
              },
            },
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: {
                enable: true,
                mode: 'repulse',
              },
              onclick: {
                enable: true,
                mode: 'push',
              },
              resize: true,
            },
            modes: {
              grab: {
                distance: 150,
                line_linked: {
                  opacity: 1,
                },
              },
              bubble: {
                distance: 150,
                size: 40,
                duration: 2,
                opacity: 8,
                speed: 3,
              },
              repulse: {
                distance: 80,
                duration: 0.4,
              },
              push: {
                particles_nb: 4,
              },
              remove: {
                particles_nb: 2,
              },
            },
          },
          retina_detect: true,
        });
        console.log('✓ Particles initialized');
      } else {
        console.error('✗ particlesJS not available');
      }
    };

    // Try to init immediately, then with timeout as backup
    if (window.particlesJS) {
      initParticles();
    } else {
      setTimeout(initParticles, 500);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (isRegister) {
      if (!email || !username || !password) {
        setError('Completează toate câmpurile');
        return;
      }
      await handleRegister();
    } else {
      if (!email || !password) {
        setError('Completează toate câmpurile');
        return;
      }
      await handleLogin();
    }
  }

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      const data = await api.login(email, password);
      saveAuth(data.token, data.user);
      navigate('/home');
    } catch (e) {
      setError(e.message || 'Email sau parolă greșită');
    }
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true);
    setError('');
    try {
      const data = await api.register(email, username, password);
      saveAuth(data.token, data.user);
      navigate('/home');
    } catch (e) {
      setError(e.message || 'Eroare la înregistrare');
    }
    setLoading(false);
  }

  return (
    <div className="page">
      {/* Particles Background */}
      <div id="particles-js" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}></div>
      
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="auth-card">
        <div className="brand-wrap">
          <h1 className="brand">ITECify</h1>
          <p className="subtitle">Code. Collaborate. Build with AI.</p>
        </div>

        <div className="auth-switch">
          <button
            className={!isRegister ? "switch-btn active" : "switch-btn"}
            onClick={() => setIsRegister(false)}
            onMouseEnter={() => setHoveredBtn('login-tab')}
            onMouseLeave={() => setHoveredBtn(null)}
            onMouseDown={() => setActiveBtn('login-tab')}
            onMouseUp={() => setActiveBtn(null)}
            style={{
              opacity: activeBtn === 'login-tab' ? 0.6 : hoveredBtn === 'login-tab' ? 0.85 : 1,
              transform: activeBtn === 'login-tab' ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.15s ease',
            }}
          >
            Login
          </button>
          <button
            className={isRegister ? "switch-btn active" : "switch-btn"}
            onClick={() => setIsRegister(true)}
            onMouseEnter={() => setHoveredBtn('register-tab')}
            onMouseLeave={() => setHoveredBtn(null)}
            onMouseDown={() => setActiveBtn('register-tab')}
            onMouseUp={() => setActiveBtn(null)}
            style={{
              opacity: activeBtn === 'register-tab' ? 0.6 : hoveredBtn === 'register-tab' ? 0.85 : 1,
              transform: activeBtn === 'register-tab' ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.15s ease',
            }}
          >
            Înregistrare
          </button>
        </div>

        {error && <p style={{ color: '#f48771', fontSize: '0.95rem', marginBottom: '12px' }}>{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {isRegister && (
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="input-group">
            <input 
              type="password" 
              placeholder="Parolă"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn" 
            disabled={loading}
            onMouseEnter={() => !loading && setHoveredBtn('submit')}
            onMouseLeave={() => setHoveredBtn(null)}
            onMouseDown={() => !loading && setActiveBtn('submit')}
            onMouseUp={() => setActiveBtn(null)}
            style={{
              opacity: activeBtn === 'submit' ? 0.6 : hoveredBtn === 'submit' ? 0.85 : 1,
              transform: activeBtn === 'submit' ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Se procesează...' : isRegister ? "Creează cont" : "Conectează-te"}
          </button>
        </form>

        <p className="bottom-text">
          {isRegister ? "Ai deja cont?" : "Nu ai cont încă?"}{" "}
          <span
            className="bottom-link"
            onClick={() => setIsRegister(!isRegister)}
            onMouseEnter={() => setHoveredBtn('bottom-link')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              opacity: hoveredBtn === 'bottom-link' ? 0.8 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isRegister ? "Login" : "Înregistrare"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;