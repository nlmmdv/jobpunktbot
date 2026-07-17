import { handleEdgeFunction } from "../_shared/edge-function-utils.ts";

interface NewUser {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  role: string;
  city?: string;
  created_at: string;
}

interface VacancyForReview {
  id: string;
  address: string;
  description: string;
  telegram_id: number;
  first_name?: string;
  created_at: string;
  has_spam?: boolean;
}

interface UserProfile {
  id: string;
  about?: string;
  first_name: string;
  has_spam?: boolean;
}

const SPAM_KEYWORDS = [
  'whatsapp', 'telegram', 'viber', 'signal',
  'http', 'https', '://',
  'контакт', 'звони', 'пиши', 'звонок',
  '+7', '+8', '89', '79',
  'icq', 'skype', 'discord',
];

function checkForSpam(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some(keyword => lower.includes(keyword));
}

Deno.serve((req) =>
  handleEdgeFunction(req, async (supabase, telegramId, body) => {
    const { action, limit = 50, offset = 0, vacancyId, userId } = body;

    // Проверка прав доступа (админ или модератор)
    const { data: currentUser } = await supabase
      .from("profiles")
      .select("role")
      .eq("telegram_id", telegramId)
      .single();

    if (!currentUser || !['admin', 'moderator'].includes(currentUser.role)) {
      throw new Error("Access denied");
    }

    // 1. Новые пользователи за последние 24 часа
    if (action === "new_users") {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: newUsers, error } = await supabase
        .from("profiles")
        .select("id, telegram_id, first_name, last_name, role, city, created_at")
        .gt("created_at", yesterday)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Проверить "О себе" на спам в freelancer_resumes
      const usersWithResumes = await Promise.all(
        (newUsers || []).map(async (user) => {
          const { data: resume } = await supabase
            .from("freelancer_resumes")
            .select("about")
            .eq("telegram_id", user.telegram_id)
            .single();

          return {
            ...user,
            has_spam: checkForSpam(resume?.about),
            about: resume?.about,
          };
        })
      );

      return { users: usersWithResumes };
    }

    // 2. Вакансии на модерацию (последние 50)
    if (action === "vacancies_for_review") {
      const { data: vacancies, error } = await supabase
        .from("owner_vacancies")
        .select(`
          id,
          address,
          description,
          telegram_id,
          created_at,
          profiles:telegram_id (first_name)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Проверить на спам
      const vacanciesWithSpam = (vacancies || []).map((v: any) => ({
        id: v.id,
        address: v.address,
        description: v.description,
        telegram_id: v.telegram_id,
        first_name: v.profiles?.first_name,
        created_at: v.created_at,
        has_spam: checkForSpam(v.description),
      }));

      return { vacancies: vacanciesWithSpam };
    }

    // 3. Блокировать пользователя
    if (action === "ban_user") {
      if (!userId) throw new Error("userId required");

      const { error } = await supabase
        .from("profiles")
        .update({ status: "banned" })
        .eq("telegram_id", userId);

      if (error) throw error;
      return { success: true, message: "User banned" };
    }

    // 4. Удалить вакансию
    if (action === "delete_vacancy") {
      if (!vacancyId) throw new Error("vacancyId required");

      const { error } = await supabase
        .from("owner_vacancies")
        .update({ status: "deleted" })
        .eq("id", vacancyId);

      if (error) throw error;
      return { success: true, message: "Vacancy deleted" };
    }

    // 5. Одобрить вакансию (добавить в whitelist)
    if (action === "approve_vacancy") {
      if (!vacancyId) throw new Error("vacancyId required");

      const { error } = await supabase
        .from("owner_vacancies")
        .update({ status: "approved" })
        .eq("id", vacancyId);

      if (error) throw error;
      return { success: true, message: "Vacancy approved" };
    }

    // 6. Статистика
    if (action === "stats") {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Новых пользователей сегодня
      const { count: newUsersToday } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      // Новых вакансий сегодня
      const { count: newVacancies } = await supabase
        .from("owner_vacancies")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      // Отклики за неделю
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString();

      const { count: recentMatches } = await supabase
        .from("job_matches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      // Вакансии с возможным спамом
      const { data: spamVacancies, error: spamError } = await supabase
        .from("owner_vacancies")
        .select("description")
        .eq("status", "active");

      const spamCount = (spamVacancies || []).filter((v) =>
        checkForSpam(v.description)
      ).length;

      return {
        stats: {
          new_users_today: newUsersToday || 0,
          new_vacancies_today: newVacancies || 0,
          matches_this_week: recentMatches || 0,
          suspicious_vacancies: spamCount,
        },
      };
    }

    throw new Error("Unknown action");
  })
);
