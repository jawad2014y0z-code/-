export type GameId = 'hub' | 'ludo' | 'jackaroo' | 'carrom' | 'mafia' | 'barra_alsalfa' | 'baloot' | 'taqtaqah';

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface GameInfo {
  id: GameId;
  title: string;
  tagline: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  image: string;
  category: string;
  tags: string[];
}
