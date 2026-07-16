# 🔄 Git Workflow для проекта ПроПункт

Инструкция как работать с гитом правильно: push в свою ветку, pull из main.

---

## 📋 Основной цикл

### **1. Начало дня — получить свежий код**

```bash
# Убедиться что находишься на своей feature ветке
git branch
# Должен видеть: * aleksey/название-ветки

# Получить обновления из main
git pull origin main

# Или если конфликты:
git fetch origin main
git merge origin/main
# Решить конфликты, потом commit
```

---

### **2. Работа на ветке**

```bash
# Создать новую ветку для фичи (если нужна)
git checkout -b aleksey/новая-фича

# Работать как обычно
# Редактировать файлы...
# Тестировать...

# Когда готово — коммитить
git add .
git commit -m "Описание изменений"
```

---

### **3. Пуш в свою ветку**

```bash
# ⭐ ВАЖНО: пушим ТОЛЬКО в свою ветку, не в main!
git push origin aleksey/название-ветки

# Или если это первый пуш:
git push -u origin aleksey/название-ветки
```

---

### **4. Создание PR (на GitHub)**

1. Заходишь на https://github.com/nlmmdv/jobpunktbot
2. Нажимаешь "Compare & Pull Request" (GitHub подскажет)
3. Заполняешь описание PR
4. Нажимаешь "Create Pull Request"

---

### **5. После merge PR в main**

```bash
# Получить обновления из main
git pull origin main

# Или для чистоты:
git fetch origin main
git merge origin/main

# Теперь твоя ветка актуальна!
```

---

## 🛠️ Если нужна новая ветка

```bash
# 1. Убедиться что находишься на main
git checkout main
git pull origin main

# 2. Создать новую ветку ОТ main
git checkout -b aleksey/описание-ветки

# 3. Работать и пушить в ветку
git add .
git commit -m "..."
git push -u origin aleksey/описание-ветки
```

---

## ⚠️ ЧТО НЕ ДЕЛАТЬ

```bash
# ❌ НЕПРАВИЛЬНО: пушить в main
git push origin main

# ❌ НЕПРАВИЛЬНО: коммитить без ветки
git commit -m "..." && git push  # БЕЗ указания ветки

# ❌ НЕПРАВИЛЬНО: забыть про pull
# Если забыл pull перед работой — может быть конфликт

# ✅ ПРАВИЛЬНО: всегда пушить с названием ветки
git push origin aleksey/название

# ✅ ПРАВИЛЬНО: всегда пулить перед началом дня
git pull origin main
```

---

## 🔧 Быстрые команды

### Скопировать и запустить:

```bash
# Начало дня
git checkout aleksey/текущая-ветка && git pull origin main

# Конец дня (push)
git add . && git commit -m "Описание" && git push origin aleksey/текущая-ветка

# Проверить статус
git status
git log --oneline -3

# Посмотреть ветки
git branch -a
```

---

## 📊 Схема работы

```
GitHub main (основной код)
    ↑
    │ git pull origin main
    │ (когда нужны обновления)
    │
Твоя feature ветка aleksey/название
    ↑
    │ git push origin aleksey/название
    │ (пушишь свой код)
    │
Твой компьютер (локальные файлы)
```

---

## 💡 Примеры

### Пример 1: Добавить новую фичу

```bash
# 1. Начало дня
git pull origin main

# 2. Создать ветку
git checkout -b aleksey/add-applications

# 3. Работать
# Редактируешь файлы, тестируешь...

# 4. Коммитить
git add src/
git commit -m "Feat: add applications system"

# 5. Пушить
git push origin aleksey/add-applications

# 6. На GitHub создать PR
# → merge → done!

# 7. Получить обновления
git pull origin main
```

### Пример 2: Исправить баг на существующей ветке

```bash
# 1. Убедиться что на правильной ветке
git checkout aleksey/telegram-bot-funnel

# 2. Получить свежий код
git pull origin main

# 3. Исправить баг
# Редактируешь файл...

# 4. Коммитить
git add .
git commit -m "Fix: telegram message encoding"

# 5. Пушить
git push origin aleksey/telegram-bot-funnel
```

---

## 🚨 Если что-то пошло не так

### Конфликты при merge

```bash
# 1. Git скажет где конфликт (файлы будут отмечены)

# 2. Открыть файл и исправить:
<<<<<<< HEAD
твой код из main
=======
твой код из ветки
>>>>>>> aleksey/название

# 3. Выбрать нужный вариант или оба

# 4. Коммитить merge
git add .
git commit -m "Merge main into aleksey/..."
```

### Случайно закоммитил в main

```bash
# 1. Отменить коммит
git reset --soft HEAD~1

# 2. Создать ветку
git checkout -b aleksey/восстановить

# 3. Коммитить в ветку
git commit -m "Восстановленные изменения"
git push origin aleksey/восстановить
```

---

## 📝 Чек-лист перед пушем

- [ ] Находишься на своей feature ветке (`git branch`)
- [ ] Коммит имеет описательное имя
- [ ] Код протестирован
- [ ] Нет `console.log` и дебаг кода
- [ ] Не коммитишь `.env` или секреты
- [ ] Pull был перед тем как начать работу

---

**Вопросы?** Спроси меня! 🚀
