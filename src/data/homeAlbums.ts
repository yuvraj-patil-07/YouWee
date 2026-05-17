import { SongMetadata } from '../types';

export interface HomeAlbum {
  id: string;
  title: string;
  genre: string;
  accent: string;
  cover: string;
  songs: SongMetadata[];
}

export const homeAlbums: HomeAlbum[] = [
  {
    id: 'pop-rush',
    title: 'Pop Rush',
    genre: 'Pop',
    accent: '#ff4f9a',
    cover: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    songs: [
      {
        id: 'kJQP7kiw5Fk',
        title: 'Despacito',
        artist: 'Luis Fonsi ft. Daddy Yankee',
        duration: 281,
        thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
      },
      {
        id: 'JGwWNGJdvx8',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        duration: 264,
        thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
      },
      {
        id: 'fRh_vgS2dFE',
        title: 'Sorry',
        artist: 'Justin Bieber',
        duration: 206,
        thumbnail: 'https://img.youtube.com/vi/fRh_vgS2dFE/hqdefault.jpg',
      },
    ],
  },
  {
    id: 'hiphop-heat',
    title: 'Hip-Hop Heat',
    genre: 'Hip-Hop',
    accent: '#f97316',
    cover: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg',
    songs: [
      {
        id: 'OPf0YbXqDm0',
        title: 'Uptown Funk',
        artist: 'Mark Ronson ft. Bruno Mars',
        duration: 270,
        thumbnail: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg',
      },
      {
        id: 'uelHwf8o7_U',
        title: 'Love The Way You Lie',
        artist: 'Eminem ft. Rihanna',
        duration: 267,
        thumbnail: 'https://img.youtube.com/vi/uelHwf8o7_U/hqdefault.jpg',
      },
      {
        id: 'tvTRZJ-4EyI',
        title: 'HUMBLE.',
        artist: 'Kendrick Lamar',
        duration: 177,
        thumbnail: 'https://img.youtube.com/vi/tvTRZJ-4EyI/hqdefault.jpg',
      },
    ],
  },
  {
    id: 'edm-night',
    title: 'EDM Night',
    genre: 'Dance',
    accent: '#22d3ee',
    cover: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg',
    songs: [
      {
        id: '60ItHLz5WEA',
        title: 'Faded',
        artist: 'Alan Walker',
        duration: 213,
        thumbnail: 'https://img.youtube.com/vi/60ItHLz5WEA/hqdefault.jpg',
      },
      {
        id: 'YqeW9_5kURI',
        title: 'Lean On',
        artist: 'Major Lazer and DJ Snake',
        duration: 176,
        thumbnail: 'https://img.youtube.com/vi/YqeW9_5kURI/hqdefault.jpg',
      },
      {
        id: 'IcrbM1l_BoI',
        title: 'Wake Me Up',
        artist: 'Avicii',
        duration: 273,
        thumbnail: 'https://img.youtube.com/vi/IcrbM1l_BoI/hqdefault.jpg',
      },
    ],
  },
  {
    id: 'rock-icons',
    title: 'Rock Icons',
    genre: 'Rock',
    accent: '#ef4444',
    cover: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    songs: [
      {
        id: 'fJ9rUzIMcZQ',
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        duration: 354,
        thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
      },
      {
        id: 'hTWKbfoikeg',
        title: 'Smells Like Teen Spirit',
        artist: 'Nirvana',
        duration: 278,
        thumbnail: 'https://img.youtube.com/vi/hTWKbfoikeg/hqdefault.jpg',
      },
      {
        id: '1w7OgIMMRc4',
        title: "Sweet Child O' Mine",
        artist: "Guns N' Roses",
        duration: 356,
        thumbnail: 'https://img.youtube.com/vi/1w7OgIMMRc4/hqdefault.jpg',
      },
    ],
  },
];
