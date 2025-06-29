
interface NotificationBadgeProps {
  count: number;
  children: React.ReactNode;
}

export const NotificationBadge = ({ count, children }: NotificationBadgeProps) => {
  return (
    <div className="relative">
      {children}
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
};
