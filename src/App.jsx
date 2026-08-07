import { useEffect, useMemo, useState } from "react";
import * as api from "./api";

export default function App() {
  const [champions, setChampions] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState("");
  const [skins, setSkins] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState("");
  const [matches, setMatches] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [championsLoading, setChampionsLoading] = useState(true);
  const [skinsLoading, setSkinsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [ddragonVersion, setDdragonVersion] = useState("");
  const [riotAccount, setRiotAccount] = useState(null);
  const [riotInput, setRiotInput] = useState("");
  const [riotLoading, setRiotLoading] = useState(false);
  const [riotError, setRiotError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    if (token && savedUsername) {
      setUser({ username: savedUsername });
      loadMatches();
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchVersionAndChampions() {
      try {
        setChampionsLoading(true);
        const versionsRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
        const versionsData = await versionsRes.json();
        const latestVersion = versionsData[0];
        setDdragonVersion(latestVersion);
        const champsRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
        const champsData = await champsRes.json();
        const champs = Object.values(champsData.data).sort((a, b) => a.name.localeCompare(b.name));
        setChampions(champs);
        if (champs.length > 0) setSelectedChampion(champs[0].id);
      } catch (error) {
        console.error("Error cargando campeones:", error);
      } finally {
        setChampionsLoading(false);
      }
    }
    fetchVersionAndChampions();
  }, []);

  useEffect(() => {
    if (!selectedChampion || !ddragonVersion) return;
    async function fetchChampionDetails() {
      try {
        setSkinsLoading(true);
        const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion/${selectedChampion}.json`);
        const data = await res.json();
        const champData = data.data[selectedChampion];
        const skinsData = champData.skins
          .map((skin) => {
            const rawName = skin.name === "default" ? "Classic" : skin.name;
            const cleanName = rawName.replace(/\(.*?\)/g, "").trim();
            return {
              id: `${champData.id}_${skin.num}`,
              championId: champData.id,
              championName: champData.name,
              name: cleanName,
              originalName: rawName,
              num: skin.num,
              img: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champData.id}_${skin.num}.jpg`,
              tile: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champData.id}_${skin.num}.jpg`,
            };
          })
          .filter((skin, index, array) => {
            const lowerName = skin.name.toLowerCase();
            const looksLikeChroma =
              lowerName.includes("chroma") || lowerName.includes("ruby") ||
              lowerName.includes("emerald") || lowerName.includes("obsidian") ||
              lowerName.includes("pearl") || lowerName.includes("rose quartz") ||
              lowerName.includes("sapphire") || lowerName.includes("catseye") ||
              lowerName.includes("amethyst") || lowerName.includes("tanzanite");
            const duplicated = array.findIndex((item) => item.name.toLowerCase() === lowerName) !== index;
            return !looksLikeChroma && !duplicated;
          });
        setSkins(skinsData);
        if (skinsData.length > 0) setSelectedSkin(skinsData[0].name);
        else setSelectedSkin("");
      } catch (error) {
        console.error("Error cargando skins:", error);
        setSkins([]);
        setSelectedSkin("");
      } finally {
        setSkinsLoading(false);
      }
    }
    fetchChampionDetails();
  }, [selectedChampion, ddragonVersion]);

  async function loadMatches() {
    setLoading(true);
    try {
      const res = await api.getMatches();
      setMatches(res.data);
    } catch (error) {
      console.error("Error cargando partidas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites() {
    try {
      const res = await api.getFavorites();
      setFavorites(res.data);
    } catch (error) {
      console.error("Error cargando favoritos:", error);
    }
  }

  async function handleRegister() {
    setAuthMessage("");
    try {
      const res = await api.register(username, password);
      setAuthMessage(res.data.message);
      setUsername("");
      setPassword("");
    } catch (error) {
      setAuthMessage(error.response?.data?.error || "No se pudo crear la cuenta.");
    }
  }

  async function handleLogin() {
    setAuthMessage("");
    try {
      const res = await api.login(username, password);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      setUser({ username: res.data.username });
      setUsername("");
      setPassword("");
      setAuthMessage("");
      loadMatches();
      loadFavorites();
    } catch (error) {
      setAuthMessage(error.response?.data?.error || "No se pudo iniciar sesión.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
    setMatches([]);
    setFavorites([]);
  }

  async function addMatch(result) {
    if (!user || !selectedChampion || !selectedSkin) return;
    const championData = champions.find((c) => c.id === selectedChampion);
    try {
      const res = await api.addMatch({
        champion: selectedChampion,
        champion_name: championData?.name || selectedChampion,
        skin: selectedSkin,
        result,
      });
      setMatches((prev) => [res.data, ...prev]);
    } catch (error) {
      console.error("Error guardando partida:", error);
    }
  }

  async function deleteMatch(id) {
    try {
      await api.deleteMatch(id);
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error borrando partida:", error);
    }
  }

  async function toggleFavoriteChampion(champion) {
    if (!user) return;
    try {
      const res = await api.toggleFavorite(champion);
      if (res.data.action === "removed") {
        setFavorites((prev) => prev.filter((fav) => fav.champion !== champion));
      } else {
        setFavorites((prev) => [...prev, { id: res.data.id, champion }]);
      }
    } catch (error) {
      console.error("Error actualizando favorito:", error);
    }
  }

  async function linkRiotAccount() {
    setRiotError("");
    setRiotLoading(true);
    const parts = riotInput.trim().split("#");
    if (parts.length !== 2) {
      setRiotError("Formato inválido. Usá nombre#TAG (ej: Tatú Carreta#1011)");
      setRiotLoading(false);
      return;
    }
    const [gameName, tagLine] = parts;
    try {
      const res = await api.getRiotAccount(gameName, tagLine);
      setRiotAccount(res.data);
    } catch (error) {
      setRiotError(error.response?.data?.error || "No se encontró la cuenta.");
    } finally {
      setRiotLoading(false);
    }
  }

  function isFavoriteChampion(championId) {
    return favorites.some((fav) => fav.champion === championId);
  }

  const selectedChampionData = champions.find((c) => c.id === selectedChampion);
  const selectedSkinData = skins.find((s) => s.name === selectedSkin);

  const championMatches = useMemo(() => {
    return matches.filter((m) => m.champion === selectedChampion);
  }, [matches, selectedChampion]);

  const statsBySkin = useMemo(() => {
    return skins.map((skin) => {
      const skinMatches = championMatches.filter((m) => m.skin === skin.name);
      const games = skinMatches.length;
      const wins = skinMatches.filter((m) => m.result === "win").length;
      const losses = games - wins;
      const winrate = games > 0 ? ((wins / games) * 100).toFixed(1) : "0.0";
      return { ...skin, games, wins, losses, winrate };
    });
  }, [skins, championMatches]);

  const championStats = useMemo(() => {
    return champions
      .map((champ) => {
        const champMatches = matches.filter((m) => m.champion === champ.id);
        const games = champMatches.length;
        const wins = champMatches.filter((m) => m.result === "win").length;
        const losses = games - wins;
        const winrate = games > 0 ? ((wins / games) * 100).toFixed(1) : "0.0";
        return { id: champ.id, name: champ.name, games, wins, losses, winrate };
      })
      .filter((c) => c.games > 0)
      .sort((a, b) => b.games - a.games);
  }, [champions, matches]);

  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.result === "win").length;
  const totalWinrate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0f", color: "white", fontFamily: "Arial, sans-serif", padding: "30px" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {!user ? (
          <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#111118", padding: "40px", borderRadius: "20px", width: "100%", maxWidth: "420px", border: "1px solid #00f0ff33", boxShadow: "0 0 40px #00f0ff22" }}>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, background: "linear-gradient(90deg, #00f0ff, #bf00ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  🔎 SKINS-STATS
                </h1>
                <p style={{ color: "#555", marginTop: "8px", fontSize: "14px" }}>Track your winrate by skin</p>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", color: "#00f0ff", letterSpacing: "1px" }}>USUARIO</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tu usuario"
                  style={{ width: "100%", marginTop: "8px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #00f0ff44", background: "#0b0b0f", color: "white", fontSize: "15px", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "13px", color: "#00f0ff", letterSpacing: "1px" }}>CONTRASEÑA</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña"
                  style={{ width: "100%", marginTop: "8px", padding: "12px 16px", borderRadius: "10px", border: "1px solid #00f0ff44", background: "#0b0b0f", color: "white", fontSize: "15px", boxSizing: "border-box", outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={handleRegister}
                  style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "1px solid #bf00ff", background: "transparent", color: "#bf00ff", fontWeight: "bold", fontSize: "14px", cursor: "pointer", letterSpacing: "1px" }}
                  onMouseEnter={e => { e.target.style.background = "#bf00ff"; e.target.style.color = "white"; }}
                  onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "#bf00ff"; }}>
                  REGISTRARSE
                </button>
                <button onClick={handleLogin}
                  style={{ flex: 1, padding: "13px", borderRadius: "10px", border: "none", background: "linear-gradient(90deg, #00f0ff, #bf00ff)", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", letterSpacing: "1px" }}>
                  INGRESAR
                </button>
              </div>
              {authMessage && (
                <p style={{ marginTop: "16px", textAlign: "center", color: authMessage.includes("✅") ? "#00f0ff" : "#ff4d6d", fontSize: "14px" }}>
                  {authMessage}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div>
                <h1 style={{ fontSize: "48px", marginBottom: "10px" }}>LoL Winrate Tracker 🎯</h1>
                <p style={{ color: "#aaa", margin: 0 }}>Guardá tus partidas por campeón y skin.</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 8px 0" }}>Sesión iniciada como<br /><span style={{ color: "#aaa", fontSize: "14px" }}>{user.username}</span></p>
                <button onClick={handleLogout} style={{ padding: "10px 16px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }}>Cerrar sesión</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", marginBottom: "30px" }}>
              <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px" }}>
                <h2 style={{ marginTop: 0 }}>Cargar partida</h2>
                <div style={{ marginBottom: "15px" }}>
                  <label>Campeón:</label><br />
                  <select value={selectedChampion} onChange={(e) => setSelectedChampion(e.target.value)}
                    style={{ marginTop: "8px", padding: "10px", width: "100%", maxWidth: "350px", borderRadius: "8px", background: "#222", color: "white", border: "1px solid #444" }}
                    disabled={championsLoading}>
                    {champions.map((champ) => <option key={champ.id} value={champ.id}>{champ.name}</option>)}
                  </select>
                  <button onClick={() => toggleFavoriteChampion(selectedChampion)}
                    style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }}
                    disabled={!selectedChampion}>
                    {isFavoriteChampion(selectedChampion) ? "Quitar de favoritos" : "Agregar a favoritos"}
                  </button>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label>Skin:</label><br />
                  <select value={selectedSkin} onChange={(e) => setSelectedSkin(e.target.value)}
                    style={{ marginTop: "8px", padding: "10px", width: "100%", maxWidth: "350px", borderRadius: "8px", background: "#222", color: "white", border: "1px solid #444" }}
                    disabled={skinsLoading || skins.length === 0}>
                    {skins.map((skin) => <option key={skin.id} value={skin.name}>{skin.name}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button onClick={() => addMatch("win")} style={{ padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }} disabled={!selectedChampion || !selectedSkin}>Agregar victoria</button>
                  <button onClick={() => addMatch("loss")} style={{ padding: "12px 20px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }} disabled={!selectedChampion || !selectedSkin}>Agregar derrota</button>
                </div>
              </div>
              <div style={{ background: "#15151d", padding: "16px", borderRadius: "16px" }}>
                <h3 style={{ marginTop: 0 }}>{selectedChampionData?.name || "Campeón"} - {selectedSkinData?.name || "Skin"}</h3>
                {selectedSkinData ? (
                  <>
                    <img src={selectedSkinData.img} alt={selectedSkinData.name} style={{ width: "100%", height: "210px", objectFit: "cover", borderRadius: "12px", marginBottom: "12px", border: "1px solid #333" }} />
                    <p style={{ margin: 0, fontWeight: "bold" }}>{selectedChampionData?.name} - {selectedSkinData.name}</p>
                  </>
                ) : <p style={{ color: "#aaa" }}>Cargando skin...</p>}
              </div>
            </div>

            <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px", marginBottom: "25px" }}>
              <h2 style={{ marginTop: 0 }}>Campeones favoritos</h2>
              {favorites.length === 0 ? <p style={{ color: "#aaa" }}>Todavía no agregaste favoritos.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  {favorites.map((fav) => {
                    const champ = champions.find((c) => c.id === fav.champion);
                    if (!champ) return null;
                    return (
                      <div key={fav.id} onClick={() => setSelectedChampion(champ.id)} style={{ background: "#20202a", padding: "14px", borderRadius: "12px", cursor: "pointer" }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{champ.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px", marginBottom: "25px" }}>
              <h2 style={{ marginTop: 0 }}>🎮 Vincular cuenta de League of Legends</h2>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <input type="text" value={riotInput} onChange={(e) => setRiotInput(e.target.value)} placeholder="Nombre#TAG (ej: Tatú Carreta#1011)"
                  style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#222", color: "white", width: "280px" }} />
                <button onClick={linkRiotAccount} disabled={riotLoading}
                  style={{ padding: "10px 18px", borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: "bold" }}>
                  {riotLoading ? "Buscando..." : "Vincular"}
                </button>
              </div>
              {riotError && <p style={{ color: "#ff6b6b", marginTop: "10px" }}>{riotError}</p>}
              {riotAccount && (
                <div style={{ marginTop: "20px", background: "#20202a", padding: "16px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${riotAccount.summoner.profileIconId}.png`}
                      alt="icon" style={{ width: "64px", height: "64px", borderRadius: "50%", border: "2px solid #c89b3c" }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: "bold", fontSize: "18px" }}>{riotAccount.gameName}#{riotAccount.tagLine}</p>
                      <p style={{ margin: 0, color: "#aaa" }}>Nivel {riotAccount.summoner.level}</p>
                    </div>
                  </div>
                  {riotAccount.ranked.length === 0 ? <p style={{ color: "#aaa" }}>Sin rango en esta temporada.</p> : (
                    riotAccount.ranked.map((queue) => (
                      <div key={queue.queueType} style={{ marginBottom: "10px" }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>{queue.queueType === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flexible"}</p>
                        <p style={{ margin: 0, color: "#c89b3c" }}>{queue.tier} {queue.rank} — {queue.leaguePoints} LP</p>
                        <p style={{ margin: 0, fontSize: "13px", color: "#aaa" }}>{queue.wins}W / {queue.losses}L — {((queue.wins / (queue.wins + queue.losses)) * 100).toFixed(1)}% WR</p>
                      </div>
                    ))
                  )}
                  <div style={{ marginTop: "16px" }}>
                    <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Top campeones:</p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {riotAccount.topMastery.map((champ) => (
                        <div key={champ.championId} style={{ background: "#15151d", padding: "10px", borderRadius: "10px", textAlign: "center", minWidth: "80px" }}>
                          <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champ.championId}.png`}
                            alt={champ.championId} style={{ width: "48px", height: "48px", borderRadius: "8px" }}
                            onError={(e) => e.target.style.display = "none"} />
                          <p style={{ margin: "4px 0 0 0", fontSize: "12px" }}>{(champ.championPoints / 1000).toFixed(0)}k pts</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h2>Galería de skins de {selectedChampionData?.name || "campeón"}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {statsBySkin.map((skin) => (
                  <div key={skin.id} onClick={() => setSelectedSkin(skin.name)}
                    style={{ background: "#15151d", borderRadius: "16px", overflow: "hidden", border: selectedSkin === skin.name ? "2px solid #c89b3c" : "1px solid #2a2a35", cursor: "pointer" }}>
                    <img src={skin.img} alt={skin.name} style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
                    <div style={{ padding: "12px" }}>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>{skin.name}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>Partidas: {skin.games}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>Victorias: {skin.wins}</p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>Derrotas: {skin.losses}</p>
                      <p style={{ margin: "8px 0 0 0", fontWeight: "bold" }}>Winrate: {skin.winrate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "15px", marginBottom: "25px" }}>
              <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px" }}>
                <h3 style={{ marginTop: 0 }}>Partidas totales</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>{totalGames}</p>
              </div>
              <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px" }}>
                <h3 style={{ marginTop: 0 }}>Victorias</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>{totalWins}</p>
              </div>
              <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px" }}>
                <h3 style={{ marginTop: 0 }}>Winrate general</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>{totalWinrate}%</p>
              </div>
            </div>

            <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px", marginBottom: "25px" }}>
              <h2 style={{ marginTop: 0 }}>Winrate por campeón</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                    <th style={{ padding: "10px" }}>Campeón</th>
                    <th style={{ padding: "10px" }}>Partidas</th>
                    <th style={{ padding: "10px" }}>Victorias</th>
                    <th style={{ padding: "10px" }}>Derrotas</th>
                    <th style={{ padding: "10px" }}>Winrate</th>
                  </tr>
                </thead>
                <tbody>
                  {championStats.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: "10px", color: "#aaa" }}>Todavía no cargaste partidas.</td></tr>
                  ) : (
                    championStats.map((row) => (
                      <tr key={row.id} style={{ borderBottom: "1px solid #222" }}>
                        <td style={{ padding: "10px" }}>{row.name}</td>
                        <td style={{ padding: "10px" }}>{row.games}</td>
                        <td style={{ padding: "10px" }}>{row.wins}</td>
                        <td style={{ padding: "10px" }}>{row.losses}</td>
                        <td style={{ padding: "10px" }}>{row.winrate}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px", marginBottom: "25px" }}>
              <h2 style={{ marginTop: 0 }}>Winrate por skin de {selectedChampionData?.name || "campeón"}</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                    <th style={{ padding: "10px" }}>Skin</th>
                    <th style={{ padding: "10px" }}>Partidas</th>
                    <th style={{ padding: "10px" }}>Victorias</th>
                    <th style={{ padding: "10px" }}>Derrotas</th>
                    <th style={{ padding: "10px" }}>Winrate</th>
                  </tr>
                </thead>
                <tbody>
                  {statsBySkin.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: "10px" }}>{row.name}</td>
                      <td style={{ padding: "10px" }}>{row.games}</td>
                      <td style={{ padding: "10px" }}>{row.wins}</td>
                      <td style={{ padding: "10px" }}>{row.losses}</td>
                      <td style={{ padding: "10px" }}>{row.winrate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: "#15151d", padding: "20px", borderRadius: "16px" }}>
              <h2 style={{ marginTop: 0 }}>Últimas partidas</h2>
              {loading ? <p style={{ color: "#aaa" }}>Cargando partidas...</p> : matches.length === 0 ? (
                <p style={{ color: "#aaa" }}>Todavía no cargaste partidas.</p>
              ) : (
                matches.map((match) => (
                  <div key={match.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#20202a", padding: "12px", borderRadius: "10px", marginBottom: "10px", gap: "10px" }}>
                    <span>{match.champion_name} - {match.skin} - {match.result === "win" ? "Victoria" : "Derrota"}</span>
                    <button onClick={() => deleteMatch(match.id)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", cursor: "pointer" }}>Borrar</button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}