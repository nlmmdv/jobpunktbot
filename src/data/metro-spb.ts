export interface MetroStation {
  id: string;
  name: string;
  line: string;
  lineColor: string;
}

export const metroSPb: MetroStation[] = [
  // Линия 1 - Красная
  { id: 'sp1_1', name: 'Невский проспект', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_2', name: 'Гостиный двор', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_3', name: 'Маяковская', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_4', name: 'Владимирская', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_5', name: 'Площадь Восстания', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_6', name: 'Пушкинская', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_7', name: 'Технологический институт', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_8', name: 'Балтийская', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_9', name: 'Нарвская', line: '1', lineColor: '#E4273C' },
  { id: 'sp1_10', name: 'Кировский завод', line: '1', lineColor: '#E4273C' },

  // Линия 2 - Синяя
  { id: 'sp2_1', name: 'Чёрная речка', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_2', name: 'Петроградская', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_3', name: 'Горьковская', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_4', name: 'Невский проспект', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_5', name: 'Гостиный двор', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_6', name: 'Садовая', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_7', name: 'Сенная площадь', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_8', name: 'Спасская', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_9', name: 'Невский проспект', line: '2', lineColor: '#0066CC' },
  { id: 'sp2_10', name: 'Обводный канал', line: '2', lineColor: '#0066CC' },

  // Линия 3 - Зелёная
  { id: 'sp3_1', name: 'Озерки', line: '3', lineColor: '#00A651' },
  { id: 'sp3_2', name: 'Удельная', line: '3', lineColor: '#00A651' },
  { id: 'sp3_3', name: 'Проспект Просвещения', line: '3', lineColor: '#00A651' },
  { id: 'sp3_4', name: 'Лесная', line: '3', lineColor: '#00A651' },
  { id: 'sp3_5', name: 'Выборгская', line: '3', lineColor: '#00A651' },
  { id: 'sp3_6', name: 'Площадь Ленина', line: '3', lineColor: '#00A651' },
  { id: 'sp3_7', name: 'Чёрная речка', line: '3', lineColor: '#00A651' },
  { id: 'sp3_8', name: 'Петроградская', line: '3', lineColor: '#00A651' },
  { id: 'sp3_9', name: 'Горьковская', line: '3', lineColor: '#00A651' },
  { id: 'sp3_10', name: 'Невский проспект', line: '3', lineColor: '#00A651' },

  // Линия 4 - Коричневая
  { id: 'sp4_1', name: 'Звенигородская', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_2', name: 'Площадь Восстания', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_3', name: 'Маяковская', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_4', name: 'Невский проспект', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_5', name: 'Гостиный двор', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_6', name: 'Садовая', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_7', name: 'Технологический институт', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_8', name: 'Фрунзенская', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_9', name: 'Парк Победы', line: '4', lineColor: '#8B4513' },
  { id: 'sp4_10', name: 'Обводный канал', line: '4', lineColor: '#8B4513' },

  // Линия 5 - Фиолетовая
  { id: 'sp5_1', name: 'Комендантский аэродром', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_2', name: 'Старая деревня', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_3', name: 'Крестовский остров', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_4', name: 'Петроградская', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_5', name: 'Горьковская', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_6', name: 'Чёрная речка', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_7', name: 'Невский проспект', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_8', name: 'Маяковская', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_9', name: 'Пушкинская', line: '5', lineColor: '#8B1A8B' },
  { id: 'sp5_10', name: 'Садовая', line: '5', lineColor: '#8B1A8B' },
];

export const metroSPbByLine = metroSPb.reduce((acc, station) => {
  if (!acc[station.line]) {
    acc[station.line] = { line: station.line, lineColor: station.lineColor, stations: [] };
  }
  acc[station.line].stations.push(station);
  return acc;
}, {} as Record<string, { line: string; lineColor: string; stations: MetroStation[] }>);
