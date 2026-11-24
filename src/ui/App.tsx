// Routes: home, the two drills, the chart browser, the board lab, stats.

import { useEffect } from 'react';
import { usePrefs } from '@/store/prefsStore';
import { BoardsPage } from './pages/BoardsPage';
import { ChartsPage } from './pages/ChartsPage';
import { Home } from './pages/Home';
import { PostflopPage } from './pages/PostflopPage';
import { PreflopPage } from './pages/PreflopPage';
import { StatsPage } from './pages/StatsPage';
import { useRoute } from './router';

export function App() {
  const route = useRoute();
  const fourColor = usePrefs((s) => s.fourColor);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  return (
    <div className={`app${fourColor ? '' : ' suits-two'}`}>
      {route.name === 'home' && <Home />}
      {route.name === 'preflop' && <PreflopPage />}
      {route.name === 'postflop' && <PostflopPage />}
      {route.name === 'charts' && <ChartsPage spot={route.spot} />}
      {route.name === 'boards' && <BoardsPage spot={route.spot} flop={route.flop} />}
      {route.name === 'stats' && <StatsPage />}
    </div>
  );
}
