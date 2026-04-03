import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";

export default function App() {
  const [skins] = useState([
    { es: "Clásica", en: "Classic", img: "/skins/classic.jpg" },
    { es: "Forajido", en: "High Noon", img: "/skins/high-noon.jpg" },
    { es: "PROYECTO", en: "PROJECT", img: "/skins/project.jpg" },
    { es: "Luna de Sangre", en: "Blood Moon", img: "/skins/blood-moon.jpg" },
    { es: "SKT T1", en: "SKT T1", img: "/skins/skt-t1.jpg" },
    { es: "Cósmico Oscuro", en: "Dark Cosmic", img: "/skins/dark-cosmic.jpg" },
    {
      es: "Oscuridad Cósmica Devastadora",
      en: "Dark Cosmic Erasure",
      img: "/skins/dark-cosmic-erasure.jpg",
    },
    {
      es: "Pergaminos Shan Hai",
      en: "Shan Hai Scrolls",
      img: "/skins/shan-hai-scrolls.jpg",
    },
    { es: "Empíreo", en: "Empyrean", img: "/skins/empyrean.jpg" },
    {
      es: "Luchador Espiritual",
      en: "Soul Fighter",
      img: "/skins/soul-fighter.jpg",
    },
    { es: "Arcana", en: "Arcana", img: "/skins/arcana.jpg" },
    { es: "Creador de Mitos", en: "Mythmaker", img: "/skins/mythmaker.jpg" },
  ]);

  const [selectedSkin, setSelectedSkin] = useState("Classic");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      const q = query(collection(db, "matches"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setMatches(data);
    } catch (error) {
      console.error("Error cargando partidas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addMatch(result) {
    try {
      const newMatch = {
        skin: selectedSkin,
        result,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, "matches"), newMatch);

      setMatches((prev) => [{ id: docRef.id, ...newMatch }, ...prev]);
      console.log("Partida guardada 🔥");
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

  const statsBySkin = useMemo(() => {
    return skins.map((skin) => {
      const skinMatches = matches.filter((m) => m.skin === skin.en);
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
  }, [matches, skins]);

  const totalGames = matches.length;
  const totalWins = matches.filter((m) => m.result === "win").length;
  const totalWinrate =
    totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

  const selectedSkinData = skins.find((skin) => skin.en === selectedSkin);

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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "10px" }}>
          Jhin Winrate Tracker 🔥 UPDATED
        </h1>

        <p style={{ color: "#aaa", marginBottom: "30px" }}>
          Tus partidas se guardan en Firebase.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
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
              >
                {skins.map((skin) => (
                  <option key={skin.en} value={skin.en}>
                    {skin.es} ({skin.en})
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
            <h3 style={{ marginTop: 0 }}>Skin seleccionada</h3>

            {selectedSkinData && (
              <>
                <img
                  src={selectedSkinData.img}
                  alt={selectedSkinData.en}
                  style={{
                    width: "100%",
                    height: "180px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    marginBottom: "12px",
                    border: "1px solid #333",
                  }}
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/600x300/111111/FFFFFF?text=Imagen+no+encontrada";
                  }}
                />

                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {selectedSkinData.es} ({selectedSkinData.en})
                </p>
              </>
            )}
          </div>
        </div>

        <div style={{ marginBottom: "30px" }}>
          <h2>Galería de skins</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            {statsBySkin.map((skin) => (
              <div
                key={skin.en}
                onClick={() => setSelectedSkin(skin.en)}
                style={{
                  background: "#15151d",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border:
                    selectedSkin === skin.en
                      ? "2px solid #c89b3c"
                      : "1px solid #2a2a35",
                  cursor: "pointer",
                }}
              >
                <img
                  src={skin.img}
                  alt={skin.en}
                  style={{
                    width: "100%",
                    height: "140px",
                    objectFit: "cover",
                    display: "block",
                  }}
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/600x300/111111/FFFFFF?text=Sin+imagen";
                  }}
                />

                <div style={{ padding: "12px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold" }}>
                    {skin.es}
                  </p>

                  <p
                    style={{
                      margin: "0 0 10px 0",
                      color: "#aaa",
                      fontSize: "14px",
                    }}
                  >
                    ({skin.en})
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
            <p style={{ fontSize: "30px", fontWeight: "bold" }}>{totalGames}</p>
          </div>

          <div
            style={{
              background: "#15151d",
              padding: "20px",
              borderRadius: "16px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Victorias</h3>
            <p style={{ fontSize: "30px", fontWeight: "bold" }}>{totalWins}</p>
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
          <h2 style={{ marginTop: 0 }}>Winrate por skin</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "10px",
            }}
          >
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
                <tr key={row.en} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "10px" }}>
                    {row.es} ({row.en})
                  </td>
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
            matches.map((match) => {
              const skinData = skins.find((s) => s.en === match.skin);

              return (
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
                    {skinData?.es} ({skinData?.en}) -{" "}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}