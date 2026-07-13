export interface MetroStation {
  id: string;
  name: string;
  line: string;
  lineColor: string;
}

export const metroMoscow: MetroStation[] = [
  // Линия 1 - Красная
  { id: 'm1_1', name: 'Охотный ряд', line: '1', lineColor: '#E4273C' },
  { id: 'm1_2', name: 'Театральная', line: '1', lineColor: '#E4273C' },
  { id: 'm1_3', name: 'Площадь Революции', line: '1', lineColor: '#E4273C' },
  { id: 'm1_4', name: 'Комсомольская', line: '1', lineColor: '#E4273C' },
  { id: 'm1_5', name: 'Красные ворота', line: '1', lineColor: '#E4273C' },
  { id: 'm1_6', name: 'Чистые пруды', line: '1', lineColor: '#E4273C' },
  { id: 'm1_7', name: 'Лубянка', line: '1', lineColor: '#E4273C' },
  { id: 'm1_8', name: 'Кокошкино', line: '1', lineColor: '#E4273C' },
  { id: 'm1_9', name: 'Красносельская', line: '1', lineColor: '#E4273C' },
  { id: 'm1_10', name: 'Комсомольская', line: '1', lineColor: '#E4273C' },

  // Линия 2 - Синяя
  { id: 'm2_1', name: 'Беларусская', line: '2', lineColor: '#0066CC' },
  { id: 'm2_2', name: 'Динамо', line: '2', lineColor: '#0066CC' },
  { id: 'm2_3', name: 'Аэропорт', line: '2', lineColor: '#0066CC' },
  { id: 'm2_4', name: 'Маяковская', line: '2', lineColor: '#0066CC' },
  { id: 'm2_5', name: 'Белорусская', line: '2', lineColor: '#0066CC' },
  { id: 'm2_6', name: 'Тверская', line: '2', lineColor: '#0066CC' },
  { id: 'm2_7', name: 'Боровицкая', line: '2', lineColor: '#0066CC' },
  { id: 'm2_8', name: 'Библиотека имени Ленина', line: '2', lineColor: '#0066CC' },
  { id: 'm2_9', name: 'Боровская', line: '2', lineColor: '#0066CC' },
  { id: 'm2_10', name: 'Арбатская', line: '2', lineColor: '#0066CC' },

  // Линия 3 - Зелёная
  { id: 'm3_1', name: 'Выставочная', line: '3', lineColor: '#00A651' },
  { id: 'm3_2', name: 'Киевская', line: '3', lineColor: '#00A651' },
  { id: 'm3_3', name: 'Смоленская', line: '3', lineColor: '#00A651' },
  { id: 'm3_4', name: 'Арбатская', line: '3', lineColor: '#00A651' },
  { id: 'm3_5', name: 'Смоленская', line: '3', lineColor: '#00A651' },
  { id: 'm3_6', name: 'Кропоткинская', line: '3', lineColor: '#00A651' },
  { id: 'm3_7', name: 'Библиотека имени Ленина', line: '3', lineColor: '#00A651' },
  { id: 'm3_8', name: 'Боровская', line: '3', lineColor: '#00A651' },
  { id: 'm3_9', name: 'Охотный ряд', line: '3', lineColor: '#00A651' },
  { id: 'm3_10', name: 'Театральная', line: '3', lineColor: '#00A651' },

  // Линия 4 - Коричневая
  { id: 'm4_1', name: 'Завод имени Сталина', line: '4', lineColor: '#8B4513' },
  { id: 'm4_2', name: 'Автозаводская', line: '4', lineColor: '#8B4513' },
  { id: 'm4_3', name: 'Павелецкая', line: '4', lineColor: '#8B4513' },
  { id: 'm4_4', name: 'Новокузнецкая', line: '4', lineColor: '#8B4513' },
  { id: 'm4_5', name: 'Нижегородская', line: '4', lineColor: '#8B4513' },
  { id: 'm4_6', name: 'Комсомольская', line: '4', lineColor: '#8B4513' },
  { id: 'm4_7', name: 'Красные ворота', line: '4', lineColor: '#8B4513' },
  { id: 'm4_8', name: 'Беларусская', line: '4', lineColor: '#8B4513' },
  { id: 'm4_9', name: 'Динамо', line: '4', lineColor: '#8B4513' },
  { id: 'm4_10', name: 'Аэропорт', line: '4', lineColor: '#8B4513' },

  // Линия 5 - Фиолетовая
  { id: 'm5_1', name: 'Парк культуры', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_2', name: 'Кропоткинская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_3', name: 'Боровская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_4', name: 'Арбатская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_5', name: 'Смоленская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_6', name: 'Киевская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_7', name: 'Краснопресненская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_8', name: 'Белорусская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_9', name: 'Маяковская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm5_10', name: 'Тверская', line: '5', lineColor: '#8B1A8B' },

  // Линия 6 - Оранжевая
  { id: 'm6_1', name: 'Беговая', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_2', name: 'Динамо', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_3', name: 'Аэропорт', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_4', name: 'Маяковская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_5', name: 'Белорусская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_6', name: 'Тверская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_7', name: 'Боровская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_8', name: 'Арбатская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_9', name: 'Смоленская', line: '6', lineColor: '#FF8C00' },
  { id: 'm6_10', name: 'Киевская', line: '6', lineColor: '#FF8C00' },

  // Линия 7 - Голубая
  { id: 'm7_1', name: 'Охотный ряд', line: '7', lineColor: '#0099CC' },
  { id: 'm7_2', name: 'Театральная', line: '7', lineColor: '#0099CC' },
  { id: 'm7_3', name: 'Площадь Революции', line: '7', lineColor: '#0099CC' },
  { id: 'm7_4', name: 'Комсомольская', line: '7', lineColor: '#0099CC' },
  { id: 'm7_5', name: 'Красные ворота', line: '7', lineColor: '#0099CC' },
  { id: 'm7_6', name: 'Чистые пруды', line: '7', lineColor: '#0099CC' },
  { id: 'm7_7', name: 'Лубянка', line: '7', lineColor: '#0099CC' },
  { id: 'm7_8', name: 'Кокошкино', line: '7', lineColor: '#0099CC' },
  { id: 'm7_9', name: 'Красносельская', line: '7', lineColor: '#0099CC' },
  { id: 'm7_10', name: 'Комсомольская', line: '7', lineColor: '#0099CC' },

  // Добавляем еще станции для основных линий (ограничение для примера)
  { id: 'm1_11', name: 'Таганская', line: '1', lineColor: '#E4273C' },
  { id: 'm2_11', name: 'Сокольники', line: '2', lineColor: '#0066CC' },
  { id: 'm3_11', name: 'Ленинские горы', line: '3', lineColor: '#00A651' },
  { id: 'm4_11', name: 'Авиамоторная', line: '4', lineColor: '#8B4513' },
  { id: 'm5_11', name: 'Комсомольская', line: '5', lineColor: '#8B1A8B' },
  { id: 'm6_11', name: 'Проспект Мира', line: '6', lineColor: '#FF8C00' },
  { id: 'm7_11', name: 'Улица 1905 года', line: '7', lineColor: '#0099CC' },
];

export const metroMoscowByLine = metroMoscow.reduce((acc, station) => {
  if (!acc[station.line]) {
    acc[station.line] = { line: station.line, lineColor: station.lineColor, stations: [] };
  }
  acc[station.line].stations.push(station);
  return acc;
}, {} as Record<string, { line: string; lineColor: string; stations: MetroStation[] }>);
