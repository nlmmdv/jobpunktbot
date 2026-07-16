export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  isClosingConfirmationEnabled: boolean;
  headerColor: string;
  bottomBarColor: string;
  backgroundColor: string;
  themeParams: Record<string, string>;
  isVerticalSwipesEnabled: boolean;
  isMainButtonShown: boolean;
  MainButton: TelegramMainButton;
  BackButton: TelegramBackButton;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  offEvent: (eventType: string, callback: () => void) => void;
  sendData: (data: string) => void;
  requestWriteAccess: () => void;
  requestContactAccess: () => void;
  invokeCustomMethod: (method: string, params: Record<string, unknown>) => void;
  showPopup: (params: TelegramPopupParams) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (ok: boolean) => void) => void;
  showScanQrPopup: (params: TelegramScanQrParams, callback?: (data: string) => void) => void;
  closeScanQrPopup: () => void;
  readTextFromClipboard: (callback?: (text: string) => void) => void;
  requestPhone: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  openInvoice: (url: string, callback?: (status: string) => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setBottomBarColor: (color: string) => void;
}

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: Record<string, unknown>) => void;
}

export interface TelegramBackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface TelegramPopupParams {
  title?: string;
  message: string;
  buttons?: Array<{
    id?: string;
    text: string;
    type?: "default" | "ok" | "close" | "cancel" | "destructive";
  }>;
}

export interface TelegramScanQrParams {
  text?: string;
}

export interface BotEventPayload {
  type:
    | "application_approved"
    | "application_rejected"
    | "rating_changed"
    | "shift_reminder"
    | "new_applicants"
    | "onboarding";
  data: Record<string, unknown>;
}

export interface TelegramMessagePayload {
  telegramId: number;
  message: string;
  parseMode?: "HTML" | "Markdown";
  replyMarkup?: {
    inline_keyboard?: Array<Array<{ text: string; url?: string; callback_data?: string }>>;
  };
}
