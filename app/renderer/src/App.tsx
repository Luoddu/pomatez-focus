import React from "react";
import { CounterProvider } from "contexts/CounterContext";
import FocusApp from "focus/FocusApp";
export default function App() {
  return (
    <CounterProvider>
      <FocusApp />
    </CounterProvider>
  );
}
