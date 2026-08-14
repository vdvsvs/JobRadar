import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "@mantine/core/styles.css";

// React 错误边界
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 40,
            fontFamily: "system-ui, sans-serif",
            maxWidth: 800,
          }}
        >
          <h2 style={{ color: "#e74c3c" }}>⚠️ React 渲染错误</h2>
          <p style={{ fontSize: 16 }}>
            <strong>错误：</strong>
            {this.state.error?.message}
          </p>
          <details open>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
              堆栈信息
            </summary>
            <pre
              style={{
                background: "#f8f8f8",
                padding: 12,
                borderRadius: 6,
                overflow: "auto",
                fontSize: 13,
              }}
            >
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              cursor: "pointer",
              fontSize: 15,
              border: "none",
              borderRadius: 6,
              background: "#3498db",
              color: "white",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 全局错误捕获
window.onerror = (msg, url, line, col, error) => {
  console.error("Global error:", msg, url, line, col, error);
  return false;
};

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  document.body.innerHTML =
    '<h1 style="color:red;padding:40px;">找不到 #root 元素</h1>';
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MantineProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </MantineProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log("React render complete");
}
