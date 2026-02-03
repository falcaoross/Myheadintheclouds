export default function LoadingScreen({ title, subtitle, buttonLabel, onStart }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #0f2a21, #050907)",
        color: "#f2f6f4",
        zIndex: 10,
        textAlign: "center",
        padding: "0 24px",
      }}
    >
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>{title}</h1>
      <p style={{ maxWidth: 420, opacity: 0.8 }}>{subtitle}</p>
      <button
        onClick={onStart}
        style={{
          marginTop: 24,
          padding: "12px 24px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        {buttonLabel}
      </button>
      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
        Audio begins after interaction. Click to lock the mouse for smooth camera control.
      </p>
    </div>
  );
}
