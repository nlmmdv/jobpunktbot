export type MenuVariant = 'freelancer' | 'owner';

const TILE_CLASSES: Record<MenuVariant, string> = {
  freelancer: 'bg-card border border-border-light',
  owner: 'bg-card-owner border border-border-light-owner',
};

export const MenuCard = ({ icon, label, onClick, variant }: {
  icon: string;
  label: string;
  onClick: () => void;
  variant: MenuVariant;
}) => (
  <button
    onClick={onClick}
    className={`aspect-square rounded-menu shadow-card hover:shadow-lg transition-shadow flex flex-col items-center justify-center gap-3 active:opacity-80 ${TILE_CLASSES[variant]}`}
  >
    <span className="text-4xl">{icon}</span>
    <span className="text-sm font-medium text-text-primary text-center px-2">{label}</span>
  </button>
);

export interface MenuItem<Screen extends string> {
  screen: Screen;
  icon: string;
  label: string;
  fullWidth?: boolean;
}

export function MainMenu<Screen extends string>({ profile, items, variant, onSelectScreen }: {
  profile: any;
  items: MenuItem<Screen>[];
  variant: MenuVariant;
  onSelectScreen: (screen: Screen) => void;
}) {
  return (
    <div className="min-h-screen bg-white text-text-primary p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">ПроПункт</h1>
        <p className="text-text-hint mt-1">Привет, {profile?.first_name}!</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => {
          const card = (
            <MenuCard
              key={item.screen}
              icon={item.icon}
              label={item.label}
              variant={variant}
              onClick={() => onSelectScreen(item.screen)}
            />
          );
          return item.fullWidth ? (
            <div key={item.screen} className="col-span-2 sm:col-span-1">
              {card}
            </div>
          ) : card;
        })}
      </div>
    </div>
  );
}

const BACK_BUTTON_CLASSES: Record<MenuVariant, string> = {
  freelancer: 'text-accent-freelancer',
  owner: 'text-accent-owner',
};

export const BackButton = ({ onClick, variant }: { onClick: () => void; variant: MenuVariant }) => (
  <button
    onClick={onClick}
    className={`text-sm mb-4 flex items-center gap-1 hover:opacity-70 transition-opacity ${BACK_BUTTON_CLASSES[variant]}`}
  >
    ← Назад
  </button>
);
