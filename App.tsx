import { useEffect } from "react";
import { MARKUP } from "@/game/markup";
import { startGame } from "@/game/game";

let started = false;

export default function App() {
  useEffect(() => {
    // Игра стартует один раз — после того, как разметка уже в DOM.
    if (started) return;
    started = true;
    startGame();
  }, []);

  return <div id="gameRoot" dangerouslySetInnerHTML={{ __html: MARKUP }} />;
}
