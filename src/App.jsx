import { useEffect, useMemo, useState } from "react";
import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

export default function App() {
  const [champions, setChampions] = useState([]);
  const [selectedChampion, setSelectedChampion] = useState("");
  const [skins, setSkins] = useState([]);
  const [selectedSkin, setSelectedSkin] = useState("");

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [championsLoading, setChampionsLoading] = useState(true);
  const [skinsLoading, setSkinsLoading] = useState(false);

  const [user, setUser] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [ddragonVersion, setDdragonVersion] = useState("");

  useEffect(() => {
    async function fetchVersionAndChampions() {
      try {
        setChampionsLoading(true);

        const versionsRes = await fetch(
          "https://ddragon.leagueoflegends.com/api/versions.json"
        );
        const versionsData = await versionsRes.json();
        const latestVersion = versionsData[0];

        setDdragonVersion(latestVersion);

        const champsRes = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`
        );
        const champsData = await champsRes.json();

        const champs = Object.values(champsData.data).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        setChampions(champs);

        if (champs.length > 0) {
          setSelectedChampion(champs[0].id);
        }
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

        const res = await fetch(
          `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/en_US/champion/${selectedChampion}.json`
        );

        const data = await res.json();
        const champData = data.data[selectedChampion];

        const skinsData = champData.skins.map((skin) => ({
          id: `${champData.id}_${skin.num}`,
          championId: champData.id,
          championName: champData.name,
          name: skin.name === "default" ? "Classic" : skin.name,
          num: skin.num,
          img: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champData.id}_${skin.num}.jpg`,
          tile: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champData.id}_${skin.num}.jpg`,
        }));

        setSkins(skinsData);

        if (skinsData.length > 0) {
          setSelectedSkin(skinsData[0].name);
        } else {
          setSelectedSkin("");
        }
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await loadMatches(currentUser.uid);
      } else {
        setMatches([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  function buildFakeEmail(usernameValue) {
    const cleanUsername = usernameValue.trim().toLowerCase();
    return `${cleanUsername}@jhinstats.app`;
  }

  function validateUsername(usernameValue) {
    const cleanUsername = usernameValue.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return "El usuario debe tener al menos 3 caracteres.";
    }

    if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
      return "El usuario solo puede tener letras, números, punto, guion o guion bajo.";
    }

    return "";
  }

  async function loadMatches(uid) {
    setLoading(true);

    try {
      const q = query(collection(db, "matches"), where("uid", "==", uid));
      const snapshot = await getDocs(q);

      const data = snapshot.docs
        .map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      setMatches(data);
    } catch (error) {
      console.error("Error cargando partidas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setAuthMessage("");

    const usernameError = validateUsername(username);
    if (usernameError) {
      setAuthMessage(usernameError);
      return;
    }

    if (password.length < 6) {
      setAuthMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    const fakeEmail = buildFakeEmail(username);

    try {
      await createUserWithEmailAndPassword(auth, fakeEmail, password);
      setAuthMessage("Cuenta creada correctamente ✅");
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error("Error al crear cuenta:", error);

      if (error.code === "auth/email-already-in-use") {
        setAuthMessage("Ese nombre de usuario ya está en uso.");
      } else {
        setAuthMessage("No se pudo crear la cuenta.");
      }
    }
  }

  async function handleLogin() {
    setAuthMessage("");

    const usernameError = validateUsername(username);
    if (usernameError) {
      setAuthMessage(usernameError);
      return;
    }

    const fakeEmail = buildFakeEmail(username);

    try {
      await signInWithEmailAndPassword(auth, fakeEmail, password);
      setAuthMessage("Sesión iniciada ✅");
      setUsername("");
      setPassword("");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setAuthMessage("Usuario o contraseña incorrectos.");
      } else {
        setAuthMessage("No se pudo iniciar sesión.");
      }
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setAuthMessage("Sesión cerrada.");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

  async function addMatch(result) {
    if (!user || !selectedChampion || !selectedSkin) return;

    const championData = champions.find((c) => c.id === selectedChampion);

    try {
      const newMatch = {
        uid: user.uid,
        userName: user.email.replace("@jhinstats.app", ""),
        champion: selectedChampion,
        championName: championData?.name || selectedChampion,
        skin: selectedSkin,
        result,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "matches"), newMatch);
      setMatches((prev) => [{ id: docRef.id, ...newMatch }, ...prev]);
    } catch (error) {
      console.error("Error guardando partida:", error);
    }
  }

  async function deleteMatch(id) {
    try {
      await deleteDoc(doc(db, "matches", id));
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error borrando partida:", error);
    }
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

      return {
        ...skin,
        games,
        wins,
        losses,
        winrate,
      };
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

        return {
          id: champ.id,
          name: champ.name,
          games,
          wins,
          losses,
          winrate,
        };
      })
      .filter((c) => c.games > 0)
      .sort((a, b) => b.games - a.games);
  }, [champions, matches]);

  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.result === "win").length;
  const totalWinrate =
    totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

  const visibleUsername = user ? user.email.replace("@jhinstats.app", "") : "";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0f",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "30px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "48px", marginBottom: "10px" }}>
              LoL Winrate Tracker 🎯
            </h1>
            <p style={{ color: "#aaa", margin: 0 }}>
              Guardá tus partidas por campeón y skin.
            </p>
          </div>

          {user && (
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 8px 0" }}>
                Sesión iniciada como
                <br />
                <span style={{ color: "#aaa", fontSize: "14px" }}>
                  {visibleUsername}
                </span>
              </p>
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {!user ? (
          <div
            style={{
              background: "#15151d",
              padding: "24px",
              borderRadius: "16px",
              marginTop: "20px",
              maxWidth: "500px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Crear cuenta o iniciar sesión</h2>

            <div style={{ marginBottom: "12px" }}>
              <label>Nombre de usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "white",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #444",
                  background: "#222",
                  color: "white",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handleRegister}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Crear cuenta
              </button>

              <button
                onClick={handleLogin}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Iniciar sesión
              </button>
            </div>

            {authMessage && (
              <p style={{ marginTop: "14px", color: "#aaa" }}>{authMessage}</p>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 360px",
                gap: "20px",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  background: "#15151d",
                  padding: "20px",
                  borderRadius: "16px",
                }}
              >
                <h2 style={{ marginTop: 0 }}>Cargar partida</h2>

                <div style={{ marginBottom: "15px" }}>
                  <label>Campeón:</label>
                  <br />
                  <select
                    value={selectedChampion}
                    onChange={(e) => setSelectedChampion(e.target.value)}
                    style={{
                      marginTop: "8px",
                      padding: "10px",
                      width: "100%",
                      maxWidth: "350px",
                      borderRadius: "8px",
                      background: "#222",
                      color: "white",
                      border: "1px solid #444",
                    }}
                    disabled={championsLoading}
                  >
                    {champions.map((champ) => (
                      <option key={champ.id} value={champ.id}>
                        {champ.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label>Skin:</label>
                  <br />
                  <select
                    value={selectedSkin}
                    onChange={(e) => setSelectedSkin(e.target.value)}
                    style={{
                      marginTop: "8px",
                      padding: "10px",
                      width: "100%",
                      maxWidth: "350px",
                      borderRadius: "8px",
                      background: "#222",
                      color: "white",
                      border: "1px solid #444",
                    }}
                    disabled={skinsLoading || skins.length === 0}
                  >
                    {skins.map((skin) => (
                      <option key={skin.id} value={skin.name}>
                        {skin.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => addMatch("win")}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    disabled={!selectedChampion || !selectedSkin}
                  >
                    Agregar victoria
                  </button>

                  <button
                    onClick={() => addMatch("loss")}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    disabled={!selectedChampion || !selectedSkin}
                  >
                    Agregar derrota
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#15151d",
                  padding: "16px",
                  borderRadius: "16px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {selectedChampionData?.name || "Campeón"} -{" "}
                  {selectedSkinData?.name || "Skin"}
                </h3>

                {selectedSkinData ? (
                  <>
                    <img
                      src={selectedSkinData.img}
                      alt={selectedSkinData.name}
                      style={{
                        width: "100%",
                        height: "210px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        marginBottom: "12px",
                        border: "1px solid #333",
                      }}
                    />
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                      {selectedChampionData?.name} - {selectedSkinData.name}
                    </p>
                  </>
                ) : (
                  <p style={{ color: "#aaa" }}>Cargando skin...</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h2>
                Galería de skins de {selectedChampionData?.name || "campeón"}
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "16px",
                }}
              >
                {statsBySkin.map((skin) => (
                  <div
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.name)}
                    style={{
                      background: "#15151d",
                      borderRadius: "16px",
                      overflow: "hidden",
                      border:
                        selectedSkin === skin.name
                          ? "2px solid #c89b3c"
                          : "1px solid #2a2a35",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={skin.img}
                      alt={skin.name}
                      style={{
                        width: "100%",
                        height: "140px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    <div style={{ padding: "12px" }}>
                      <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
                        {skin.name}
                      </p>

                      <p style={{ margin: "4px 0", fontSize: "14px" }}>
                        Partidas: {skin.games}
                      </p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>
                        Victorias: {skin.wins}
                      </p>
                      <p style={{ margin: "4px 0", fontSize: "14px" }}>
                        Derrotas: {skin.losses}
                      </p>
                      <p style={{ margin: "8px 0 0 0", fontWeight: "bold" }}>
                        Winrate: {skin.winrate}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div
                style={{
                  background: "#15151d",
                  padding: "20px",
                  borderRadius: "16px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Partidas totales</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                  {totalGames}
                </p>
              </div>

              <div
                style={{
                  background: "#15151d",
                  padding: "20px",
                  borderRadius: "16px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Victorias</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                  {totalWins}
                </p>
              </div>

              <div
                style={{
                  background: "#15151d",
                  padding: "20px",
                  borderRadius: "16px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>Winrate general</h3>
                <p style={{ fontSize: "30px", fontWeight: "bold" }}>
                  {totalWinrate}%
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#15151d",
                padding: "20px",
                borderRadius: "16px",
                marginBottom: "25px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Winrate por campeón</h2>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr
                    style={{ textAlign: "left", borderBottom: "1px solid #333" }}
                  >
                    <th style={{ padding: "10px" }}>Campeón</th>
                    <th style={{ padding: "10px" }}>Partidas</th>
                    <th style={{ padding: "10px" }}>Victorias</th>
                    <th style={{ padding: "10px" }}>Derrotas</th>
                    <th style={{ padding: "10px" }}>Winrate</th>
                  </tr>
                </thead>
                <tbody>
                  {championStats.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: "10px", color: "#aaa" }}>
                        Todavía no cargaste partidas.
                      </td>
                    </tr>
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

            <div
              style={{
                background: "#15151d",
                padding: "20px",
                borderRadius: "16px",
                marginBottom: "25px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Winrate por skin de {selectedChampionData?.name || "campeón"}
              </h2>

              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "10px",
                }}
              >
                <thead>
                  <tr
                    style={{ textAlign: "left", borderBottom: "1px solid #333" }}
                  >
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

            <div
              style={{
                background: "#15151d",
                padding: "20px",
                borderRadius: "16px",
              }}
            >
              <h2 style={{ marginTop: 0 }}>Últimas partidas</h2>

              {loading ? (
                <p style={{ color: "#aaa" }}>Cargando partidas...</p>
              ) : matches.length === 0 ? (
                <p style={{ color: "#aaa" }}>Todavía no cargaste partidas.</p>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#20202a",
                      padding: "12px",
                      borderRadius: "10px",
                      marginBottom: "10px",
                      gap: "10px",
                    }}
                  >
                    <span>
                      {match.championName} - {match.skin} -{" "}
                      {match.result === "win" ? "Victoria" : "Derrota"}
                    </span>

                    <button
                      onClick={() => deleteMatch(match.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Borrar
                    </button>
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